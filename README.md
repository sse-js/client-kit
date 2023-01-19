# sse-js/client-kit

Support Parse / Read a `text/event-stream` stream compatible with `EventSource` Server Sent Events.  
Provide implementations of `EventSource` for Node.js.

- One native (`node:http` / `node:https`) under `Node` namespace
- One relying on [undici](https://undici.nodejs.org/#/) under `Undici` namespace (optional peerDeps)

The idea of this lib is to provide the most compliant spec possible implementation of how to parse `text/event-stream`
and `EventSource` api.

<https://html.spec.whatwg.org/multipage/server-sent-events.html>

- [How to Install](#how-to-install)
- [How to Use](#how-to-use)
    - [EventSource (node native)](#eventsource-node-native)
    - [EventSource (undici)](#eventsource-undici)
    - [Async Generator](#async-generator)
    - [Stream API](#stream-api)
    - [Callback API](#callback-api)
- [How to Extend](#how-to-extend)

## How to Install

```
#.npmrc (optional, fallback on npm)
@sse-js:registry=https://npm.pkg.github.com/
```

```
npm i @sse-js/eventsource
```

## How to Use

### EventSource (node native)

Possibles imports :

```js
import { EventSource } from '@sse-js/client-kit';
// or
import { EventSource } from '@sse-js/client-kit/Node';
// or
import { Node } from '@sse-js/client-kit';

const { EventSource } = Node;
```

Possibles init :

```js
// simple
const es = new EventSource('<sse-endpoint>');

// under Authorization guard
const es = new EventSource('<sse-endpoint>', {
  headers: {
    Authorization: 'Bearer <token>',
  },
});
```

See <https://nodejs.org/docs/latest-v16.x/api/https.html#httpsrequestoptions-callback> for options you can pass as
second argument

Possibles usages :

```text
event: add
data: 73857293

event: remove
data: 2153

event: add
data: 113411


```

```js
es.addEventListener('error', console.error);
es.addEventListener('message', message => {
  console.log(message);
});
es.addEventListener('add', addHandler);
es.addEventListener('remove', removeHandler);

// or

es.onerror = console.error;
es.message = console.log;
```

### EventSource (undici)

Possibles imports :

```js
import { EventSource } from '@sse-js/client-kit/Undici';
// or
import { Undici } from '@sse-js/client-kit';

const { EventSource } = Undici;
```

Possibles init :

```js
// simple
const es = new EventSource('<sse-endpoint>');

// under Authorization guard
const es = new EventSource('<sse-endpoint>', {
  headers: {
    Authorization: 'Bearer <token>',
  },
});
```

See <https://undici.nodejs.org/#/docs/api/Dispatcher?id=parameter-requestoptions> for options you can pass as second
argument

Possibles usages :

```text
event: add
data: 73857293

event: remove
data: 2153

event: add
data: 113411


```

```js
es.addEventListener('error', console.error);
es.addEventListener('message', message => {
  console.log(message);
});
es.addEventListener('add', addHandler);
es.addEventListener('remove', removeHandler);

// or

es.onerror = console.error;
es.message = console.log;
```

### Async Generator

```js
// import
import { eventStreamReader } from '@sse-js/client-kit';
// or
import { eventStreamReader } from '@sse-js/client-kit/Reader';
// or
import { Reader } from '@sse-js/client-kit';

const { eventStreamReader } = Reader;

// any Readable Stream `text/event-stream` (utf8)
// from file
const stream = createReadStream('./test.txt', { encoding: 'utf8' });
// from network
const stream = await new Promise((resolve, reject) => {
  https.get('<sse-endpoint>', { headers: EVENT_STREAM_HEADERS }, response => {
    if (response.statusCode !== 200 && response.headers['content-type'] !== 'text/event-stream') {
      const error = new Error('invalid response');
      error.response = response;
      response.destroy();
      
      reject(error);
    }
    
    res.setEncoding('utf8');
    resolve(response);
  });
});

// consume it
for await (const event of eventStreamReader(stream)) {
  console.log(event);
}

// also support AbortSignal
const ac = new AbortController();
setTimeout(() => ac.abort(), 1000 * 60);

for await (const event of eventStreamReader(stream, ac.signal)) {
  console.log(event);
}
```

### Stream API

```js
// import
import { createEventStreamTransform } from '@sse-js/client-kit/Parser';
// or
import { Parser } from '@sse-js/client-kit';

const { createEventStreamTransform } = Parser;

// any Readable Stream `text/event-stream` (utf8)
const stream = createReadStream('./test.txt', { encoding: 'utf8' });

// prepare transformer
const transformer = createEventStreamTransform();

// pipe it
const eventStream = stream.pipe(transformer);

// consume it
eventStream.on('error', console.error);
eventStream.on('data', event => {
  console.log(event);
});
```

### Callback API

```js
// import
import { createParser } from '@sse-js/client-kit/Parser';
// or
import { Parser } from '@sse-js/client-kit';

const { createParser } = Parser;

// any source
import { open } from 'node:fs/promises';

const parser = createParser();
const file = await open('./test.txt');
for await (const line of file.readLines()) {
  parser(line, event => {
    console.log(event);
  });
}
```

## How to Extend

This package give an implementation of EventSource based on nodejs http client, another based on Undici.
Theses 2 implementation have in common `BaseEventSource`.

So if you want have `EventSource` implementation on top of another http client, you can extend `BaseEventSource`.

[BaseEventSource.ts](./src/BaseEventSource.ts)

<script type="application/javascript">
    // javascript is executed on doc page rendering the readme
    // javascript is not executed on readme rendering in repo
    document.querySelector('a[href="./src/BaseEventSource.ts"]')?.remove();
    document.write(`<a href="./classes/BaseEventSource.BaseEventSource.html">Find the implementation guide here</a>`);
</script>
