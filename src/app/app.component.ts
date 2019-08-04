import { Component } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { finalize, scan, switchMap, tap } from 'rxjs/operators';
import { fromWorker } from '../../projects/observable-webworker/src/lib/from-worker';
import { fromWorkerPool } from '../../projects/observable-webworker/src/lib/from-worker-pool';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  public events$: Subject<string> = new Subject();
  public eventList$: Observable<string[]> = this.events$.pipe(
    scan<string>((list, event) => {
      list.push(event);
      return list;
    }, []),
  );

  private filesToHash: Subject<File> = new Subject();
  private multiFilesToHash: Subject<File[]> = new Subject();

  constructor() {
    this.filesToHash.pipe(switchMap(file => this.hashFile(file))).subscribe();
    this.multiFilesToHash.pipe(switchMap(files => this.hashMultipleFiles(files))).subscribe();
  }

  public calculateSha256($event): void {
    this.events$.next('Main: file selected');
    const file: File = $event.target.files[0];

    this.filesToHash.next(file);
  }

  public hashFile(file: Blob): Observable<string> {
    const input$: Observable<Blob> = of(file);

    return fromWorker<Blob, string>(() => {
      const worker = new Worker('./secure-hash-algorithm.worker', { name: 'sha-worker', type: 'module' });
      this.events$.next('Main: worker created');
      return worker;
    }, input$).pipe(
      tap(res => {
        this.events$.next(`Worker: ${res}`);
      }),
    );
  }

  private *workPool(files: File[]) {
    for (let file of files) {
      yield file;
      this.eventsPool$.next(`Main: file ${file.name} picked up for processing`);
    }
  }

  public hashMultipleFiles(files: File[]): Observable<string> {
    return fromWorkerPool<Blob, string>(index => {
      const worker = new Worker('./secure-hash-algorithm.worker', { name: `sha-worker-${index}`, type: 'module' });
      this.eventsPool$.next(`Main: worker ${index} created`);
      return worker;
    }, this.workPool(files)).pipe(
      tap(res => {
        this.eventsPool$.next(`Worker: ${res}`);
      }),
    );
  }

  public eventsPool$: Subject<string> = new Subject();
  public eventListPool$: Observable<string[]> = this.eventsPool$.pipe(
    scan<string>((list, event) => {
      list.push(`${new Date().toISOString()}: ${event}`);
      return list;
    }, []),
  );

  public calculateSha256Multiple($event): void {
    this.eventsPool$.next('Main: files selected');
    const files: File[] = $event.target.files;
    this.multiFilesToHash.next(files);
  }
}
