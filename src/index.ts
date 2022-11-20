export * from './eventStreamReader.js';
export * from './eventStreamParser.js';
export * from './BaseEventSource.js';
export * from './node/EventSource.js';

export {
  EventSource as EventSourceUndici,
  EventSourceInitDict as EventSourceInitDictUndici,
} from './undici/EventSource.js';
