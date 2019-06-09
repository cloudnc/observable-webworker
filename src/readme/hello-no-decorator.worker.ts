// hello-no-decorator.worker.ts
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { runWorker, DoWork, GenericWorkerMessage } from 'observable-webworker';

class HelloWorker implements DoWork<string, string> {
  public work(input$: Observable<GenericWorkerMessage<string>>): Observable<GenericWorkerMessage<string>> {
    return input$.pipe(
      map(message => {
        console.log(message); // outputs 'Hello from main thread'
        return {
          payload: `Hello from webworker`,
        };
      }),
    );
  }
}

runWorker(HelloWorker);
