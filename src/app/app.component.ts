import { Component } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { finalize, scan, switchMap, tap } from 'rxjs/operators';
import { fromWorker } from '../../projects/observable-webworker/src/lib/from-worker';

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

  constructor() {
    this.filesToHash.pipe(switchMap(file => this.hashFile(file))).subscribe();
  }

  public calculateSha256($event): void {
    this.events$.next('Main: file selected');
    const file: File = $event.target.files[0];

    this.filesToHash.next(file);
  }

  public hashFile(file: Blob): Observable<string> {
    const input$: Observable<Blob> = of(file);

    return fromWorker<Blob, string>(() => {
      const worker = new Worker('./secure-hash-algorithm.worker', { type: 'module' });
      this.events$.next('Main: worker created');
      return worker;
    }, input$).pipe(
      tap(res => {
        this.events$.next(`Worker: ${res}`);
      }),
    );
  }
}
