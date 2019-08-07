import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { DoWorkUnit, ObservableWorker } from '../../projects/observable-webworker/src/public-api';

@ObservableWorker()
export class WorkerPoolHashWorker implements DoWorkUnit<File, string> {
  public workUnit(input: File): Observable<string> {
    return this.readFileAsArrayBuffer(input).pipe(
      switchMap(arrayBuffer => crypto.subtle.digest('SHA-256', arrayBuffer)),
      map((digest: ArrayBuffer) => this.arrayBufferToHex(digest)),
    );
  }

  private arrayBufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map(value => value.toString(16).padStart(2, '0'))
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
