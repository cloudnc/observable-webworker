import { Observable } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { DoWork, ObservableWorker } from '../../projects/observable-webworker/src/public-api';

@ObservableWorker()
export class SecureHashAlgorithmWorker implements DoWork<Blob, string> {
  public work(input$: Observable<Blob>): Observable<string> {
    return input$.pipe(
      take(1),
      switchMap(message => this.readFileAsArrayBuffer(message)),
      switchMap(arrayBuffer => crypto.subtle.digest('SHA-512', arrayBuffer)),
      map((digest: ArrayBuffer): string => this.arrayBufferToHex(digest)),
    );
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
