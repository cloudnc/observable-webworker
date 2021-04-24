import { ObservableWorkerConstructor, runWorker } from './run-worker';

/**
 * @deprecated - use the `runWorker(YourWorkerClass)` strategy instead, for
 * compatibility with future webpack versions, and a slightly smaller bundle
 * @see https://github.com/cloudnc/observable-webworker#decorator-deprecation-notice
 */
export function ObservableWorker() {
  return <I, O>(workerConstructor: ObservableWorkerConstructor<I, O>): void => {
    runWorker(workerConstructor);
  };
}
