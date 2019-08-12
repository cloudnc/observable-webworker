import { mergeAll } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';
import { concurrentConcatAll } from './concurrent-concat-all';

const createScheduler = () => {
  return new TestScheduler((actual, expected) => {
    // asserting the two objects are equal
    // e.g. using chai.
    expect(actual).toEqual(expected);
  });
};

// Don't reformat the carefully spaced marble diagrams
// prettier-ignore
fdescribe('concurrentConcatAll', () => {
  it('generate the stream correctly', () => {
    const testScheduler = createScheduler();
    testScheduler.run(helpers => {
      const { cold, hot, expectObservable } = helpers;
      const x = cold(    '--a---b--c---d--|      ');
      const y = cold(           '----e---f--g---|');
      const e1 = hot(  '--x------y-------|       ', { x, y });
      const expected = '----a---b--c-e-d-f--g---|';

      expectObservable(e1.pipe(mergeAll())).toBe(expected);
    });
  });

  it('concatenates output of inner observables', () => {

    const testScheduler = createScheduler();

    testScheduler.run(helpers => {
      const { cold, hot, expectObservable } = helpers;
      const x = cold(    '--a---b--c---d------|');
      const y = cold(                    '----e---f--g---|');
      const e1 = hot(  '--x---------------y--------------|', { x, y });
      const expected = '----a---b--c---d------e---f--g---|';

      expectObservable(e1.pipe(concurrentConcatAll())).toBe(expected);
    });
  });

  it('appends inner observables that completed first but sequenced after', () => {

    const testScheduler = createScheduler();

    testScheduler.run(helpers => {
      const { cold, hot, expectObservable } = helpers;
      const x = cold(    '--a---b--c---d--|');
      const y = cold(     '----e---f--g---|');
      const e1 = hot(  '--xy--------------------|', { x, y });
      const expected = '----a---b--c---d--(efg)-|';

      expectObservable(e1.pipe(concurrentConcatAll())).toBe(expected);
    });
  });

  it('appends inner observables overlap other observables', () => {

    const testScheduler = createScheduler();

    testScheduler.run(helpers => {
      const { cold, hot, expectObservable } = helpers;
      const x = cold(    '--a---b--c---d--|');
      const y = cold(           '----e---f--------g---|');
      const e1 = hot(  '--x------y--------------------|', { x, y });
      const expected = '----a---b--c---d--(ef)----g---|';

      expectObservable(e1.pipe(concurrentConcatAll())).toBe(expected);
    });
  });

  it('buffers completed inner observables', () => {

    const testScheduler = createScheduler();

    testScheduler.run(helpers => {
      const { cold, hot, expectObservable } = helpers;
      const x = cold(    '----------a---b--c---d--|');
      const y = cold(     '-e--f--g-|');
      const e1 = hot(  '--xy----------------------------|', { x, y });
      const expected = '------------a---b--c---d--(efg)-|';

      expectObservable(e1.pipe(concurrentConcatAll())).toBe(expected);
    });
  });

  it('passes on errors asap from inner observables', () => {

    const testScheduler = createScheduler();

    testScheduler.run(helpers => {
      const { cold, hot, expectObservable } = helpers;
      const x = cold(    '------------a---b--c---d--|');
      const y = cold(     '-e--f--g-#');
      const e1 = hot(  '--xy----------------------------|', { x, y });
      const expected = '------------#';

      expectObservable(e1.pipe(concurrentConcatAll())).toBe(expected);
    });
  });

  it('passes on errors asap from outer observables', () => {

    const testScheduler = createScheduler();

    testScheduler.run(helpers => {
      const { cold, hot, expectObservable } = helpers;
      const x = cold(    '------------a---b--c---d--|');
      const y = cold(     '-e--f--g-#');
      const e1 = hot(  '--xy----#------------------------|', { x, y });
      const expected = '--------#';

      expectObservable(e1.pipe(concurrentConcatAll())).toBe(expected);
    });
  });
});
