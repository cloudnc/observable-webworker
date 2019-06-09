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

```src/readme/hello.ts

```

```src/readme/hello.worker.ts

```

### Don't like decorators? Don't use em!

If decorators is not something you use regularly and prefer direct functions, simply
use the `runWorker` function instead.

```src/readme/hello-no-decorator.worker.ts#L4-L20

```
