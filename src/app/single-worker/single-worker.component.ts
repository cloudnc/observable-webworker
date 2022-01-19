import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { scan, switchMap, tap } from 'rxjs/operators';
import { fromWorker } from '../../../projects/observable-webworker/src/lib/from-worker';
import { HashWorkerMessage } from '../hash-worker.types';

@Component({
  selector: 'app-single-worker',
  templateUrl: './single-worker.component.html',
  styleUrls: ['./single-worker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SingleWorkerComponent {
  public events$: Subject<string> = new Subject();
  public eventList$: Observable<string[]> = this.events$.pipe(
    scan<string, string[]>((list, event) => {
      list.push(event);
      return list;
    }, []),
  );

  private filesToHash: Subject<File> = new Subject();

  public hashResult$ = this.filesToHash.pipe(switchMap(file => this.hashFile(file)));

  public calculateMD5($event: Event): void {
    this.events$.next('Main: file selected');
    const file = ($event.target as HTMLInputElement)?.files?.[0];

    if (file) {
      this.filesToHash.next(file);
    }
  }

  public hashFile(file: Blob): Observable<HashWorkerMessage> {
    const input$: Observable<Blob> = of(file);

    return fromWorker<Blob, HashWorkerMessage>(() => {
      const worker = new Worker(new URL('../file-hash.worker', import.meta.url), {
        name: 'md5-worker',
        type: 'module',
      });
      this.events$.next('Main: worker created');
      return worker;
    }, input$).pipe(
      tap(res => {
        this.events$.next(`Worker: ${res.message}`);
      }),
    );
  }
}
