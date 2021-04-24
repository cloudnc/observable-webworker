import * as md5 from 'js-md5';
import { DoWorkUnit, runWorker } from 'observable-webworker';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export class WorkerPoolHashWorker implements DoWorkUnit<File, string> {
  public workUnit(input: File): Observable<string> {
    return this.readFileAsArrayBuffer(input).pipe(map(arrayBuffer => md5(arrayBuffer)));
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

runWorker(WorkerPoolHashWorker);
