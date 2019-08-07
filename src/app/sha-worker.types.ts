export interface ShaWorkerMessage {
  file?: string;
  timestamp: Date;
  message: string;
  thread: Thread;
  millisSinceLast?: number;
}

export enum Thread {
  WORKER = 'worker',
  MAIN = 'main',
}
