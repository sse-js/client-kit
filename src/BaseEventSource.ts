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

/**
 * Base class for EventSource implementation
 *
 * Implement BaseSource 101:
 *
 * - extends this class
 * - constructor(url, eventSourceInitDict) :
 *   - take url as first argument
 *   - an eventSourceInitDict as second argument, for request options
 *   - merge `EVENT_STREAM_HEADERS` {@link EVENT_STREAM_HEADERS} in `eventSourceInitDict.headers`
 *   - run the request
 *   - on response :
 *     - store resources to clean later
 *     - use {@link BaseEventSource.isValidResponse}
 *       - if not valid call {@link BaseEventSource.handleInvalidResponse} and cleanup opened resources (request / response)
 *       - if valid
 *         - {@link BaseEventSource.signalOpen}
 *         - Adapt the response to the EventSource api
 *         - Your response body should be a stream (lazyness fetching / parsing / transform)
 *         - `const stream = response.pipe(createEventStreamTransform())` {@link Parser:createEventStreamTransform}
 *         - `this.initStreamAdaptor(stream, this.cleaning)` {@link BaseEventSource.initStreamAdaptor}
 * - cleaning()
 *   clean resources stored and unassign them
 *
 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html#the-eventsource-interface for the spec
 *
 * Note for reader on typedoc, activate Protected member visibility, by default only Inherited is selected
 */
export abstract class BaseEventSource extends EventTarget {
  //
  // Common implementation of EventSource
  //

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
  public get readyState(): number | undefined {
    return this._readyState;
  }

  // networking
  public onopen: ((event: Event) => void) | undefined;
  public onmessage: ((event: Event) => void) | undefined;
  public onerror: ((event: Event) => void) | undefined;

  public close(): void {
    this.cleaning();
    this._readyState = ReadyState.CLOSED;
  }

  /**
   * MUST be implemented by child class
   */
  protected abstract init(url: string): void;

  /**
   * MUST be implemented by child class
   *
   * @example
   * ```ts
   * protected cleaning() {
   *   // clean resources
   *   // ex
   *   this.#request?.destroy();
   *   this.#request = undefined;
   * }
   * ```
   */
  protected abstract cleaning(): void;

  //
  // Implementation helpers, should not override
  //

  /**
   * Check if response 200 or Content-Type is text/event-stream
   * @param response
   * @protected
   */
  protected isValidResponse(response: {
    statusCode?: number;
    headers?: IncomingHttpHeaders;
  }): boolean {
    return (
      response.statusCode === 200 ||
      response.headers?.['Content-Type'] !== 'text/event-stream'
    );
  }

  /**
   * build an error attach to an event error and dispatch the event
   * @protected
   */
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

  /**
   * Dispatch open event
   * @protected
   */
  protected signalOpen(): void {
    this._readyState = ReadyState.OPEN;
    const event = new Event('open');
    this.dispatchEvent(event);
  }

  /**
   * Dispatch an event error
   * @param error
   */
  protected signalError = (error: Error): void => {
    const event = new Event('error');
    // @ts-expect-error
    event.error = error;
    this._readyState = ReadyState.CLOSED;
    this.dispatchEvent(event);
  };

  /**
   * Dispatch a message with an IEvent
   * and try to dispatch named event from message event
   * @param _event
   */
  protected signalMessage = (_event: IEvent): void => {
    const message = new Event('message');
    Object.assign(message, _event);
    this.dispatchEvent(message);

    this.signalEvent(_event);
  };

  /**
   * Check if IEvent is named (prop event: string)
   * Dispatch it
   * @param _event
   */
  protected signalEvent = (_event: IEvent): void => {
    if (_event.event !== undefined) {
      const event = new Event(_event.event);
      Object.assign(event, _event);
      this.dispatchEvent(event);
    }
  };

  /**
   * - listen error on stream to signal in EventTarget way
   * - listen on data on stream to signal it EventTarget way
   *   (message, named event)
   * @param stream
   * @param onErrorCleanUp
   * @protected
   */
  protected initStreamAdaptor(
    stream: TransformParser,
    onErrorCleanUp: () => void,
  ): void {
    stream.on('error', error => {
      this.signalError(error);
      this.init(this.url);
    });

    stream.on('data', this.signalMessage);
  }
}
