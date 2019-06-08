import { Component } from '@angular/core';
import { Observable, of } from 'rxjs';
import { fromWorker } from '../../projects/observable-webworker/src/lib/observable-webworker.functions';
import { GenericWorkerMessage } from '../../projects/observable-webworker/src/lib/observable-webworker.types';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  public calculateSha256($event): void {

    const file: File = $event.target.files[0];

    console.time('total');

    const input$: Observable<GenericWorkerMessage<Blob>> = of({payload: file});
    console.time('hashing file');

    fromWorker(() => new Worker('./secure-hash-algorithm.worker', { type: 'module' }), input$).pipe(
    ).subscribe((res) => {
      console.timeEnd('hashing file');
      console.log(`got result`, res);
      console.timeEnd('total');
    });


  }

}
