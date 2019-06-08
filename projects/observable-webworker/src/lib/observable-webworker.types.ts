import { Notification } from 'rxjs';

export interface GenericWorkerMessage<P = any> {
  payload: P;
  transferables?: Transferable[];
}

export interface WorkerMessageNotification<T> extends MessageEvent {
  data: Notification<GenericWorkerMessage<T>>;
}
