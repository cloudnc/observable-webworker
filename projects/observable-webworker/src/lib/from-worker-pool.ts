import { EMPTY, Observable, of, Subject } from 'rxjs';
import { finalize, mergeMap } from 'rxjs/operators';
import { fromWorker } from './from-worker';

export function fromWorkerPool<I, O>(
  workerConstructor: (index: number) => Worker,
  workUnitIterator: IterableIterator<I> | Array<I>,
  selectTransferables?: (input: I) => Transferable[],
  workerCount: number = navigator.hardwareConcurrency - 1,
): Observable<O> {
  const iterator = Array.isArray(workUnitIterator) ? workUnitIterator[Symbol.iterator]() : workUnitIterator;

  return new Observable<O>(resultObserver => {
    const idleWorker$$: Subject<() => Worker> = new Subject();

    let completed = 0;
    let sent = 0;
    let finished = false;

    const lazyWorkers: (() => Worker)[] = Array.from({ length: workerCount }).map((_, i) => {
      let worker: Worker;

      return () => {
        if (!worker) {
          worker = workerConstructor(i);
        }
        return worker;
      };
    });

    const processor$ = idleWorker$$.pipe(
      mergeMap(
        (worker): Observable<O> => {
          const next = iterator.next();

          if (next.done) {
            idleWorker$$.complete();
            finished = true;
            return EMPTY;
          }

          sent++;
          const unitWork: I = next.value;

          return fromWorker<I, O>(() => worker(), of(unitWork), selectTransferables, {
            terminateOnComplete: false,
          }).pipe(
            finalize(() => {
              completed++;

              if (!idleWorker$$.closed) {
                idleWorker$$.next(worker);
              }

              if (finished) {
                worker().terminate();
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
