import { ObservableWorker } from 'observable-webworker';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { DoWorkUnit } from '../../projects/observable-webworker/src/lib/observable-worker.types';
import { FileHashEvent, ShaWorkerMessage, Thread } from './sha-worker.types';

@ObservableWorker()
export class SecureHashAlgorithmWorker implements DoWorkUnit<File, ShaWorkerMessage> {
  public workUnit(input: File): Observable<ShaWorkerMessage> {
    const output$: Subject<ShaWorkerMessage> = new ReplaySubject(Infinity);

    const log = (fileEventType: FileHashEvent, message: string): ShaWorkerMessage => ({
      file: input.name,
      timestamp: new Date(),
      message,
      thread: Thread.WORKER,
      fileEventType,
    });

    output$.next(log(FileHashEvent.FILE_RECEIVED, `received file`));
    this.readFileAsArrayBuffer(input).pipe(
      tap(() => output$.next(log(FileHashEvent.FILE_READ, `read file`))),
      switchMap(arrayBuffer => crypto.subtle.digest('SHA-256', arrayBuffer)),
      tap(() => output$.next(log(FileHashEvent.HASH_COMPUTED, `hashed file`))),
      map((digest: ArrayBuffer): ShaWorkerMessage => log(null,`hash result: ${this.arrayBufferToHex(digest)}`)),
      tap(out => {
        output$.next(out);
        output$.complete();
      }),
      take(1),
    ).subscribe();

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
      reader.onload = () => observer.next(reader.result as ArrayBuffer);
      reader.onloadend = () => observer.complete();

      reader.readAsArrayBuffer(blob);

      return () => reader.abort();
    });
  }
}
