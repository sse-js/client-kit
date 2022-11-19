import * as undici from 'undici';
import type {Dispatcher} from 'undici';
import type BodyReadable from 'undici/types/readable';
import {BaseEventSource} from '../BaseEventSource';
import {eventStreamParser} from '../eventStreamParser';

export type EventSourceInitDict = {dispatcher?: Dispatcher} & Omit<
  Dispatcher.RequestOptions,
  'origin' | 'path' | 'method'
> &
  Partial<Pick<Dispatcher.RequestOptions, 'method'>>;

export class EventSource extends BaseEventSource {
  constructor(url: string, eventSourceInitDict: EventSourceInitDict = {}) {
    super(url);

    undici.request(url, eventSourceInitDict).then(responseData => {
      if (!this.isValidResponse(responseData)) {
        this.handleInvalidResponse();
        responseData.body.destroy();
        return;
      }

      this.#responseBody = responseData.body;

      this.signalOpen();
      const stream = responseData.body.pipe(eventStreamParser());

      this.initStreamAdaptor(stream, () => responseData.body.destroy());
    });
  }

  public close() {
    this.#responseBody?.destroy();
    super.close();
  }

  // implementation
  #responseBody?: BodyReadable;
}
