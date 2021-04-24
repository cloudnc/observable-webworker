import { from, fromEvent, Notification, Observable, Subscription } from 'rxjs';
import { concatMap, dematerialize, filter, map, materialize } from 'rxjs/operators';
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
    map((e: WorkerMessageNotification<I>): Notification<I> => e.data),
    map((n: Notification<I>) => new Notification(n.kind, n.value, n.error)),
    // ignore complete, the calling thread will manage termination of the stream
    filter(n => n.kind !== 'C'),
    dematerialize(),
  );

  return workerIsUnitType(worker)
    ? input$.pipe(concatMap(input => from(worker.workUnit(input)).pipe(materialize())))
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
