import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { fromWorker } from '../../projects/observable-webworker/src/lib/from-worker';

@Injectable({
  providedIn: 'root',
})
export class SecureHashAlgorithmService {
  public hashFile(file: Blob): Observable<string> {
    const input$: Observable<Blob> = of(file);
    console.time('hashing file');

    return fromWorker<Blob, string>(
      () => new Worker('./secure-hash-algorithm.worker', { type: 'module' }),
      input$,
    ).pipe(
      tap(res => {
        console.timeEnd('hashing file');
        console.log(`got result`, res);
        console.timeEnd('total');
      }),
    );
  }
}
