import { Notification, Observable } from 'rxjs';

/** @internal */
export interface GenericWorkerMessage<P = any> {
  payload: P;
  transferables?: Transferable[];
}

/** @internal */
export interface WorkerMessageNotification<T> extends MessageEvent {
  data: Notification<GenericWorkerMessage<T>>;
}

export interface DoWork<I, O> {
  work(input$: Observable<I>): Observable<O>;
  selectTransferables?(output: O): Transferable[];
}

// same as DoWork, but selectTransferables is required
export interface DoTransferableWork<I, O> extends DoWork<I, O> {
  selectTransferables(output: O): Transferable[];
}
