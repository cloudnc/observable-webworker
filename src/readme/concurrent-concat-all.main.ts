import { Observable } from 'rxjs';
import { fromWorkerPool, concurrentConcatAll } from 'observable-webworker';

export function computeHashes(files: File[]): Observable<string> {
  return fromWorkerPool<File, string>(() => new Worker('./transferable.worker', { type: 'module' }), files, {
    flattenOperator: concurrentConcatAll(), // <-- add this
  });
}
