import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { fromTransferableWorker } from '../../projects/observable-webworker/src/lib/from-worker';

export function computeHash(arrayBuffer: ArrayBuffer): Observable<string> {
  const input$ = of({
    payload: arrayBuffer,
    transferables: [arrayBuffer]
  });

  return fromTransferableWorker<ArrayBuffer, string>(
    () => new Worker('./transferable.worker', { type: 'module' }),
    input$,
  ).pipe(map(response => response.payload));
}
