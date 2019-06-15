import { Observable, Subject } from 'rxjs';
import { NotificationKind, Notification } from 'rxjs/internal/Notification';
import { map } from 'rxjs/operators';
import { fromTransferableWorker, fromWorker } from './from-worker';
import { GenericWorkerMessage } from './observable-worker.types';

describe('fromWorker', () => {
  let input$: Subject<number>;

  let stubWorker: Worker;

  let workerFactorySpy;

  let stubbedWorkerStream: Observable<GenericWorkerMessage<number>>;

  beforeEach(() => {
    input$ = new Subject();

    stubWorker = jasmine.createSpyObj('stubWorker', ['postMessage', 'terminate']);

    workerFactorySpy = jasmine.createSpy('workerFactorySpy');
    workerFactorySpy.and.returnValue(stubWorker);

    stubbedWorkerStream = fromTransferableWorker<number, number>(workerFactorySpy, input$.pipe(map(payload => ({ payload }))));
  });

  it('should construct a worker and post input notification messages to it', () => {
    expect(workerFactorySpy).not.toHaveBeenCalled();

    const subscriptionSpy = jasmine.createSpy('subscriptionSpy');
    const sub = stubbedWorkerStream.subscribe(subscriptionSpy);

    expect(workerFactorySpy).toHaveBeenCalled();
    expect(stubWorker.postMessage).not.toHaveBeenCalled();
    expect(subscriptionSpy).not.toHaveBeenCalled();

    input$.next(1);

    expect(stubWorker.postMessage).toHaveBeenCalledWith(
      jasmine.objectContaining({ kind: NotificationKind.NEXT, value: { payload: 1 } }),
    );

    input$.next(2);

    expect(stubWorker.postMessage).toHaveBeenCalledWith(
      jasmine.objectContaining({ kind: NotificationKind.NEXT, value: { payload: 2 } }),
    );

    input$.complete();

    expect(stubWorker.postMessage).toHaveBeenCalledWith(jasmine.objectContaining({ kind: NotificationKind.COMPLETE }));

    sub.unsubscribe();

    expect(stubWorker.terminate).toHaveBeenCalled();
  });

  it('should pass unhandled streamed errors on to the worker', () => {
    stubbedWorkerStream.subscribe();

    input$.error('oops!');

    expect(stubWorker.postMessage).toHaveBeenCalledWith(
      jasmine.objectContaining({ kind: NotificationKind.ERROR, error: 'oops!' }),
    );
  });

  it('should assign methods to the worker events that materialize into observable output, terminating the worker on completion', () => {
    const subscriptionNextSpy = jasmine.createSpy('subscriptionNextSpy');
    const subscriptionCompleteSpy = jasmine.createSpy('subscriptionCompleteSpy');
    const sub = stubbedWorkerStream.subscribe({ next: subscriptionNextSpy, complete: subscriptionCompleteSpy });

    expect(stubWorker.onmessage).toEqual(jasmine.any(Function));
    expect(stubWorker.onerror).toEqual(jasmine.any(Function));

    expect(subscriptionNextSpy).not.toHaveBeenCalled();

    stubWorker.onmessage(
      new MessageEvent('message', {
        data: new Notification(NotificationKind.NEXT, 1),
      }),
    );

    expect(subscriptionNextSpy).toHaveBeenCalledWith(1);

    stubWorker.onmessage(
      new MessageEvent('message', {
        data: new Notification(NotificationKind.COMPLETE),
      }),
    );

    expect(subscriptionCompleteSpy).toHaveBeenCalled();
    expect(stubWorker.terminate).toHaveBeenCalled();
    expect(sub.closed).toBe(true);
  });

  it('should propagate errors from the worker stream', () => {
    const subscriptionErrorSpy = jasmine.createSpy('subscriptionErrorSpy');
    const sub = stubbedWorkerStream.subscribe({ error: subscriptionErrorSpy });

    stubWorker.onmessage(
      new MessageEvent('message', {
        data: new Notification(NotificationKind.ERROR, undefined, 'Nope!'),
      }),
    );

    expect(subscriptionErrorSpy).toHaveBeenCalledWith('Nope!');

    expect(stubWorker.terminate).toHaveBeenCalled();
    expect(sub.closed).toBe(true);
  });

  it('should propagate worker system errors', () => {
    const subscriptionErrorSpy = jasmine.createSpy('subscriptionErrorSpy');
    const sub = stubbedWorkerStream.subscribe({ error: subscriptionErrorSpy });

    stubWorker.onerror(new ErrorEvent('error', { message: 'Argh!' }));

    expect(subscriptionErrorSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        message: 'Argh!',
      }),
    );

    expect(stubWorker.terminate).toHaveBeenCalled();
    expect(sub.closed).toBe(true);
  });

  it('should construct multiple workers for multiple subscribers', () => {
    const sub1 = stubbedWorkerStream.subscribe();
    const sub2 = stubbedWorkerStream.subscribe();

    expect(workerFactorySpy).toHaveBeenCalledTimes(2);

    sub1.unsubscribe();

    expect(sub1.closed).toBe(true);
    expect(sub2.closed).toBe(false);
    expect(stubWorker.terminate).toHaveBeenCalledTimes(1);

    sub2.unsubscribe();
    expect(sub2.closed).toBe(true);
    expect(stubWorker.terminate).toHaveBeenCalledTimes(2);
  });
});
