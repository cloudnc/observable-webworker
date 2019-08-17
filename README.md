# Observable Webworker

Simple API for using [web workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) with [RxJS](https://rxjs-dev.firebaseapp.com/guide/overview) observables

[![npm version](https://badge.fury.io/js/observable-webworker.svg)](https://www.npmjs.com/package/observable-webworker)
[![Build Status](https://travis-ci.org/cloudnc/observable-webworker.svg?branch=master)](https://travis-ci.org/cloudnc/observable-webworker)
[![codecov](https://codecov.io/gh/cloudnc/observable-webworker/branch/master/graph/badge.svg)](https://codecov.io/gh/cloudnc/observable-webworker)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](https://commitizen.github.io/cz-cli/)
[![License](https://img.shields.io/github/license/cloudnc/observable-webworker)](https://raw.githubusercontent.com/cloudnc/observable-webworker/master/LICENSE)
![npm peer dependency version](https://img.shields.io/npm/dependency-version/observable-webworker/peer/rxjs)

[![NPM](https://nodei.co/npm/observable-webworker.png?compact=true)](https://nodei.co/npm/observable-webworker/)

# Features

- Simple `fromWorker` function from main thread side
- Fully RxJS interfaces allowing both main thread and worker thread streaming
- Error handling across the thread boundaries is propagated
  - Under the hood `materialize` and `dematerialize` is used as a robust transport of streaming errors
- Automatic handling of worker termination on main thread unsubscription of observable
- Framework agnostic - while the demo uses Angular, the only dependencies are rxjs so React or Vue or plain old js is
  completely compatible
- Fully compatible with [Webpack worker-plugin](https://github.com/GoogleChromeLabs/worker-plugin)
  - Therefore compatible with [Angular webworker bundling](https://angular.io/guide/web-worker) which uses this
- Class interface based worker creation (should be familiar API for Angular developers)
- Unopinionated on stream switching behavior, feel free to use `mergeMap`, `switchMap` or `exhaustMap` in your worker if
  the input stream outputs multiple items that generate their own stream of results
- Built in interfaces for handling [`Transferable`](https://developer.mozilla.org/en-US/docs/Web/API/Transferable) parts
  of message payloads so large binaries can transferred efficiently without copying - See [Transferable](#transferable)
  section for usage
- Automatic destruction of worker on unsubscription of output stream, this allows for smart cancelling of computation
  using `switchMap` operator, or parallelisation of computation with `mergeMap`
- [Worker Pool strategy](#worker-pool-strategy) - maximise the throughput of units of work by utilising all cores on the host machine

## Demo
https://cloudnc.github.io/observable-webworker

## Tutorial
https://dev.to/zakhenry/observable-webworkers-with-angular-8-4k6

## Install

Install the [npm package](https://www.npmjs.com/package/observable-webworker): `observable-webworker`

```sh
# with npm
npm install observable-webworker
# or with yarn
yarn add observable-webworker
```

## Usage

### Quickstart

#### Main Thread

```ts
// src/readme/hello.ts

import { fromWorker } from 'observable-webworker';
import { of } from 'rxjs';

const input$ = of('Hello from main thread');

fromWorker<string, string>(() => new Worker('./hello.worker', { type: 'module' }), input$).subscribe(message => {
  console.log(message); // Outputs 'Hello from webworker'
});

```

#### Worker Thread

```ts
// src/readme/hello.worker.ts

import { DoWork, ObservableWorker } from 'observable-webworker';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@ObservableWorker()
export class HelloWorker implements DoWork<string, string> {
  public work(input$: Observable<string>): Observable<string> {
    return input$.pipe(
      map(message => {
        console.log(message); // outputs 'Hello from main thread'
        return `Hello from webworker`;
      }),
    );
  }
}

```

##### Important Note
You **must** export your worker class (`export class ...`) from the file if you're using a minifier. If you don't, your 
class will be removed from the bundle, causing your worker to do nothing! 
 
You'll probably need to export the class anyway as you are unit testing it right?!

##### Don't like decorators? Don't use 'em!

If decorators is not something you use regularly and prefer direct functions, simply
use the `runWorker` function instead.

```ts
// src/readme/hello-no-decorator.worker.ts#L5-L16

class HelloWorker implements DoWork<string, string> {
  public work(input$: Observable<string>): Observable<string> {
    return input$.pipe(
      map(message => {
        console.log(message); // outputs 'Hello from main thread'
        return `Hello from webworker`;
      }),
    );
  }
}

runWorker(HelloWorker);
```

## Transferable

If either your input or output (or both!) streams are passing large messages to or from the worker, it is highly
recommended to use message types that implement the [Transferable](https://developer.mozilla.org/en-US/docs/Web/API/Transferable)
interface (`ArrayBuffer`, `MessagePort`, `ImageBitmap`).

Bear in mind that when transferring a message to a webworker that the main thread relinquishes ownership of the data.

Recommended reading:

- https://developer.mozilla.org/en-US/docs/Web/API/Transferable
- https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage

To use `Transferable`s with observable-worker, a slightly more complex interface is provided for both sides of the
main/worker thread.

If the main thread is transferring `Transferable`s _to the worker_, simply add a callback to the `fromWorker` function
call to select which elements of the input stream are transferable.

<!-- prettier-ignore -->
```ts
// src/readme/transferable.main.ts#L7-L11

return fromWorker<ArrayBuffer, string>(
  () => new Worker('./transferable.worker', { type: 'module' }),
  input$,
  input => [input],
);
```

If the worker is transferring `Transferable`s _to the main thread_ simply implement `DoTransferableWork`, which will
require you to add an additional method `selectTransferables?(output: O): Transferable[];` which you implement to select
which elements of the output object are `Transferable`.

Both strategies are compatible with each other, so if for example you're computing the hash of a large `ArrayBuffer` in
a worker, you would only need to use add the transferable selector callback in the main thread in order to mark the
`ArrayBuffer` as being transferable in the input. The library will handle the rest, and you can just use `DoWork` in the
worker thread, as the return type `string` is not `Transferable`.

## Worker Pool Strategy

If you have a large amount of work that needs to be done, you can use the `fromWorkerPool` function to automatically 
manage a pool of workers to allow true concurrency of work, distributed evenly across all available cores.

The worker pool strategy has the following features
* Work can be provided as either `Observable`, `Array`, or `Iterable`
* Concurrency is limited to `navigation.hardwareConcurrency - 1` to keep the main core free.
  * This is a configurable option if you know you already have other workers running
* Workers are only created when there is need for them (work is available)
* Workers are terminated when there is no more work, freeing up threads for other processes
  * for `Observable`, work is considered remaining while the observable is not completed
  * for `Array`, work remains while there are items in the array
  * for `Iterable`, work remains while the iterator is not `result.done` 
* Workers are kept running while work remains, preventing unnecessary downloading of the worker script
* Custom observable flattening operator can be passed, allowing for custom behaviour such as correlating the output 
order with input order
  * default operator is `mergeAll()`, which means the output from the webworker(s) is output as soon as available

  
### Example

In this simple example, we have a function that receives an array of files and returns an observable of the SHA-256 hex
hashes of those files. For simplicity we're passing the primitives back and forth, however in reality you are likely to 
want to construct your own interface to define the messages being passed to and from the worker.

#### Main Thread

```ts
// src/readme/worker-pool.main.ts

import { Observable } from 'rxjs';
import { fromWorkerPool } from 'observable-webworker';

export function computeHashes(files: File[]): Observable<string> {
  return fromWorkerPool<File, string>(() => new Worker('./worker-pool-hash.worker', { type: 'module' }), files);
}

```

#### Worker Thread

```ts
// src/readme/worker-pool-hash.worker.ts

import * as md5 from 'js-md5';
import { DoWorkUnit, ObservableWorker } from 'observable-webworker';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@ObservableWorker()
export class WorkerPoolHashWorker implements DoWorkUnit<File, string> {
  public workUnit(input: File): Observable<string> {
    return this.readFileAsArrayBuffer(input).pipe(map(arrayBuffer => md5(arrayBuffer)));
  }

  private readFileAsArrayBuffer(blob: Blob): Observable<ArrayBuffer> {
    return new Observable(observer => {
      if (!(blob instanceof Blob)) {
        observer.error(new Error('`blob` must be an instance of File or Blob.'));
        return;
      }

      const reader = new FileReader();

      reader.onerror = err => observer.error(err);
      reader.onload = () => observer.next(reader.result as ArrayBuffer);
      reader.onloadend = () => observer.complete();

      reader.readAsArrayBuffer(blob);

      return () => reader.abort();
    });
  }
}

```

Note here that the worker class `implements DoWorkUnit<File, string>`. This is different to before where we implemented
`DoWork` which had the slightly more complex signature of inputting an observable and outputting one.

If using the `fromWorkerPool` strategy, you must only implement `DoWorkUnit` as it relies on the completion of the 
returned observable to indicate that the unit of work is finished processing.
