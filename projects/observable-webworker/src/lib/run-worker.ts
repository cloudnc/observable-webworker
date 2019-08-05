import { fromEvent, Notification, Observable } from 'rxjs';
import { NotificationKind } from 'rxjs/internal/Notification';
import { concatMap, dematerialize, filter, finalize, map, materialize, tap } from 'rxjs/operators';
import {
  DoTransferableWork,
  DoWork,
  DoWorkUnit,
  GenericWorkerMessage,
  WorkerMessageNotification,
} from './observable-worker.types';

export type ObservableWorkerConstructor<I = any, O = any> = new (...args) => DoWork<I, O> | DoWorkUnit<I, O>;

/** @internal */
export type WorkerPostMessageNotification<T> = (
  message: Notification<GenericWorkerMessage<T>>,
  tranferables?: Transferable[],
) => void;

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
export function processWork<I, O>(
  obs$: Observable<O>,
  worker: DoWork<I, O> | DoWorkUnit<I, O>,
): Observable<Notification<GenericWorkerMessage<O>>> {
  return obs$.pipe(
    map(payload => {
      const message: GenericWorkerMessage<O> = { payload };

      if (workerIsTransferableType(worker)) {
        message.transferables = worker.selectTransferables(payload);
      }

      return message;
    }),
    materialize(),
  );
}

export function runWorker<I, O>(workerConstructor: ObservableWorkerConstructor<I, O>) {
  const input$ = fromEvent(self, 'message').pipe(
    map((e: WorkerMessageNotification<I>): Notification<GenericWorkerMessage<I>> => e.data),
    map((n: Notification<GenericWorkerMessage<I>>) => new Notification(n.kind, n.value, n.error)),
    // ignore complete, the calling thread will manage termination of the stream
    filter(n => n.kind !== NotificationKind.COMPLETE),
    dematerialize(),
    map(i => i.payload),
  );

  const worker = new workerConstructor();

  const outputStream$ = workerIsUnitType(worker)
    ? input$.pipe(concatMap(input => processWork(worker.workUnit(input), worker)))
    : processWork(worker.work(input$), worker);

  outputStream$.subscribe((notification: Notification<GenericWorkerMessage<O>>) => {
    const transferables = notification.hasValue ? notification.value.transferables : undefined;
    // type to workaround typescript trying to compile as non-webworker context
    ((postMessage as unknown) as WorkerPostMessageNotification<O>)(notification, transferables);
  });
}
