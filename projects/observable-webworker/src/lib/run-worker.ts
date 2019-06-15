import { fromEvent, Notification } from 'rxjs';
import { dematerialize, map, materialize } from 'rxjs/operators';
import { DoTransferableWork, DoWork, GenericWorkerMessage, WorkerMessageNotification } from './observable-worker.types';

export type ObservableWorkerConstructor<I = any, O = any> = new (...args) => DoWork<I, O>;

/** @internal */
export type WorkerPostMessageNotification<T> = (
  message: Notification<GenericWorkerMessage<T>>,
  tranferables?: Transferable[],
) => void;

/** @internal */
export function workerIsTransferableType<I, O>(worker: DoWork<I, O>): worker is DoTransferableWork<I, O> {
  return !!worker.selectTransferables;
}

export function runWorker<I, O>(workerConstructor: ObservableWorkerConstructor<I, O>) {
  const input$ = fromEvent(self, 'message').pipe(
    map((e: WorkerMessageNotification<I>): Notification<GenericWorkerMessage<I>> => e.data),
    map((n: Notification<GenericWorkerMessage<I>>) => new Notification(n.kind, n.value, n.error)),
    dematerialize(),
    map(i => i.payload),
  );

  const worker = new workerConstructor();

  worker
    .work(input$)
    .pipe(
      map(payload => {
        const message: GenericWorkerMessage<O> = { payload };

        if (workerIsTransferableType(worker)) {
          message.transferables = worker.selectTransferables(payload);
        }

        return message;
      }),
      materialize(),
    )
    .subscribe((notification: Notification<GenericWorkerMessage<O>>) => {
      const transferables = notification.hasValue ? notification.value.transferables : undefined;
      // type to workaround typescript trying to compile as non-webworker context
      ((postMessage as unknown) as WorkerPostMessageNotification<O>)(notification, transferables);
    });
}
