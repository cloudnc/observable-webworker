import { Observable } from 'rxjs';
import { fromWorkerPool } from 'observable-webworker';

export function computeHashes(files: File[]): Observable<string> {
  return fromWorkerPool<File, string>(
    () => new Worker(new URL('./worker-pool-hash.worker', import.meta.url), { type: 'module' }),
    files,
  );
}
