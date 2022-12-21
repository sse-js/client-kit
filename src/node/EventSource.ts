import * as http from 'node:http';
import * as https from 'node:https';
import { createEventStreamTransform } from '../eventStreamParser.js';
import {
  BaseEventSource,
  EVENT_STREAM_HEADERS,
  ReadyState,
} from '../BaseEventSource.js';

/**
 * polyfill of browser EventSource relying on Node EventTarget,
 * Node http/https/http2 api,
 * and reader-parser of this package
 */
export class EventSource extends BaseEventSource {
  constructor(url: string, eventSourceInitDict: https.RequestOptions = {}) {
    super(url);
    this.#eventSourceInitDict = eventSourceInitDict;
    this.init(url);
  }

  protected init(url: string): void {
    if (this.#request !== undefined) {
      this.#request.destroy();
      this.#request = undefined;
    }
    if (this.#eventSourceInitDict.headers === undefined)
      this.#eventSourceInitDict.headers = {};
    Object.assign(this.#eventSourceInitDict.headers, EVENT_STREAM_HEADERS);

    const wgUrl = new URL(url);
    this.#request = (wgUrl.protocol === 'https:' ? https : http)
      .request(wgUrl, this.#eventSourceInitDict, response => {
        this.#response = response;
        if (!this.isValidResponse(response)) {
          this.handleInvalidResponse();
          this.init(url);
          return;
        }

        this.signalOpen();

        const stream = response.pipe(createEventStreamTransform());
        this.initStreamAdaptor(stream, this.cleaning);
      })
      .on('close', () => {
        this.signalError(new Error('Connection closed'));
        setTimeout(() => this.init(url), this.#reconnectionTime);
      })
      .end();
  }

  // implementation
  #reconnectionTime: number = 3000;
  #eventSourceInitDict: https.RequestOptions;
  #request?: http.ClientRequest;
  #response?: http.IncomingMessage;

  protected readonly cleaning = (): void => {
    this.#response?.destroy();
    this.#request?.destroy();

    this.#response = undefined;
    this.#request = undefined;
  };
}
