import { fakeAsync, tick } from '@angular/core/testing';
import { BehaviorSubject, Notification, Observable, of } from 'rxjs';
import {
  DoTransferableWork,
  DoTransferableWorkUnit,
  DoWork,
  DoWorkUnit,
  WorkerMessageNotification,
} from './observable-worker.types';
import { runWorker, workerIsTransferableType, workerIsUnitType } from './run-worker';

describe('workerIsTransferableType', () => {
  it('should identify a worker as being able to map transferables', () => {
    class TestWorkerTransferable implements DoTransferableWork<number, number> {
      public selectTransferables(output: number): Transferable[] {
        return [];
      }

      public work(input$: Observable<number>): Observable<number> {
        return of(1);
      }
    }

    class TestWorkerNotTransferable implements DoWork<number, number> {
      public work(input$: Observable<number>): Observable<number> {
        return of(1);
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
        return of(1);
      }
    }

    class TestWorkerNotUnit implements DoWork<number, number> {
      public work(input$: Observable<number>): Observable<number> {
        return of(1);
      }
    }

    expect(workerIsUnitType(new TestWorkerUnit())).toBe(true);
    expect(workerIsUnitType(new TestWorkerNotUnit())).toBe(false);
  });
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
      data: new Notification('N', 11),
    });

    self.dispatchEvent(event);

    expect(postMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: 'N',
        value: 22,
      }),
    );

    expect(postMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: 'C',
      }),
    );

    sub.unsubscribe();
  });

  it('should pass outbound transferables to the postMessage call', () => {
    const postMessageSpy = spyOn(window, 'postMessage');

    class TestWorkerUnitTransferable implements DoTransferableWorkUnit<Int8Array, Int8Array> {
      public workUnit(input: Int8Array): Observable<Int8Array> {
        for (let i = 0; i < input.length; i++) {
          input[i] *= 3;
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

    const event: WorkerMessageNotification<Int8Array> = new MessageEvent('message', {
      data: new Notification('N', payload),
    });

    self.dispatchEvent(event);

    expect(postMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: 'N',
        value: payload,
      }),
      [expected.buffer] as any,
    );

    expect(postMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: 'C',
      }),
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
      data: new Notification('N', 0),
    });

    self.dispatchEvent(event);

    expect(postMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: 'N',
        value: 1,
      }),
    );

    expect(postMessageSpy).not.toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: 'C',
      }),
    );

    sub.unsubscribe();
  });

  it('should permit promises to be returned from doWork to allow for simpler async/await patterns', fakeAsync(() => {
    const postMessageSpy = spyOn(window, 'postMessage');

    class TestWorkerUnit implements DoWorkUnit<number, number> {
      public async workUnit(input: number): Promise<number> {
        return input * 2;
      }
    }

    const sub = runWorker(TestWorkerUnit);

    const event: WorkerMessageNotification<number> = new MessageEvent('message', {
      data: new Notification('N', 1),
    });

    self.dispatchEvent(event);

    tick();

    expect(postMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: 'N',
        value: 2,
      }),
    );

    expect(postMessageSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        kind: 'C',
      }),
    );

    sub.unsubscribe();
  }));
});
