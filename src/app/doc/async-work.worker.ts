import { DoWorkUnit, ObservableWorker } from 'observable-webworker';

function factorize(input: number): number[] {
  return []; // actual implementation left for the reader :)
}

@ObservableWorker()
export class FactorizationWorker implements DoWorkUnit<number, number[]> {
  public async workUnit(input: number): Promise<number[]> {
    return factorize(input);
  }
}
