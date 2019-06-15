import { Observable, Subject } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { DoWork, ObservableWorker } from 'observable-webworker';

@ObservableWorker()
export class SecureHashAlgorithmWorker implements DoWork<Blob, string> {
  public work(input$: Observable<Blob>): Observable<string> {
    const output$: Subject<string> = new Subject();

    input$
      .pipe(
        take(1),
        tap(() => output$.next('received file')),
        switchMap(message => this.readFileAsArrayBuffer(message)),
        tap(() => output$.next('read file')),
        switchMap(arrayBuffer => crypto.subtle.digest('SHA-256', arrayBuffer)),
        tap(() => output$.next('hashed file')),
        map((digest: ArrayBuffer): string => 'hash result: ' + this.arrayBufferToHex(digest)),
        tap(() => output$.next('sending hash back to main thread')),
      )
      .subscribe(output$);

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
