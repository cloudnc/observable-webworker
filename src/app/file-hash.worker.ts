import * as md5 from 'js-md5';
import { runWorker } from 'observable-webworker';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { DoWorkUnit } from '../../projects/observable-webworker/src/lib/observable-worker.types';
import { FileHashEvent, HashWorkerMessage, Thread } from './hash-worker.types';

export class FileHashWorker implements DoWorkUnit<File, HashWorkerMessage> {
  public workUnit(input: File): Observable<HashWorkerMessage> {
    const output$: Subject<HashWorkerMessage> = new ReplaySubject(Infinity);

    const log = (fileEventType: FileHashEvent, message: string): HashWorkerMessage => ({
      file: input.name,
      timestamp: new Date(),
      message,
      thread: Thread.WORKER,
      fileEventType,
    });

    output$.next(log(FileHashEvent.FILE_RECEIVED, `received file`));
    this.readFileAsArrayBuffer(input)
      .pipe(
        tap(() => output$.next(log(FileHashEvent.FILE_READ, `read file`))),
        map(arrayBuffer => md5(arrayBuffer)),
        map((digest: string): HashWorkerMessage => log(FileHashEvent.HASH_COMPUTED, `hash result: ${digest}`)),
        tap(out => {
          output$.next(out);
          output$.complete();
        }),
        take(1),
      )
      .subscribe();

    return output$;
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

runWorker(FileHashWorker);
