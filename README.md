# EventStream

Support Parse / Read a `text/event-stream` stream compatible with `EventSource` Server Sent Events

https://html.spec.whatwg.org/multipage/server-sent-events.html

```js
import eventStreamReader from './eventStreamReader.js';

// create stream variable
// const stream = createReadStream('./test.txt', {encoding: 'utf8'}); // from file
//
// import https from 'node:https';
// import {once} from 'node:https';
// const request = https.request('url'); // from SSE api
// const [response] = await once(request, 'response');
// response.setEncoding('utf8');
// const stream = response;

for await (const event of eventStreamReader(stream)) {
  console.log(event);
}
```
