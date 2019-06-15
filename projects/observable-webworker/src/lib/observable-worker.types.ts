import { Notification, Observable } from 'rxjs';

export interface GenericWorkerMessage<P = any> {
  payload: P;
  transferables?: Transferable[];
}

export interface WorkerMessageNotification<T> extends MessageEvent {
  data: Notification<GenericWorkerMessage<T>>;
}

export interface DoWork<I, O> {
  work(input$: Observable<I>): Observable<O>;
}

export interface DoTransferableWork<I, O> {
  transferableWork(input$: Observable<GenericWorkerMessage<I>>): Observable<GenericWorkerMessage<O>>;
}
