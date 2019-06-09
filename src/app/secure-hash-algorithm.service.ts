import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { fromWebWorker } from '../../projects/observable-webworker/src/lib/from-webworker.function';
import { GenericWorkerMessage } from '../../projects/observable-webworker/src/lib/observable-webworker.types';

@Injectable({
  providedIn: 'root',
})
export class SecureHashAlgorithmService {
  public hashFile(file: Blob): Observable<string> {
    const input$: Observable<GenericWorkerMessage<Blob>> = of({
      payload: file,
    });
    console.time('hashing file');

    return fromWebWorker<Blob, string>(
      () => new Worker('./secure-hash-algorithm.worker', { type: 'module' }),
      input$,
    ).pipe(
      map(res => {
        console.timeEnd('hashing file');
        console.log(`got result`, res);
        console.timeEnd('total');

        return res.payload;
      }),
    );
  }
}
