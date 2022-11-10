# EventStream

Support Parse / Read a `text/event-stream` stream compatible with `EventSource` Server Sent Events

https://html.spec.whatwg.org/multipage/server-sent-events.html

```js
import eventStreamReader from './eventStreamReader.mjs';

// create stream variable
// const stream = createReadStream('./test.txt', {encoding: 'utf8'}); // from file
//
// import https from 'node:https';
// import {once} from 'node:https';
// const stream = https.request('url'); // from SSE api
// const [response] = await once(request, 'response');
// response.setEncoding('utf8');

for await (const events of eventStreamReader(stream)) {
  for (const event of events) {
    console.log(event);
  }
}
```
