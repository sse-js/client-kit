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

    if (eventSourceInitDict.headers === undefined)
      eventSourceInitDict.headers = {};

    // @ts-expect-error
    Object.assign(eventSourceInitDict.headers, EVENT_STREAM_HEADERS);

    undici
      .request(url, eventSourceInitDict)
      .then(responseData => {
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
      .catch(this.signalError);
  }

  // implementation
  #responseBody?: BodyReadable;

  protected readonly cleaning = (): void => {
    this.#responseBody?.destroy();
    this.#responseBody = undefined;
  };
}
