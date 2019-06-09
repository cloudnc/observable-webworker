import { runWebWorker, ObservableWorkerConstructor } from './run-webworker';

export function ObservableWebWorker() {
  return <I, O>(workerConstructor: ObservableWorkerConstructor<I, O>): void => {
    runWebWorker(workerConstructor);
  };
}
