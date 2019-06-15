import { fromEvent, Notification, Observable } from 'rxjs';
import { dematerialize, map, materialize } from 'rxjs/operators';
import { DoTransferableWork, DoWork, GenericWorkerMessage, WorkerMessageNotification } from './observable-worker.types';

export type ObservableWorkerConstructor<I = any, O = any> = new (...args) => DoWork<I, O>;
export type ObservableTransferableWorkerConstructor<I = any, O = any> = new (...args) => DoTransferableWork<I, O>;

export type WorkerPostMessageNotification<T> = (
  message: Notification<GenericWorkerMessage<T>>,
  tranferables?: Transferable[],
) => void;

export function workerIsTransferableType<I, O>(worker: DoWork<I, O> | DoTransferableWork<I, O>): worker is DoTransferableWork<I, O> {
  return worker.hasOwnProperty('transferableWork');
}

export function runWorker<I, O>(workerConstructor: ObservableWorkerConstructor<I, O> | ObservableTransferableWorkerConstructor<I, O>) {
  const input$ = fromEvent(self, 'message').pipe(
    map((e: WorkerMessageNotification<I>): Notification<GenericWorkerMessage<I>> => e.data),
    map((n: Notification<GenericWorkerMessage<I>>) => new Notification(n.kind, n.value, n.error)),
    dematerialize(),
  );

  const worker = new workerConstructor();

  let output$: Observable<GenericWorkerMessage<O>>;
  if (workerIsTransferableType(worker)) {
    output$ = worker.transferableWork(input$)
  } else {
    output$ = worker.work(input$.pipe(map(i => i.payload))).pipe(map(payload => ({payload})));
  }

  output$.pipe(materialize())
    .subscribe((notification: Notification<GenericWorkerMessage<O>>) => {
      const transferables = notification.hasValue ? notification.value.transferables : undefined;
      // type to workaround typescript trying to compile as non-webworker context
      ((postMessage as unknown) as WorkerPostMessageNotification<O>)(notification, transferables);
    });
}
