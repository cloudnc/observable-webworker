import { from, fromEvent, Notification, Observable, Subscription } from 'rxjs';
import { concatMap, dematerialize, map, materialize } from 'rxjs/operators';
import { DoTransferableWork, DoWork, DoWorkUnit, WorkerMessageNotification } from './observable-worker.types';

export type ObservableWorkerConstructor<I = any, O = any> = new (...args: any[]) => DoWork<I, O> | DoWorkUnit<I, O>;

/** @internal */
export type WorkerPostMessageNotification<T> = (message: Notification<T>, tranferables?: Transferable[]) => void;

/** @internal */
export function workerIsTransferableType<I, O>(
  worker: DoWork<I, O> | DoWorkUnit<I, O>,
): worker is DoTransferableWork<I, O> {
  return !!worker.selectTransferables;
}

/** @internal */
export function workerIsUnitType<I, O>(worker: DoWork<I, O> | DoWorkUnit<I, O>): worker is DoWorkUnit<I, O> {
  return !!(worker as DoWorkUnit<I, O>).workUnit;
}

/** @internal */
export function getWorkerResult<I, O>(
  worker: DoWork<I, O> | DoWorkUnit<I, O>,
  incomingMessages$: Observable<WorkerMessageNotification<I>>,
): Observable<Notification<O>> {
  const input$ = incomingMessages$.pipe(
    map(
      (e: WorkerMessageNotification<I>): Notification<I> => new Notification(e.data.kind, e.data.value, e.data.error),
    ),
    dematerialize(),
  );

  return workerIsUnitType(worker)
    ? // note we intentionally materialize the inner observable so the main thread can reassemble the multiple stream values per input observable
      input$.pipe(concatMap(input => from(worker.workUnit(input)).pipe(materialize())))
    : worker.work(input$).pipe(materialize());
}

export function runWorker<I, O>(workerConstructor: ObservableWorkerConstructor<I, O>): Subscription {
  const worker = new workerConstructor();

  const incomingMessages$ = fromEvent<WorkerMessageNotification<I>>(self, 'message');

  return getWorkerResult(worker, incomingMessages$).subscribe((notification: Notification<O>) => {
    // type to workaround typescript trying to compile as non-webworker context
    const workerPostMessage = (postMessage as unknown) as WorkerPostMessageNotification<O>;

    if (workerIsTransferableType(worker) && notification.hasValue) {
      workerPostMessage(notification, worker.selectTransferables(notification.value as O));
    } else {
      workerPostMessage(notification);
    }
  });
}
