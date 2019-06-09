// hello.ts
import { fromWorker } from 'observable-webworker';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';

const input$ = of({ payload: 'Hello from main thread' });

fromWorker<string, string>(() => new Worker('./hello.worker', { type: 'module' }), input$)
  .pipe(map(res => res.payload))
  .subscribe(message => {
    console.log(message); // Outputs 'Hello from webworker'
  });
