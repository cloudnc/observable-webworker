import { fakeAsync, tick } from '@angular/core/testing';
import { Observable, Subject, Subscription } from 'rxjs';
import { Notification } from 'rxjs/internal/Notification';
import { reduce } from 'rxjs/operators';
import { fromWorkerPool } from './from-worker-pool';

/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe('fromWorkerPool', () => {
  let stubbedWorkers: Worker[];

  let workerFactorySpy: jasmine.Spy;

  beforeEach(() => {
    stubbedWorkers = [];
    workerFactorySpy = jasmine.createSpy('workerFactorySpy');
    let stubWorkerIndex = 0;
    workerFactorySpy.and.callFake(() => {
      const stubWorker = jasmine.createSpyObj(`stubWorker${stubWorkerIndex++}`, ['postMessage', 'terminate']);
      stubbedWorkers.push(stubWorker);
      return stubWorker;
    });
  });

  describe('with observable input', () => {
    let input$: Subject<number>;
    let stubbedWorkerStream: Observable<number>;

    beforeEach(() => {
      input$ = new Subject();
      stubbedWorkerStream = fromWorkerPool<number, number>(workerFactorySpy, input$);
    });

    it('constructs one worker for one piece of work', () => {
      expect(workerFactorySpy).not.toHaveBeenCalled();

      const subscriptionSpy = jasmine.createSpy('subscriptionSpy');
      const sub = stubbedWorkerStream.subscribe(subscriptionSpy);

      expect(workerFactorySpy).not.toHaveBeenCalled();
      expect(subscriptionSpy).not.toHaveBeenCalled();

      input$.next(1);

      expect(workerFactorySpy).toHaveBeenCalledWith(0);

      sub.unsubscribe();
    });

    it('constructs as many workers as concurrency allows when the input exceeds the output', () => {
      const subscriptionSpy = jasmine.createSpy('subscriptionSpy');
      const sub = stubbedWorkerStream.subscribe(subscriptionSpy);

      for (let i = 0; i < 20; i++) {
        input$.next(i);
      }

      expect(workerFactorySpy).toHaveBeenCalledTimes(navigator.hardwareConcurrency - 1);

      expect(stubbedWorkers[0].postMessage).toHaveBeenCalledWith(jasmine.objectContaining({ kind: 'N', value: 0 }));

      sub.unsubscribe();
    });

    it('shuts down workers when subscriber unsubscribes', () => {
      const subscriptionSpy = jasmine.createSpy('subscriptionSpy');
      const sub = stubbedWorkerStream.subscribe(subscriptionSpy);

      for (let i = 0; i < 20; i++) {
        input$.next(i);
      }

      for (let i = 0; i < navigator.hardwareConcurrency - 1; i++) {
        expect(stubbedWorkers[i].terminate).not.toHaveBeenCalled();
      }

      sub.unsubscribe();

      for (let i = 0; i < navigator.hardwareConcurrency - 1; i++) {
        expect(stubbedWorkers[i].terminate).toHaveBeenCalledTimes(1);
      }
    });

    it('does not shut down workers when outstanding work remains', () => {
      const subscriptionSpy = jasmine.createSpy('subscriptionSpy');
      const sub = stubbedWorkerStream.subscribe(subscriptionSpy);

      for (let i = 0; i < 20; i++) {
        input$.next(i);
      }

      for (let i = 0; i < navigator.hardwareConcurrency - 1; i++) {
        const stubWorker = stubbedWorkers[i];

        stubWorker.onmessage!(
          new MessageEvent('message', {
            data: new Notification('N', i),
          }),
        );

        expect(subscriptionSpy).toHaveBeenCalledWith(i);

        stubWorker.onmessage!(
          new MessageEvent('message', {
            data: new Notification('C'),
          }),
        );

        expect(stubbedWorkers[i].terminate).not.toHaveBeenCalled();
      }

      sub.unsubscribe();
    });
  });

  describe('with array input', () => {
    it('should be able to use array as input', () => {
      const workerCount = 7;

      const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

      const testWorkerStream$ = fromWorkerPool<number, number>(workerFactorySpy, input, { workerCount });
      const subscriptionSpy = jasmine.createSpy('subscriptionSpy');
      const sub = testWorkerStream$
        .pipe(
          reduce((out: number[], res: number) => {
            out.push(res);
            return out;
          }, []),
        )
        .subscribe(subscriptionSpy);

      for (const i of input) {
        const stubWorker = stubbedWorkers[i % workerCount];

        stubWorker.onmessage!(
          new MessageEvent('message', {
            data: new Notification('N', i),
          }),
        );

        stubWorker.onmessage!(
          new MessageEvent('message', {
            data: new Notification('C'),
          }),
        );
      }

      expect(subscriptionSpy).toHaveBeenCalledWith([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

      sub.unsubscribe();
    });
  });

  describe('with iterator input', () => {
    it('should be able to use iterator/generator as input', () => {
      const workerCount = 7;

      function* generator() {
        yield 0;
        yield 1;
        yield 2;
        yield 3;
        yield 4;
        yield 5;
        yield 6;
        yield 7;
        yield 8;
        yield 9;
      }

      const input = generator();

      const testWorkerStream$ = fromWorkerPool<number, number>(workerFactorySpy, input, { workerCount });
      const subscriptionSpy = jasmine.createSpy('subscriptionSpy');
      const sub = testWorkerStream$
        .pipe(
          reduce((out: number[], res: number) => {
            out.push(res);
            return out;
          }, []),
        )
        .subscribe(subscriptionSpy);

      for (const i of generator()) {
        const stubWorker = stubbedWorkers[i % workerCount];

        stubWorker.onmessage!(
          new MessageEvent('message', {
            data: new Notification('N', i),
          }),
        );

        stubWorker.onmessage!(
          new MessageEvent('message', {
            data: new Notification('C'),
          }),
        );
      }

      expect(workerFactorySpy).toHaveBeenCalledTimes(7);
      expect(subscriptionSpy).toHaveBeenCalledWith([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

      sub.unsubscribe();
    });
  });

  describe('with undefined navigator.hardwareConcurrency', () => {
    it('runs a default fallback number of workers', () => {
      spyOnProperty(window.navigator, 'hardwareConcurrency').and.returnValue(undefined);

      const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

      const testWorkerStream$ = fromWorkerPool<number, number>(workerFactorySpy, input);
      const subscriptionSpy = jasmine.createSpy('subscriptionSpy');
      const sub = testWorkerStream$.subscribe(subscriptionSpy);

      expect(workerFactorySpy).toHaveBeenCalledTimes(3);

      sub.unsubscribe();
    });

    it('runs a configured fallback number of workers', () => {
      spyOnProperty(window.navigator, 'hardwareConcurrency').and.returnValue(undefined);

      const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

      const testWorkerStream$ = fromWorkerPool<number, number>(workerFactorySpy, input, { fallbackWorkerCount: 2 });
      const subscriptionSpy = jasmine.createSpy('subscriptionSpy');
      const sub = testWorkerStream$.subscribe(subscriptionSpy);

      expect(workerFactorySpy).toHaveBeenCalledTimes(2);

      sub.unsubscribe();
    });
  });

  describe('output strategy', () => {
    it('[default] outputs results as they are available', fakeAsync(() => {
      const workerCount = 7;

      const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

      const testWorkerStream$ = fromWorkerPool<number, number>(workerFactorySpy, input, { workerCount });
      const subscriptionSpy = jasmine.createSpy('subscriptionSpy');
      const sub = testWorkerStream$
        .pipe(
          reduce((out: number[], res: number) => {
            out.push(res);
            return out;
          }, []),
        )
        .subscribe(subscriptionSpy);

      for (let i = 0; i < input.length; i++) {
        setTimeout(() => {
          const stubWorker = stubbedWorkers[i % workerCount];

          stubWorker.onmessage!(
            new MessageEvent('message', {
              data: new Notification('N', input[i]),
            }),
          );

          stubWorker.onmessage!(
            new MessageEvent('message', {
              data: new Notification('C'),
            }),
          );
        }, 10 - i); // output each result in successively less time for each value
      }

      tick(10);

      expect(workerFactorySpy).toHaveBeenCalledTimes(7);
      expect(subscriptionSpy).toHaveBeenCalledWith([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);

      sub.unsubscribe();
    }));

    it('outputs results as specified by custom passed flattening operator', fakeAsync(() => {
      const workerCount = 7;

      const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

      const operatorSpy = jasmine.createSpy('subscriptionSpy');

      function customOperator(outerObservable$: Observable<Observable<number>>): Observable<number> {
        return new Observable<number>(subscriber => {
          const innerSubs: Subscription[] = [];

          const outerSub = outerObservable$.subscribe(innerObservable$ => {
            innerSubs.push(
              innerObservable$.subscribe(value => {
                subscriber.next(value * 2);
                operatorSpy();
              }),
            );
          });

          return () => {
            innerSubs.forEach(s => s.unsubscribe());
            outerSub.unsubscribe();
          };
        });
      }

      const testWorkerStream$ = fromWorkerPool<number, number>(workerFactorySpy, input, {
        workerCount,
        flattenOperator: customOperator,
      });
      const subscriptionSpy = jasmine.createSpy('subscriptionSpy');
      const sub = testWorkerStream$
        .pipe(
          reduce((out: number[], res: number) => {
            out.push(res);
            return out;
          }, []),
        )
        .subscribe(subscriptionSpy);

      for (let i = 0; i < input.length; i++) {
        setTimeout(() => {
          const stubWorker = stubbedWorkers[i % workerCount];

          stubWorker.onmessage!(
            new MessageEvent('message', {
              data: new Notification('N', input[i]),
            }),
          );

          stubWorker.onmessage!(
            new MessageEvent('message', {
              data: new Notification('C'),
            }),
          );
        }, 10 - i); // output each result in successively less time for each value
      }

      tick(10);

      expect(subscriptionSpy).toHaveBeenCalledWith([18, 16, 14, 12, 10, 8, 6, 4, 2, 0]);
      expect(operatorSpy).toHaveBeenCalledTimes(10);

      sub.unsubscribe();
    }));
  });
});
