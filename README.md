# ObservableWebWorker

Simple API for using web workers with rxjs

[![npm version](https://badge.fury.io/js/observable-webworker.svg)](https://www.npmjs.com/package/observable-webworker)
[![Build Status](https://travis-ci.org/cloudnc/observable-webworker.svg?branch=master)](https://travis-ci.org/cloudnc/observable-webworker)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](https://commitizen.github.io/cz-cli/)

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

```ts
// hello.ts
import { fromWorker } from 'observable-webworker';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';

const input$ = of({ payload: 'Hello from main thread' });

fromWorker<string, string>(() => new Worker('./hello.worker', { type: 'module' }), input$)
  .pipe(map(res => res.payload))
  .subscribe(message => {
    console.log(message); // Outputs 'Hello from webworker'
  });
```

```ts
// hello.worker.ts

import { ObservableWorker, DoWork, GenericWorkerMessage } from 'observable-webworker';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@ObservableWorker()
class HelloWorker implements DoWork<string, string> {
  public work(input$: Observable<GenericWorkerMessage<string>>): Observable<GenericWorkerMessage<string>> {
    return input$.pipe(
      map(message => {
        console.log(message); // outputs 'Hello from main thread'
        return {
          payload: `Hello from webworker`,
        };
      }),
    );
  }
}
```

### Don't like decorators? Don't use 'em!

If decorators is not something you use regularly and prefer direct functions, simply
use the `runWorker` function instead.

```ts
import { runWorker, DoWork, GenericWorkerMessage } from 'observable-webworker';

class HelloWorker implements DoWork<string, string> {
  public work(input$: Observable<GenericWorkerMessage<string>>): Observable<GenericWorkerMessage<string>> {
    return input$.pipe(
      map(message => {
        console.log(message); // outputs 'Hello from main thread'
        return {
          payload: `Hello from webworker`,
        };
      }),
    );
  }
}

runWorker(HelloWorker);
```
