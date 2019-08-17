import { Component, ElementRef, ViewChild } from '@angular/core';
import {
  animationFrameScheduler,
  asyncScheduler,
  combineLatest,
  interval,
  Observable,
  ReplaySubject,
  Subject,
} from 'rxjs';
import {
  filter,
  groupBy,
  map,
  mergeMap,
  observeOn,
  pairwise,
  scan,
  shareReplay,
  startWith,
  switchMap,
  switchMapTo,
  take,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { fromWorkerPool } from '../../../projects/observable-webworker/src/lib/from-worker-pool';
import { GoogleChartsService } from '../google-charts.service';
import { FileHashEvent, HashWorkerMessage, Thread } from '../hash-worker.types';
import TimelineOptions = google.visualization.TimelineOptions;

@Component({
  selector: 'app-multiple-worker-pool',
  templateUrl: './multiple-worker-pool.component.html',
  styleUrls: ['./multiple-worker-pool.component.scss'],
})
export class MultipleWorkerPoolComponent {
  @ViewChild('timeline', { static: false, read: ElementRef }) private timelineComponent: ElementRef;

  public multiFilesToHash: Subject<File[]> = new ReplaySubject(1);
  public workResult$ = this.multiFilesToHash.pipe(
    observeOn(asyncScheduler),
    switchMap(files => this.hashMultipleFiles(files)),
  );

  private filenames: string[];
  public filenames$ = this.multiFilesToHash.pipe(
    map(files => files.map(f => f.name)),
    tap(names => (this.filenames = names)),
    shareReplay(1),
  );

  public eventsPool$: Subject<HashWorkerMessage> = new Subject();

  public completedFiles$: Observable<string[]> = this.filenames$.pipe(
    switchMap(() =>
      this.eventsPool$.pipe(
        groupBy(m => m.file),
        mergeMap(fileMessage$ =>
          fileMessage$.pipe(
            filter(e => e.fileEventType === FileHashEvent.HASH_RECEIVED),
            take(1),
          ),
        ),
        map(message => message.file),
        scan<string>((files, file) => [...files, file], []),
        startWith([]),
      ),
    ),
  );

  public complete$: Observable<boolean> = combineLatest(this.filenames$, this.completedFiles$).pipe(
    map(([files, completedFiles]) => files.length === completedFiles.length),
  );

  public status$: Observable<string> = this.complete$.pipe(
    startWith(null),
    map(isComplete => {
      switch (isComplete) {
        case null:
          return 'Waiting for file selection';
        case true:
          return 'Completed';
        case false:
          return 'Processing files';
      }
    }),
  );

  public eventsTimedPool$: Observable<HashWorkerMessage> = this.eventsPool$.pipe(
    groupBy(m => m.file),
    mergeMap(fileMessage$ => {
      return fileMessage$.pipe(
        startWith(null),
        pairwise(),
        map(([a, b]) => {
          return {
            ...b,
            millisSinceLast: a ? b.timestamp.valueOf() - a.timestamp.valueOf() : null,
          };
        }),
      );
    }),
  );

  public eventListPool$: Observable<HashWorkerMessage[]> = this.eventsTimedPool$.pipe(
    scan<HashWorkerMessage>((list, event) => {
      list.push(event);
      return list;
    }, []),
  );

  public chartObserver$ = combineLatest(this.filenames$, this.googleChartService.getVisualisation('timeline')).pipe(
    switchMap(([filenames, visualization]) => {
      const container = this.timelineComponent.nativeElement;
      const chart = new visualization.Timeline(container);
      const dataTable = new visualization.DataTable();

      dataTable.addColumn({ type: 'string', id: 'file' });
      dataTable.addColumn({ type: 'string', id: 'event' });
      dataTable.addColumn({ type: 'date', id: 'Start' });
      dataTable.addColumn({ type: 'date', id: 'End' });

      const lastRow = new Map();

      const chartOptions: TimelineOptions & { hAxis: any } = {
        height: 0,
        hAxis: {
          minValue: new Date(),
          maxValue: new Date(new Date().valueOf() + 1000 * 20),
        },
      };

      const eventUpdates$ = this.eventsPool$.pipe(
        tap(event => {
          if (event.fileEventType === null) {
            return;
          }

          if (lastRow.has(event.file)) {
            dataTable.setCell(lastRow.get(event.file), 3, event.timestamp);
          }

          if (event.fileEventType === FileHashEvent.HASH_RECEIVED) {
            lastRow.delete(event.file);
            return;
          }

          let durationName: string;
          switch (event.fileEventType) {
            case FileHashEvent.SELECTED:
              durationName = 'Queued, waiting for worker';
              break;
            case FileHashEvent.PICKED_UP:
              durationName = 'Transferring file to worker';
              if (this.filenames.indexOf(event.file) < navigator.hardwareConcurrency - 1) {
                durationName = 'Starting worker, ' + durationName;
              }
              break;
            case FileHashEvent.FILE_RECEIVED:
              durationName = 'Reading file';
              break;
            case FileHashEvent.FILE_READ:
              durationName = 'Computing hash';
              break;
            case FileHashEvent.HASH_COMPUTED:
              durationName = 'Returning hash result to main thread';
              break;
          }

          const row = dataTable.addRow([event.file, durationName, event.timestamp, event.timestamp]);
          lastRow.set(event.file, row);

          chartOptions.height = filenames.length * 41 + 50;

          chart.draw(dataTable, chartOptions);
        }),
      );

      const realtimeUpdater$ = interval(0, animationFrameScheduler).pipe(
        tap(() => {
          const rowsToUpdate = Array.from(lastRow.values());

          for (const row of rowsToUpdate) {
            dataTable.setCell(row, 3, new Date());
          }

          if (rowsToUpdate.length) {
            const currentDateTime = new Date().valueOf();
            if (currentDateTime > chartOptions.hAxis.maxValue.valueOf() - 1000 * 2) {
              chartOptions.hAxis.maxValue = new Date(currentDateTime + 1000 * 20);
            }

            chart.draw(dataTable, chartOptions);
          }
        }),
      );

      return eventUpdates$.pipe(
        switchMapTo(realtimeUpdater$),
        takeUntil(
          this.complete$.pipe(
            filter(c => c),
            take(1),
          ),
        ),
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

  public hashMultipleFiles(files: File[]): Observable<HashWorkerMessage> {
    const queue: IterableIterator<File> = this.workPool(files);

    return fromWorkerPool<Blob, HashWorkerMessage>(index => {
      const worker = new Worker('../file-hash.worker', { name: `hash-worker-${index}`, type: 'module' });
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

  public calculateMD5Multiple($event): void {
    const files: File[] = Array.from($event.target.files);
    this.multiFilesToHash.next(files);
    for (const file of files) {
      this.eventsPool$.next(this.logMessage(FileHashEvent.SELECTED, 'file selected', file.name));
    }
  }

  private logMessage(eventType: FileHashEvent | null, message: string, file?: string): HashWorkerMessage {
    return { message, file, timestamp: new Date(), thread: Thread.MAIN, fileEventType: eventType };
  }
}
