import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { scan, switchMap, tap } from 'rxjs/operators';
import { fromWorker } from '../../../projects/observable-webworker/src/lib/from-worker';
import { ShaWorkerMessage } from '../sha-worker.types';

@Component({
  selector: 'app-single-worker',
  templateUrl: './single-worker.component.html',
  styleUrls: ['./single-worker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SingleWorkerComponent {
  public events$: Subject<string> = new Subject();
  public eventList$: Observable<string[]> = this.events$.pipe(
    scan<string>((list, event) => {
      list.push(event);
      return list;
    }, []),
  );

  private filesToHash: Subject<File> = new Subject();

  public hashResult$ = this.filesToHash.pipe(switchMap(file => this.hashFile(file)));

  public calculateSha256($event): void {
    this.events$.next('Main: file selected');
    const file: File = $event.target.files[0];

    this.filesToHash.next(file);
  }

  public hashFile(file: Blob): Observable<ShaWorkerMessage> {
    const input$: Observable<Blob> = of(file);

    return fromWorker<Blob, ShaWorkerMessage>(() => {
      const worker = new Worker('../secure-hash-algorithm.worker', { name: 'sha-worker', type: 'module' });
      this.events$.next('Main: worker created');
      return worker;
    }, input$).pipe(
      tap(res => {
        this.events$.next(`Worker: ${res.message}`);
      }),
    );
  }
}
