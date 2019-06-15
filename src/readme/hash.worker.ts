import { Observable } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { DoWork, ObservableWorker } from '../../projects/observable-webworker/src/public-api';

@ObservableWorker()
export class HashWorker implements DoWork<ArrayBuffer, string> {
  public work(input$: Observable<ArrayBuffer>): Observable<string> {
    return input$.pipe(
      take(1),
      switchMap(arrayBuffer => crypto.subtle.digest('SHA-256', arrayBuffer)),
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
}
