import * as undici from 'undici';
import type { Dispatcher } from 'undici';
import type BodyReadable from 'undici/types/readable';
import { BaseEventSource, EVENT_STREAM_HEADERS } from '../BaseEventSource.js';
import { createEventStreamTransform } from '../eventStreamParser.js';

export type EventSourceInitDict = { dispatcher?: Dispatcher } & Omit<
  Dispatcher.RequestOptions,
  'origin' | 'path' | 'method'
> &
  Partial<Pick<Dispatcher.RequestOptions, 'method'>>;

/**
 * polyfill of browser EventSource relying on Node EventTarget,
 * undici api,
 * and reader-parser of this package
 */
export class EventSource extends BaseEventSource {
  constructor(url: string, eventSourceInitDict: EventSourceInitDict = {}) {
    super(url);
    this.#eventSourceInitDict = eventSourceInitDict;
    this.init(url);
  }

  protected init(url: string): void {
    if (this.#eventSourceInitDict.headers === undefined)
      this.#eventSourceInitDict.headers = {};

    // @ts-expect-error
    Object.assign(this.#eventSourceInitDict.headers, EVENT_STREAM_HEADERS);

    undici
      .request(url, this.#eventSourceInitDict)
      .then(responseData => {
        responseData.body.on('end', () => {
          this.signalError(new Error('Connection closed'));
          setTimeout(() => this.init(url), this.#reconnectionTime);
        });
        responseData.body.on('error', () => {
          this.signalError(new Error('Connection closed'));
          setTimeout(() => this.init(url), this.#reconnectionTime);
        });

        this.#responseBody = responseData.body;

        if (!this.isValidResponse(responseData)) {
          this.handleInvalidResponse();
          this.cleaning();
          return;
        }

        this.signalOpen();

        const stream = responseData.body.pipe(createEventStreamTransform());
        this.initStreamAdaptor(stream, this.cleaning);
      })
      .catch(error => {
        this.signalError(error);
        setTimeout(() => this.init(url), this.#reconnectionTime);
      });
  }

  // implementation
  #reconnectionTime: number = 3000;
  #eventSourceInitDict: EventSourceInitDict;
  #responseBody?: BodyReadable;

  protected readonly cleaning = (): void => {
    this.#responseBody?.destroy();
    this.#responseBody = undefined;
  };
}
