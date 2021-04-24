import { Notification, Observable, Observer, Subscription } from 'rxjs';
import { dematerialize, map, materialize, tap } from 'rxjs/operators';
import { WorkerMessageNotification } from './observable-worker.types';

export interface WorkerOptions {
  terminateOnComplete: boolean;
}

export function fromWorker<Input, Output>(
  workerFactory: () => Worker,
  input$: Observable<Input>,
  selectTransferables?: (input: Input) => Transferable[],
  options: WorkerOptions = { terminateOnComplete: true },
): Observable<Output> {
  return new Observable((responseObserver: Observer<Notification<Output>>) => {
    let worker: Worker;
    let subscription: Subscription;

    try {
      worker = workerFactory();
      worker.onmessage = (ev: WorkerMessageNotification<Output>) => responseObserver.next(ev.data);
      worker.onerror = (ev: ErrorEvent) => responseObserver.error(ev);

      subscription = input$
        .pipe(
          materialize(),
          tap(input => {
            if (selectTransferables && input.hasValue) {
              const transferables = selectTransferables(input.value as Input);
              worker.postMessage(input, transferables);
            } else {
              worker.postMessage(input);
            }
          }),
        )
        .subscribe();
    } catch (error) {
      responseObserver.error(error);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (worker && options.terminateOnComplete) {
        worker.terminate();
      }
    };
  }).pipe(
    map(({ kind, value, error }) => new Notification(kind, value, error)),
    dematerialize(),
  );
}
