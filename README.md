# ObservableWebWorker

Simple API for using web workers with rxjs

[![npm version](https://badge.fury.io/js/observable-webworker.svg)](https://www.npmjs.com/package/observable-webworker)
[![Build Status](https://travis-ci.org/cloudnc/observable-webworker.svg?branch=master)](https://travis-ci.org/cloudnc/observable-webworker)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](https://commitizen.github.io/cz-cli/)

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
import { fromWorker } from 'observable-webworker';
import { of } from 'rxjs';

const input$ = of('Hello from main thread');

fromWorker<string, string>(() => new Worker('./hello.worker', { type: 'module' }), input$)
  .subscribe(message => {
    console.log(message); // Outputs 'Hello from webworker'
  });
```

#### Worker Thread

```ts
import { DoWork, ObservableWorker } from 'observable-webworker';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@ObservableWorker()
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
```

### Don't like decorators? Don't use 'em!

If decorators is not something you use regularly and prefer direct functions, simply
use the `runWorker` function instead.

```ts
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

Bear in mind that when transfering a message to a webworker that the main thread relinquishes ownership of the data. 

Recommended reading: 
 - https://developer.mozilla.org/en-US/docs/Web/API/Transferable
 - https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage

To use `Transferable`s with observable-worker, a slightly more complex interface is provided:

```ts
export interface GenericWorkerMessage<P = any> {
  payload: P;
  transferables?: Transferable[];
}
```

Additionally, rather than using `fromWorker` on the main thread, you'll use `fromTransferableWorker`, and in the 
webworker you'll implement `DoTransferableWork`.

Both strategies are compatible with each other, so if for example you're computing the hash of a large `ArrayBuffer` in
a worker, you would only need to use `fromTransferableWorker` in the main thread in order to mark the `ArrayBuffer` as 
being transferable in the input. The library will handle the rest, and you can just use `DoWork` in the worker thread 
with the method `work(input$: Observable<ArrayBuffer>): string;` 
