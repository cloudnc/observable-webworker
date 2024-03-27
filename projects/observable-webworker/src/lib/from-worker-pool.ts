import { concat, NEVER, Observable, ObservableInput, of, Subject, zip } from 'rxjs';
import { finalize, map, mergeAll, tap } from 'rxjs/operators';
import { fromWorker } from './from-worker';

interface LazyWorker {
  factory: () => Worker;
  terminate: () => void;
  processing: boolean;
  index: number;
}

export interface WorkerPoolOptions<I, O> {
  workerCount?: number;
  fallbackWorkerCount?: number;
  flattenOperator?: (input$: Observable<Observable<O>>) => Observable<O>;
  selectTransferables?: (input: I) => Transferable[];
}

export function fromWorkerPool<I, O>(
  workerConstructor: (index: number) => Worker,
  workUnitIterator: ObservableInput<I>,
  options?: WorkerPoolOptions<I, O>,
): Observable<O> {
  const {
    // eslint-disable-next-line no-undef-init
    selectTransferables = undefined,
    workerCount = navigator.hardwareConcurrency ? navigator.hardwareConcurrency - 1 : null,
    fallbackWorkerCount = 3,
    flattenOperator = mergeAll<O>(),
  } = options || {};

  return new Observable<O>(resultObserver => {
    const idleWorker$$: Subject<LazyWorker> = new Subject();

    let completed = 0;
    let sent = 0;
    let finished = false;

    const lazyWorkers: LazyWorker[] = Array.from({
      length: workerCount !== null ? workerCount : fallbackWorkerCount,
    }).map((_, index) => {
      let cachedWorker: Worker | null = null;
      return {
        factory() {
          if (!cachedWorker) {
            cachedWorker = workerConstructor(index);
          }
          return cachedWorker;
        },
        terminate() {
          if (!this.processing && cachedWorker) {
            cachedWorker.terminate();
          }
        },
        processing: false,
        index,
      };
    });

    const processor$ = zip(idleWorker$$, workUnitIterator).pipe(
      tap(([worker]) => {
        sent++;
        worker.processing = true;
      }),
      finalize(() => {
        idleWorker$$.complete();
        finished = true;
        lazyWorkers.forEach(worker => worker.terminate());
      }),
      map(
        ([worker, unitWork]): Observable<O> => {
          // input should not complete to ensure the worker doesn't send back completion notifications when work unit is
          // processed, otherwise these would cause the fromWorker to unsubscribe from the result.
          const input$ = concat(of(unitWork), NEVER);
          // const input$ = of(unitWork);
          return fromWorker<I, O>(() => worker.factory(), input$, selectTransferables, {
            terminateOnComplete: false,
          }).pipe(
            finalize(() => {
              completed++;

              worker.processing = false;

              if (!finished) {
                idleWorker$$.next(worker);
              } else {
                worker.terminate();
              }

              if (finished && completed === sent) {
                resultObserver.complete();
              }
            }),
          );
        },
      ),
      flattenOperator,
    );

    const sub = processor$.subscribe(resultObserver);

    lazyWorkers.forEach(w => idleWorker$$.next(w));

    return () => sub.unsubscribe();
  });
}
