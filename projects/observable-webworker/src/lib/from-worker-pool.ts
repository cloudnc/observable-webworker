import { Observable, ObservableInput, of, Subject, zip } from 'rxjs';
import { finalize, map, mergeAll, tap } from 'rxjs/operators';
import { fromWorker } from './from-worker';

interface LazyWorker {
  factory: () => Worker;
  terminate: () => void;
  processing: boolean;
  started: boolean;
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
    // tslint:disable-next-line:no-unnecessary-initializer
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
      return {
        _cachedWorker: null,
        factory() {
          if (!this._cachedWorker) {
            this._cachedWorker = workerConstructor(index);
            this.started = true;
          }
          return this._cachedWorker;
        },
        terminate() {
          if (this.started && !this.processing) {
            this._cachedWorker.terminate();
          }
        },
        processing: false,
        started: false,
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
          return fromWorker<I, O>(() => worker.factory(), of(unitWork), selectTransferables, {
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
