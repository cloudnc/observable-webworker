import { Component, ElementRef, ViewChild } from '@angular/core';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { groupBy, map, mergeMap, pairwise, scan, shareReplay, startWith, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { fromWorkerPool } from '../../../projects/observable-webworker/src/lib/from-worker-pool';
import { GoogleChartsService } from '../google-charts.service';
import { FileHashEvent, ShaWorkerMessage, Thread } from '../sha-worker.types';

@Component({
  selector: 'app-multiple-worker-pool',
  templateUrl: './multiple-worker-pool.component.html',
  styleUrls: ['./multiple-worker-pool.component.scss'],
})
export class MultipleWorkerPoolComponent {
  @ViewChild('timeline', { static: false, read: ElementRef }) private timelineComponent: ElementRef;

  public multiFilesToHash: Subject<File[]> = new ReplaySubject(1);
  public workResult$ = this.multiFilesToHash.pipe(switchMap(files => this.hashMultipleFiles(files)));

  private filenames: string[];
  public filenames$ = this.multiFilesToHash.pipe(
    map(files => files.map(f => f.name)),
    tap(names => this.filenames = names),
    shareReplay(1),
  );

  public eventsPool$: Subject<ShaWorkerMessage> = new Subject();
  public eventsTimedPool$: Observable<ShaWorkerMessage> = this.eventsPool$.pipe(
    groupBy(m => m.file),
    mergeMap((fileMessage$) => {
      return fileMessage$.pipe(
        startWith(null),
        pairwise(),
        map(([a, b]) => {
          let durationName: string;

          if (a && b && a.fileEventType !== null && b.fileEventType !== null) {
            switch (a.fileEventType + b.fileEventType) {
              case FileHashEvent.SELECTED + FileHashEvent.PICKED_UP:
                durationName = 'Queued, waiting for worker';
                break;
              case FileHashEvent.PICKED_UP + FileHashEvent.FILE_RECEIVED:
                durationName = 'Transferring file to worker';
                if (this.filenames.indexOf(b.file) < navigator.hardwareConcurrency - 1) {
                  durationName = 'Starting worker, ' + durationName;
                }
                break;
              case FileHashEvent.FILE_RECEIVED + FileHashEvent.FILE_READ:
                durationName = 'Reading file';
                break;
              case FileHashEvent.FILE_READ + FileHashEvent.HASH_COMPUTED:
                durationName = 'Computing hash';
                break;
              case FileHashEvent.HASH_COMPUTED + FileHashEvent.HASH_RECEIVED:
                durationName = 'Returning hash result to main thread';
                break;
            }
          }

          return {
            ...b,
            millisSinceLast: a ? b.timestamp.valueOf() - a.timestamp.valueOf() : null,
            durationName,
          };
        }),
      );
    }),
  );

  public eventListPool$: Observable<ShaWorkerMessage[]> = this.eventsTimedPool$.pipe(
    scan<ShaWorkerMessage>((list, event) => {
      list.push(event);
      return list;
    }, []),
  );

  public chartObserver$ = this.googleChartService.getVisualisation('timeline').pipe(
    switchMap(visualization => {
      const container = this.timelineComponent.nativeElement;
      const chart = new visualization.Timeline(container);
      const dataTable = new visualization.DataTable();

      dataTable.addColumn({ type: 'string', id: 'file' });
      dataTable.addColumn({ type: 'string', id: 'event' });
      dataTable.addColumn({ type: 'date', id: 'Start' });
      dataTable.addColumn({ type: 'date', id: 'End' });

      return this.eventsTimedPool$.pipe(
        tap((event) => {
          if (event.fileEventType === null || !event.durationName) {
            return;
          }

          dataTable.addRow([
            event.file,
            event.durationName,
            new Date(event.timestamp.valueOf() - event.millisSinceLast),
            event.timestamp,
          ]);

          chart.draw(dataTable);
        }),
      );
    }),
  );

  constructor(private googleChartService: GoogleChartsService) {}

  private *workPool(files: File[]): IterableIterator<File> {
    for (const file of files) {
      yield file;
      this.eventsPool$.next(this.logMessage(FileHashEvent.PICKED_UP, `file picked up for processing`, file.name));
    }
  }

  public hashMultipleFiles(files: File[]): Observable<ShaWorkerMessage> {

    const queue: IterableIterator<File> = this.workPool(files)

    return fromWorkerPool<Blob, ShaWorkerMessage>(index => {
      const worker = new Worker('../secure-hash-algorithm.worker', { name: `sha-worker-${index}`, type: 'module' });
      this.eventsPool$.next(this.logMessage(null, `worker ${index} created`));
      return worker;
    }, queue).pipe(
      tap(res => {
        this.eventsPool$.next(res);
        if (res.fileEventType === FileHashEvent.HASH_COMPUTED) {
          this.eventsPool$.next({
            ...res,
            fileEventType: FileHashEvent.HASH_RECEIVED,
            timestamp: new Date(),
            message: 'Hash received',
            thread: Thread.MAIN,
          });
        }
      }),
    );
  }

  public calculateSha256Multiple($event): void {
    const files: File[] = Array.from($event.target.files);
    for (const file of files) {
      this.eventsPool$.next(this.logMessage(FileHashEvent.SELECTED, 'file selected', file.name));
    }
    this.multiFilesToHash.next(files);
  }

  private logMessage(eventType: FileHashEvent | null, message: string, file?: string): ShaWorkerMessage {
    return { message, file, timestamp: new Date(), thread: Thread.MAIN, fileEventType: eventType };
  }
}
