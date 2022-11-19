import type { IncomingHttpHeaders } from 'node:http';
import type { IEvent, TransformParser } from './eventStreamParser.js';

export enum ReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSED = 2,
}

export const EVENT_STREAM_HEADERS = Object.freeze({
  'Cache-Control': 'no-cache',
  Accept: 'text/event-stream',
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
  public get readyState(): void {
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
  public close(): void {
    this._readyState = ReadyState.CLOSED;
  }

  // Implementation helpers, should not override
  protected isValidResponse(response: {
    statusCode?: number;
    headers?: IncomingHttpHeaders;
  }): boolean {
    return (
      response.statusCode === 200 ||
      response.headers?.['Content-Type'] !== 'text/event-stream'
    );
  }

  protected handleInvalidResponse(): void {
    const error = new Error();
    const event = new Event('error');

    // @ts-expect-error
    event.error = error;
    // @ts-expect-error
    error.response = response;

    this._readyState = ReadyState.CLOSED;
    this.dispatchEvent(event);
  }

  protected signalOpen(): void {
    this._readyState = ReadyState.OPEN;
    const event = new Event('open');
    this.dispatchEvent(event);
  }

  protected signalError(error: Error): void {
    const event = new Event('error');
    // @ts-expect-error
    event.error = error;
    this._readyState = ReadyState.CLOSED;
    this.dispatchEvent(event);
  }

  protected signalMessage = (_event: IEvent): void => {
    const message = new Event('message');
    Object.assign(message, _event);
    this.dispatchEvent(message);

    this.signalEvent(_event);
  };

  protected signalEvent = (_event: IEvent): void => {
    if (_event.event !== undefined) {
      const event = new Event(_event.event);
      Object.assign(event, _event);
      this.dispatchEvent(event);
    }
  };

  protected initStreamAdaptor(
    stream: TransformParser,
    onErrorCleanUp: () => void,
  ): void {
    stream.on('error', error => {
      this.signalError(error);

      onErrorCleanUp();
    });

    stream.on('data', this.signalMessage);
  }
}
