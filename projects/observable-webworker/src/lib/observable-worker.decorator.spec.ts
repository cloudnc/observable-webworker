import { Notification, Observable } from 'rxjs';
import { NotificationKind } from 'rxjs/internal/Notification';
import { take } from 'rxjs/operators';
import { ObservableWorker } from './observable-worker.decorator';
import { DoWork, WorkerMessageNotification } from './observable-worker.types';

describe('@ObservableWorker', () => {

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
      data: new Notification(NotificationKind.NEXT, {payload: 0}),
    });

    self.dispatchEvent(nextEvent);

    expect(postMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: NotificationKind.NEXT,
        value: { payload: 0 },
      }),
      undefined
    );

    expect(postMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: NotificationKind.COMPLETE,
      }),
      undefined
    );

  });
});

