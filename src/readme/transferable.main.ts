import { fromWorker } from 'observable-webworker';
import { Observable, of } from 'rxjs';

export function computeHash(arrayBuffer: ArrayBuffer): Observable<string> {
  const input$ = of(arrayBuffer);

  return fromWorker<ArrayBuffer, string>(
    () => new Worker(new URL('./transferable.worker', import.meta.url), { type: 'module' }),
    input$,
    input => [input],
  );
}
