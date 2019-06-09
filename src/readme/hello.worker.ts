// hello.worker.ts

import { ObservableWorker, DoWork, GenericWorkerMessage } from 'observable-webworker';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@ObservableWorker()
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
