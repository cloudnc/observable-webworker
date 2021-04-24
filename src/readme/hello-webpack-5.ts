// @ts-nocheck - @todo remove typechecking prevention once this repo upgrades to Angular 12 stable
import { fromWorker } from 'observable-webworker';
import { of } from 'rxjs';

const input$ = of('Hello from main thread');

fromWorker<string, string>(
  () => new Worker(new URL('./app.worker', import.meta.url), { type: 'module' }),
  input$,
).subscribe(message => {
  console.log(message); // Outputs 'Hello from webworker'
});
