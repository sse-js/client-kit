import type {IncomingHttpHeaders} from 'node:http';
import type {IEvent, TransformParser} from './eventStreamParser.js';

export enum ReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSED = 2,
}

export const EVENT_STREAM_HEADERS = Object.freeze({
  ['Cache-Control']: 'no-cache',
  ['Accept']: 'text/event-stream',
});

export abstract class BaseEventSource extends EventTarget {
  protected constructor(url: string) {
    super();

    this.url = url;
  }

  public readonly url: string;

  // ready state
  public static readonly CONNECTING = ReadyState.CONNECTING;
  public static readonly OPEN = ReadyState.OPEN;
  public static readonly CLOSED = ReadyState.CLOSED;
  protected _readyState: number | undefined;
  public get readyState() {
    return this._readyState;
  }

  // networking
  public onopen: ((event: Event) => void) | undefined;
  public onmessage: ((event: Event) => void) | undefined;
  public onerror: ((event: Event) => void) | undefined;

  /**
   * MUST be implemented by child class
   * public close() {
   *   super.close();
   *   // cleanup resources
   *   this.request.destroy();
   * }
   */
  public close() {
    this._readyState = ReadyState.CLOSED;
  }

  // Implementation helpers, should not override
  protected isValidResponse(response: {
    statusCode?: number;
    headers?: IncomingHttpHeaders;
  }) {
    return (
      response.statusCode === 200 ||
      response.headers?.['Content-Type'] !== `text/event-stream`
    );
  }

  protected handleInvalidResponse() {
    const error = new Error();
    const event = new Event('error');

    // @ts-ignore
    event.error = error;
    // @ts-ignore
    error.response = response;

    this._readyState = ReadyState.CLOSED;
    this.dispatchEvent(event);
  }

  protected signalOpen() {
    this._readyState = ReadyState.OPEN;
    const event = new Event('open');
    this.dispatchEvent(event);
  }

  protected signalError(error: Error) {
    const event = new Event('error');
    // @ts-ignore
    event.error = error;
    this._readyState = ReadyState.CLOSED;
    this.dispatchEvent(event);
  }

  protected signalMessage = (_event: IEvent) => {
    const message = new Event('message');
    Object.assign(message, _event);
    this.dispatchEvent(message);

    this.signalEvent(_event);
  };

  protected signalEvent = (_event: IEvent) => {
    if (_event.event) {
      const event = new Event(_event.event);
      Object.assign(event, _event);
      this.dispatchEvent(event);
    }
  };

  protected initStreamAdaptor(
    stream: TransformParser,
    onErrorCleanUp: () => void,
  ) {
    stream.on('error', error => {
      this.signalError(error);

      onErrorCleanUp();
    });

    stream.on('data', this.signalMessage);
  }
}
