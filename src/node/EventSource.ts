import * as http from 'node:http';
import * as https from 'node:https';
import { createEventStreamTransform } from '../eventStreamParser.js';
import { BaseEventSource, EVENT_STREAM_HEADERS } from '../BaseEventSource.js';

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

    if (eventSourceInitDict.headers == null) eventSourceInitDict.headers = {};
    Object.assign(eventSourceInitDict.headers, EVENT_STREAM_HEADERS);

    const wgUrl = new URL(url);
    this.#request = (wgUrl.protocol === 'https:' ? https : http).request(
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

  public close(): void {
    this.#request.destroy();
    super.close();
  }

  // implementation
  #request: http.ClientRequest;
}
