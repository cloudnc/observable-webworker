import { ObservableWorker } from 'observable-webworker';
import { Observable, Subject } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { DoWorkUnit } from '../../projects/observable-webworker/src/lib/observable-worker.types';
import { ShaWorkerMessage, Thread } from './sha-worker.types';

@ObservableWorker()
export class SecureHashAlgorithmWorker implements DoWorkUnit<File, ShaWorkerMessage> {
  public workUnit(input: File): Observable<ShaWorkerMessage> {
    const output$: Subject<ShaWorkerMessage> = new Subject();

    const log = message => ({
      file: input.name,
      timestamp: new Date(),
      message,
      thread: Thread.WORKER,
    });

    output$.next(log(`received file`));
    return this.readFileAsArrayBuffer(input).pipe(
      tap(() => output$.next(log(`read file`))),
      switchMap(arrayBuffer => crypto.subtle.digest('SHA-256', arrayBuffer)),
      tap(() => output$.next(log(`hashed file`))),
      map((digest: ArrayBuffer): ShaWorkerMessage => log(`hash result: ${this.arrayBufferToHex(digest)}`)),
      tap(() => output$.next(log(`sending hash back to main thread`))),
      tap(out => {
        output$.next(out);
        output$.complete();
      }),
    );

    return output$;
  }

  private arrayBufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map(value => {
        const hexCode = value.toString(16);
        const paddedHexCode = hexCode.padStart(2, '0');
        return paddedHexCode;
      })
      .join('');
  }

  private readFileAsArrayBuffer(blob: Blob): Observable<ArrayBuffer> {
    return new Observable(observer => {
      if (!(blob instanceof Blob)) {
        observer.error(new Error('`blob` must be an instance of File or Blob.'));
        return;
      }

      const reader = new FileReader();

      reader.onerror = err => observer.error(err);
      reader.onabort = err => observer.error(err);
      reader.onload = () => observer.next(reader.result as ArrayBuffer);
      reader.onloadend = () => observer.complete();

      return reader.readAsArrayBuffer(blob);
    });
  }
}
