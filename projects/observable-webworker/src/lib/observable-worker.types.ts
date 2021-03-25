import { Notification, Observable } from 'rxjs';

/** @internal */
export interface GenericWorkerMessage<P = any> {
  payload: P;
  transferables?: Transferable[];
}

/** @internal */
export interface WorkerMessageNotification<T> extends MessageEvent {
  data: Notification<T>;
}

export interface DoWorkUnit<I, O> {
  workUnit(input: I): Observable<O> | PromiseLike<O>;
  selectTransferables?(output: O): Transferable[];
}

export interface DoWork<I, O> {
  work(input$: Observable<I>): Observable<O>;
  selectTransferables?(output: O): Transferable[];
}

// same as DoWork, but selectTransferables is required
export interface DoTransferableWork<I, O> extends DoWork<I, O> {
  selectTransferables(output: O): Transferable[];
}

// same as DoWorkUnit, but selectTransferables is required
export interface DoTransferableWorkUnit<I, O> extends DoWorkUnit<I, O> {
  selectTransferables(output: O): Transferable[];
}
