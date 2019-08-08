import { from, Observable, Observer, of, Notification, BehaviorSubject } from 'rxjs';
import { NotificationKind } from 'rxjs/internal/Notification';
import {
  DoTransferableWork,
  DoTransferableWorkUnit,
  DoWork,
  DoWorkUnit,
  WorkerMessageNotification,
} from './observable-worker.types';
import { processWork, runWorker, workerIsTransferableType, workerIsUnitType } from './run-worker';

describe('workerIsTransferableType', () => {
  it('should identify a worker as being able to map transferables', () => {
    class TestWorkerTransferable implements DoTransferableWork<number, number> {
      public selectTransferables(output: number): Transferable[] {
        return [];
      }

      public work(input$: Observable<number>): Observable<number> {
        return undefined;
      }
    }

    class TestWorkerNotTransferable implements DoWork<number, number> {
      public work(input$: Observable<number>): Observable<number> {
        return undefined;
      }
    }

    expect(workerIsTransferableType(new TestWorkerTransferable())).toBe(true);
    expect(workerIsTransferableType(new TestWorkerNotTransferable())).toBe(false);
  });
});

describe('workerIsUnitType', () => {
  it('should identify a worker as being able to do work units', () => {
    class TestWorkerUnit implements DoWorkUnit<number, number> {
      public workUnit(input: number): Observable<number> {
        return undefined;
      }
    }

    class TestWorkerNotUnit implements DoWork<number, number> {
      public work(input$: Observable<number>): Observable<number> {
        return undefined;
      }
    }

    expect(workerIsUnitType(new TestWorkerUnit())).toBe(true);
    expect(workerIsUnitType(new TestWorkerNotUnit())).toBe(false);
  });
});

describe('processWork', () => {
  it('takes a stream of work and converts it to a stream of worker message notifications', () => {
    class TestWorker implements DoWork<number, number> {
      public work(input$: Observable<number>): Observable<number> {
        return undefined;
      }
    }

    const input$ = from([1, 2, 3]);

    const output$ = processWork(input$, new TestWorker());

    const outputSpy = jasmine.createSpyObj<Observer<number>>(['next', 'complete', 'error']);

    const sub = output$.subscribe(outputSpy);

    expect(outputSpy.complete).toHaveBeenCalled();
    expect(outputSpy.error).not.toHaveBeenCalled();

    expect(outputSpy.next).toHaveBeenCalledWith(
      jasmine.objectContaining({ kind: NotificationKind.NEXT, value: { payload: 1 } }),
    );

    expect(outputSpy.next).toHaveBeenCalledWith(
      jasmine.objectContaining({ kind: NotificationKind.NEXT, value: { payload: 2 } }),
    );

    expect(outputSpy.next).toHaveBeenCalledWith(
      jasmine.objectContaining({ kind: NotificationKind.NEXT, value: { payload: 3 } }),
    );

    sub.unsubscribe();
  });

  it('takes stream of work and identifies the transferables within', () => {
    class TestWorkerTransferable implements DoTransferableWorkUnit<number, Int8Array> {
      public selectTransferables(output: Int8Array): Transferable[] {
        return [output.buffer];
      }

      public workUnit(input: number): Observable<Int8Array> {
        return of(new Int8Array(input));
      }
    }

    const testOutput = new Int8Array(1);
    testOutput[0] = 123;

    const input$ = of(testOutput);

    const worker = new TestWorkerTransferable();

    const transferableSpy = spyOn(worker, 'selectTransferables').and.callThrough();

    const output$ = processWork(input$, worker);

    const outputSpy = jasmine.createSpyObj<Observer<number>>(['next', 'complete', 'error']);

    const sub = output$.subscribe(outputSpy);

    expect(transferableSpy).toHaveBeenCalledWith(testOutput);

    expect(outputSpy.complete).toHaveBeenCalled();
    expect(outputSpy.error).not.toHaveBeenCalled();

    expect(outputSpy.next).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: NotificationKind.NEXT,
        value: { payload: testOutput, transferables: [testOutput.buffer] },
      }),
    );

    sub.unsubscribe();
  });
});

describe('getWorkerResult', () => {



});

describe('runWorker', () => {
  it('should read messages from self.message event emitter and process work and send results back to postmessage', () => {
    const postMessageSpy = spyOn(window, 'postMessage');

    class TestWorkerUnit implements DoWorkUnit<number, number> {
      public workUnit(input: number): Observable<number> {
        return of(input * 2);
      }
    }

    const sub = runWorker(TestWorkerUnit);

    const event: WorkerMessageNotification<number> = new MessageEvent('message', {
      data: new Notification(NotificationKind.NEXT, {payload: 11}),
    });

    self.dispatchEvent(event);

    expect(postMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: NotificationKind.NEXT,
        value: { payload: 22 },
      }),
      undefined
    );

    expect(postMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: NotificationKind.COMPLETE,
      }),
      undefined
    );

    sub.unsubscribe();
  });


  it('should pass outbound transferables to the postMessage call', () => {
    const postMessageSpy = spyOn(window, 'postMessage');

    class TestWorkerUnitTransferable implements DoTransferableWorkUnit<Int8Array, Int8Array> {
      public workUnit(input: Int8Array): Observable<Int8Array> {

        for (let i = 0; i<input.length; i++) {
          input[i]*=3;
        }

        return of(input);
      }

      public selectTransferables(output: Int8Array): Transferable[] {
        return [output.buffer];
      }
    }

    const sub = runWorker(TestWorkerUnitTransferable);

    const payload = new Int8Array(3);
    payload[0] = 1;
    payload[1] = 2;
    payload[2] = 3;

    const expected = new Int8Array(3);
    expected[0] = 3;
    expected[1] = 6;
    expected[2] = 9;

    const event: WorkerMessageNotification<number> = new MessageEvent('message', {
      data: new Notification(NotificationKind.NEXT, {payload}),
    });

    self.dispatchEvent(event);

    expect(postMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: NotificationKind.NEXT,
        value: { payload: expected, transferables: [expected.buffer] },
      }),
      [expected.buffer]
    );

    expect(postMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: NotificationKind.COMPLETE,
      }),
      undefined
    );

    sub.unsubscribe();
  });

  it('should not complete the notification stream if the worker does not complete', () => {
    const postMessageSpy = spyOn(window, 'postMessage');
    postMessageSpy.calls.reset();

    class TestWorker implements DoWork<number, number> {
      public work(input$: Observable<number>): Observable<number> {

        return new BehaviorSubject(1);
      }

    }

    const sub = runWorker(TestWorker);

    const event: WorkerMessageNotification<number> = new MessageEvent('message', {
      data: new Notification(NotificationKind.NEXT, {payload: 0}),
    });

    self.dispatchEvent(event);

    expect(postMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: NotificationKind.NEXT,
        value: { payload: 1 },
      }),
      undefined
    );

    expect(postMessageSpy).not.toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: NotificationKind.COMPLETE,
      }),
      undefined
    );

    sub.unsubscribe();
  });
});
