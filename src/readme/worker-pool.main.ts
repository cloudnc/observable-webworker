import { Observable } from 'rxjs';
import { fromWorkerPool } from 'observable-webworker';

export function computeHashes(files: File[]): Observable<string> {
  return fromWorkerPool<File, string>(() => new Worker('./worker-pool-hash.worker', { type: 'module' }), files);
}
