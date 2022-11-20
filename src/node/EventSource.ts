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
  constructor(url: string, eventSourceInitDict: https.RequestOptions = {}) {
    super(url);

    if (eventSourceInitDict.headers === undefined)
      eventSourceInitDict.headers = {};
    Object.assign(eventSourceInitDict.headers, EVENT_STREAM_HEADERS);

    const wgUrl = new URL(url);
    this.#request = (wgUrl.protocol === 'https:' ? https : http).request(
      url,
      eventSourceInitDict,
      response => {
        this.#response = response;

        if (!this.isValidResponse(response)) {
          this.handleInvalidResponse();
          this.cleaning();
          return;
        }

        this.signalOpen();

        const stream = response.pipe(createEventStreamTransform());
        this.initStreamAdaptor(stream, this.cleaning);
      },
    );
  }

  // implementation
  #request?: http.ClientRequest;
  #response?: http.IncomingMessage;

  protected readonly cleaning = (): void => {
    this.#response?.destroy();
    this.#request?.destroy();

    this.#response = undefined;
    this.#request = undefined;
  };
}
