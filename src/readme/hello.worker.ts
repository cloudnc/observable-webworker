import { DoWork, ObservableWorker } from 'observable-webworker';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@ObservableWorker()
export class HelloWorker implements DoWork<string, string> {
  public work(input$: Observable<string>): Observable<string> {
    return input$.pipe(
      map(message => {
        console.log(message); // outputs 'Hello from main thread'
        return `Hello from webworker`;
      }),
    );
  }
}
