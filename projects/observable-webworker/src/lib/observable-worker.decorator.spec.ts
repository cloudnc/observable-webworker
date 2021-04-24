import { Notification, Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { ObservableWorker } from './observable-worker.decorator';
import { DoWork, WorkerMessageNotification } from './observable-worker.types';

describe('@ObservableWorker (deprecated, remove in next major version)', () => {
  it('should automatically run the worker', () => {
    const postMessageSpy = spyOn(window, 'postMessage');
    postMessageSpy.calls.reset();

    @ObservableWorker()
    class TestWorker implements DoWork<number, number> {
      public work(input$: Observable<number>): Observable<number> {
        return input$.pipe(take(1));
      }
    }

    const nextEvent: WorkerMessageNotification<number> = new MessageEvent('message', {
      data: new Notification('N', 0),
    });

    self.dispatchEvent(nextEvent);

    expect(postMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: 'N',
        value: 0,
      }),
    );

    expect(postMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: 'C',
      }),
    );
  });
});
