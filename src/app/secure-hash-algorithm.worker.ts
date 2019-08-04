import { ObservableWorker } from 'observable-webworker';
import { Observable, Subject } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { DoWorkUnit } from '../../projects/observable-webworker/src/lib/observable-worker.types';

@ObservableWorker()
export class SecureHashAlgorithmWorker implements DoWorkUnit<File, string> {

  public workUnit(input: File): Observable<string> {
    const output$: Subject<string> = new Subject();

    output$.next(`received file ${input.name}`);
    return this.readFileAsArrayBuffer(input).pipe(
      tap(() => output$.next(`${input.name}: read file`)),
      switchMap(arrayBuffer => crypto.subtle.digest('SHA-256', arrayBuffer)),
      tap(() => output$.next(`${input.name}: hashed file`)),
      map((digest: ArrayBuffer): string => `${input.name}: hash result: ${this.arrayBufferToHex(digest)}`),
      tap(() => output$.next(`${input.name}: sending hash back to main thread`)),
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
