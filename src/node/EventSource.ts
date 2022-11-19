import * as http from 'node:http';
import * as https from 'node:https';
import {createEventStreamTransform} from '../eventStreamParser.js';
import {BaseEventSource, EVENT_STREAM_HEADERS} from '../BaseEventSource.js';

/**
 * polyfill of browser EventSource relying on Node EventTarget,
 * Node http/https/http2 api,
 * and reader-parser of this package
 */
export class EventSource extends BaseEventSource {
  constructor(
    url: string,
    eventSourceInitDict: http.RequestOptions | https.RequestOptions = {},
  ) {
    super(url);

    if (!eventSourceInitDict.headers) eventSourceInitDict.headers = {};
    Object.assign(eventSourceInitDict.headers, EVENT_STREAM_HEADERS);

    const wg_url = new URL(url);
    this.#request = (wg_url.protocol === 'https:' ? https : http).request(
      url,
      eventSourceInitDict,
      response => {
        if (!this.isValidResponse(response)) {
          this.handleInvalidResponse();
          response.destroy();
          return;
        }

        this.signalOpen();
        const stream = response.pipe(createEventStreamTransform());

        this.initStreamAdaptor(stream, () => {
          this.#request.destroy();
          response.destroy();
        });
      },
    );
  }

  public close() {
    this.#request.destroy();
    super.close();
  }

  // implementation
  #request: http.ClientRequest;
}
