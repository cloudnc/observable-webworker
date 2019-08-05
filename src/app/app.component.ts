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


}
