import { fromEvent, Notification, Observable } from 'rxjs';
import { dematerialize, map, materialize } from 'rxjs/operators';
import { GenericWorkerMessage, WorkerMessageNotification } from './observable-webworker.types';

export interface DoWork<I, O> {
  work(input$: Observable<GenericWorkerMessage<I>>): Observable<GenericWorkerMessage<O>>;
}

type ObservableWorkerConstructor<I = any, O = any> = new(...args) => DoWork<I, O>;

export function ObservableWorker() {
  return <I, O>(workerConstructor: ObservableWorkerConstructor<I, O>): void => {

    const input$ = fromEvent(self, 'message')
      .pipe(
        map((e: WorkerMessageNotification<I>): Notification<GenericWorkerMessage<I>> => e.data),
        map((n: Notification<GenericWorkerMessage<I>>): Notification<GenericWorkerMessage<I>> => new Notification(n.kind, n.value, n.error)),
        dematerialize(),
      );

    new workerConstructor().work(input$).pipe(
      materialize(),
    )
      .subscribe((notification: Notification<GenericWorkerMessage<O>>) => {
        postMessage(notification, notification.hasValue ? notification.value.transferables : undefined);
      });

  };
}
