import { Observable, Observer, of, Subject } from 'rxjs';
import { Notification } from 'rxjs/internal/Notification';
import { fromWorker } from './from-worker';

/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe('fromWorker', () => {
  let input$: Subject<number>;

  let stubWorker: Worker;

  let workerFactorySpy: jasmine.Spy<() => Worker>;

  let stubbedWorkerStream: Observable<number>;

  beforeEach(() => {
    input$ = new Subject();

    stubWorker = jasmine.createSpyObj('stubWorker', ['postMessage', 'terminate']);

    workerFactorySpy = jasmine.createSpy('workerFactorySpy');
    workerFactorySpy.and.returnValue(stubWorker);

    stubbedWorkerStream = fromWorker<number, number>(workerFactorySpy, input$);
  });

  it('should construct a worker and post input notification messages to it', () => {
    expect(workerFactorySpy).not.toHaveBeenCalled();

    const subscriptionSpy = jasmine.createSpy('subscriptionSpy');
    const sub = stubbedWorkerStream.subscribe(subscriptionSpy);

    expect(workerFactorySpy).toHaveBeenCalled();
    expect(stubWorker.postMessage).not.toHaveBeenCalled();
    expect(subscriptionSpy).not.toHaveBeenCalled();

    input$.next(1);

    expect(stubWorker.postMessage).toHaveBeenCalledWith(jasmine.objectContaining({ kind: 'N', value: 1 }));

    input$.next(2);

    expect(stubWorker.postMessage).toHaveBeenCalledWith(jasmine.objectContaining({ kind: 'N', value: 2 }));

    input$.complete();

    expect(stubWorker.postMessage).toHaveBeenCalledWith(jasmine.objectContaining({ kind: 'C' }));

    sub.unsubscribe();

    expect(stubWorker.terminate).toHaveBeenCalled();
  });

  it('should pass unhandled streamed errors on to the worker', () => {
    stubbedWorkerStream.subscribe();

    input$.error('oops!');

    expect(stubWorker.postMessage).toHaveBeenCalledWith(jasmine.objectContaining({ kind: 'E', error: 'oops!' }));
  });

  it('should assign methods to the worker events that materialize into observable output, terminating the worker on completion', () => {
    const subscriptionNextSpy = jasmine.createSpy('subscriptionNextSpy');
    const subscriptionCompleteSpy = jasmine.createSpy('subscriptionCompleteSpy');
    const sub = stubbedWorkerStream.subscribe({ next: subscriptionNextSpy, complete: subscriptionCompleteSpy });

    expect(stubWorker.onmessage).toEqual(jasmine.any(Function));
    expect(stubWorker.onerror).toEqual(jasmine.any(Function));

    expect(subscriptionNextSpy).not.toHaveBeenCalled();

    stubWorker.onmessage!(
      new MessageEvent('message', {
        data: new Notification('N', 1),
      }),
    );

    expect(subscriptionNextSpy).toHaveBeenCalledWith(1);

    stubWorker.onmessage!(
      new MessageEvent('message', {
        data: new Notification('C'),
      }),
    );

    expect(subscriptionCompleteSpy).toHaveBeenCalled();
    expect(stubWorker.terminate).toHaveBeenCalled();
    expect(sub.closed).toBe(true);
  });

  it('should propagate errors from the worker stream', () => {
    const subscriptionErrorSpy = jasmine.createSpy('subscriptionErrorSpy');
    const sub = stubbedWorkerStream.subscribe({ error: subscriptionErrorSpy });

    stubWorker.onmessage!(
      new MessageEvent('message', {
        data: new Notification('E', undefined, 'Nope!'),
      }),
    );

    expect(subscriptionErrorSpy).toHaveBeenCalledWith('Nope!');

    expect(stubWorker.terminate).toHaveBeenCalled();
    expect(sub.closed).toBe(true);
  });

  it('should propagate worker system errors', () => {
    const subscriptionErrorSpy = jasmine.createSpy('subscriptionErrorSpy');
    const sub = stubbedWorkerStream.subscribe({ error: subscriptionErrorSpy });

    stubWorker.onerror!(new ErrorEvent('error', { message: 'Argh!' }));

    expect(subscriptionErrorSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        message: 'Argh!',
      }),
    );

    expect(stubWorker.terminate).toHaveBeenCalled();
    expect(sub.closed).toBe(true);
  });

  it('should propagate browser errors', () => {
    const subscriptionErrorSpy = jasmine.createSpy('subscriptionErrorSpy');

    const testErrorStream = fromWorker<number, number>(() => {
      throw new Error('Oops!');
    }, input$);

    const sub = testErrorStream.subscribe({ error: subscriptionErrorSpy });

    expect(subscriptionErrorSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        message: 'Oops!',
      }),
    );

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

  it('identifies transferables and passes them through to the worker', () => {
    const subscriptionSpy = jasmine.createSpyObj<Observer<number>>('subscriptionSpy', ['next', 'complete', 'error']);

    const testValue = new Int8Array(1);
    testValue[0] = 99;

    const testTransferableStream = fromWorker<Int8Array, number>(workerFactorySpy, of(testValue), input => [
      input.buffer,
    ]);

    const sub = testTransferableStream.subscribe(subscriptionSpy);

    expect(stubWorker.postMessage).toHaveBeenCalledWith(jasmine.objectContaining({ kind: 'N', value: testValue }), [
      testValue.buffer,
    ] as any);

    stubWorker.onmessage!(
      new MessageEvent('message', {
        data: new Notification('N', 1),
      }),
    );

    stubWorker.onmessage!(
      new MessageEvent('message', {
        data: new Notification('C'),
      }),
    );

    expect(subscriptionSpy.next).toHaveBeenCalledWith(1);

    expect(sub.closed).toBe(true);
  });
});
