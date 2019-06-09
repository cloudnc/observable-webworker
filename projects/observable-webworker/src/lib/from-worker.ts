import { Observable, Observer, Subscription, Notification } from 'rxjs';
import { dematerialize, map, materialize, tap } from 'rxjs/operators';
import { GenericWorkerMessage, WorkerMessageNotification } from './observable-worker.types';

export function fromWorker<Input, Output>(
  workerFactory: () => Worker,
  input$: Observable<GenericWorkerMessage<Input>>,
): Observable<GenericWorkerMessage<Output>> {
  return new Observable((responseObserver: Observer<Notification<GenericWorkerMessage<Output>>>) => {
    let worker: Worker;
    let subscription: Subscription;

    try {
      worker = workerFactory();
      worker.onmessage = (ev: WorkerMessageNotification<Output>) => responseObserver.next(ev.data);
      worker.onerror = (ev: ErrorEvent) => responseObserver.error(ev);

      subscription = input$
        .pipe(
          materialize(),
          tap(input => worker.postMessage(input)),
        )
        .subscribe();
    } catch (error) {
      responseObserver.error(error);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (worker) {
        worker.terminate();
      }
    };
  }).pipe(
    map(({ kind, value, error }) => new Notification(kind, value, error)),
    dematerialize(),
  );
}
