// @ts-nocheck - @todo remove typechecking prevention once the typescript config supports it
import { fromWorker } from 'observable-webworker';
import { of } from 'rxjs';

const input$ = of('Hello from main thread');

fromWorker<string, string>(
  () => new Worker(new URL('./hello.worker', import.meta.url), { type: 'module' }),
  input$,
).subscribe(message => {
  console.log(message); // Outputs 'Hello from webworker'
});
