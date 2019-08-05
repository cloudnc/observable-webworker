import { EMPTY, Observable, of, Subject, zip } from 'rxjs';
import { finalize, mergeMap, tap } from 'rxjs/operators';
import { ObservableInput } from 'rxjs/src/internal/types';
import { fromWorker } from './from-worker';

interface LazyWorker {
  factory: () => Worker;
  processing: boolean;
  terminated: boolean;
  started: boolean;
  index: number;
}

export function fromWorkerPool<I, O>(
  workerConstructor: (index: number) => Worker,
  workUnitIterator: ObservableInput<I>,
  selectTransferables?: (input: I) => Transferable[],
  workerCount: number = navigator.hardwareConcurrency - 1,
): Observable<O> {

  return new Observable<O>(resultObserver => {
    const idleWorker$$: Subject<LazyWorker> = new Subject();

    let completed = 0;
    let sent = 0;
    let finished = false;

    const lazyWorkers: LazyWorker[] = Array.from({ length: workerCount }).map((_, index) => {
      let worker: Worker;

      return {
        factory() {
          if (!worker) {
            worker = workerConstructor(index);
            this.started = true;
          }
          return worker;
        },
        processing: false,
        terminated: false,
        started: false,
        index,
      }

    });

    const processor$ = zip(idleWorker$$, workUnitIterator).pipe(
      tap(([worker]) => {
        sent++;
        worker.processing = true;
      }),
      finalize(() => {
        console.log(`now finished`);
        idleWorker$$.complete();
        finished = true;
        lazyWorkers.forEach(worker => {
          if (worker.started && !worker.processing) {
            worker.factory().terminate();
          }
        })
      }),
      mergeMap(
        ([worker, unitWork]): Observable<O> => {

          console.log(`starting work on`, (unitWork as any).name);
          return fromWorker<I, O>(() => worker.factory(), of(unitWork), selectTransferables, {
            terminateOnComplete: false,
          }).pipe(
            finalize(() => {
              completed++;

              console.log(`*`, (unitWork as any).name, {completed, sent, finished});

              worker.processing = false;

              if (!idleWorker$$.closed) {
                idleWorker$$.next(worker);
              }

              if (finished) {
                worker.factory().terminate();
              }

              if (finished && completed === sent) {
                resultObserver.complete();
              }
            }),
          );
        },
      ),
    );

    const sub = processor$.subscribe({
      next: o => resultObserver.next(o),
      error: e => resultObserver.error(e),
    });

    lazyWorkers.forEach(w => idleWorker$$.next(w));

    return () => sub.unsubscribe();
  });
}
