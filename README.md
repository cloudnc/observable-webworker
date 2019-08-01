# ObservableWebWorker

Simple API for using [web workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) with [RxJS](https://rxjs-dev.firebaseapp.com/guide/overview) observables

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
- Automatic destruction of worker on unsubscription of output stream, this allows for smart cancelling of computation
  using `switchMap` operator, or parallelisation of computation with `mergeMap`

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
