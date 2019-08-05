import { Component } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { groupBy, map, mergeMap, pairwise, scan, startWith, switchMap, tap } from 'rxjs/operators';
import { fromWorkerPool } from '../../../projects/observable-webworker/src/lib/from-worker-pool';
import { ShaWorkerMessage, Thread } from '../sha-worker.types';

@Component({
  selector: 'app-multiple-worker-pool',
  templateUrl: './multiple-worker-pool.component.html',
  styleUrls: ['./multiple-worker-pool.component.scss'],
})
export class MultipleWorkerPoolComponent {
  public multiFilesToHash: Subject<File[]> = new Subject();
  public workResult$ = this.multiFilesToHash.pipe(switchMap(files => this.hashMultipleFiles(files)));

  public filenames$ = this.multiFilesToHash.pipe(map(files => files.map(f => f.name)));

  public eventsPool$: Subject<ShaWorkerMessage> = new Subject();
  public eventListPool$: Observable<ShaWorkerMessage[]> = this.eventsPool$.pipe(
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
    scan<ShaWorkerMessage>((list, event) => {
      list.push(event);
      return list;
    }, []),
  );

  private *workPool(files: File[]): IterableIterator<File> {
    for (const file of files) {
      yield file;
      this.eventsPool$.next(this.logMessage(`file picked up for processing`, file.name));
      console.log(`file picked up for processing`, file.name);
    }
  }

  public hashMultipleFiles(files: File[]): Observable<ShaWorkerMessage> {
    return fromWorkerPool<Blob, ShaWorkerMessage>(index => {
      const worker = new Worker('../secure-hash-algorithm.worker', { name: `sha-worker-${index}`, type: 'module' });
      this.eventsPool$.next(this.logMessage(`worker ${index} created`));
      return worker;
    }, this.workPool(files)).pipe(
      tap(res => {
        this.eventsPool$.next(res);
      }),
    );
  }

  public calculateSha256Multiple($event): void {
    const files: File[] = Array.from($event.target.files);
    for (const file of files) {
      this.eventsPool$.next(this.logMessage('file selected', file.name));
    }
    this.multiFilesToHash.next(files);
  }

  private logMessage(message: string, file?: string): ShaWorkerMessage {
    return { message, file, timestamp: new Date(), thread: Thread.MAIN };
  }
}
