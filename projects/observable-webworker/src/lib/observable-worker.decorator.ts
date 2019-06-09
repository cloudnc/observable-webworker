import { runWorker, ObservableWorkerConstructor } from './run-worker';

export function ObservableWorker() {
  return <I, O>(workerConstructor: ObservableWorkerConstructor<I, O>): void => {
    runWorker(workerConstructor);
  };
}
