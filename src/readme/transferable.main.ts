import { fromWorker } from 'observable-webworker';
import { Observable, of } from 'rxjs';

export function computeHash(arrayBuffer: ArrayBuffer): Observable<string> {
  const input$ = of(arrayBuffer);

  return fromWorker<ArrayBuffer, string>(
    () => new Worker('./transferable.worker', { type: 'module' }),
    input$,
    input => [input],
  );
}
