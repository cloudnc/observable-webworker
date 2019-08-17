export interface HashWorkerMessage {
  file?: string;
  timestamp: Date;
  message: string;
  thread: Thread;
  fileEventType: FileHashEvent | null; // null if not a file event
  // values computed after emission
  millisSinceLast?: number;
}

export enum Thread {
  WORKER = 'worker',
  MAIN = 'main',
}

export enum FileHashEvent {
  SELECTED = 'selected',
  PICKED_UP = 'picked_up',
  FILE_RECEIVED = 'file_received',
  FILE_READ = 'file_read',
  HASH_COMPUTED = 'hash_computed',
  HASH_RECEIVED = 'hash_received',
}
