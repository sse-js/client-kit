import { Transform } from 'node:stream';

const BOM = 0xfeff;
const LF = 0x000a;
const CR = 0x000d;
const SPACE = 0x0020;
const COLON = 0x003a;

/**
 * Event type push by {@link createParser}
 */
export type IEvent = {
  /**
   * event field (name)
   */
  event?: string;
  /**
   * data field
   */
  data?: string;
  /**
   * comments in event
   */
  comments?: string[];
} & Record<string, string>; // record for any not standard event fields

/**
 * Build a callable parser (agnostic usage) manage his internal state for successive chunks call.
 *
 * call it with data chunk string, will call back for each parsed event as {@link IEvent} object
 *
 * @return a function which take a chunk string as first argument and a callback as second argument
 *
 * @example
 * ```ts
 *   const parser = createParser();
 *
 *   return new Transform({
 *     writableObjectMode: false,
 *     readableObjectMode: true,
 *     transform(_data: Buffer, encoding, callback) {
 *       const data = _data.toString('utf8');
 *
 *       parser(data, event => this.push(event));
 *
 *       callback();
 *     },
 *   });
 * ```
 */
export function createParser(): (
  data: string,
  callback: (event: IEvent) => void,
) => void {
  let state = 'stream';

  let event: IEvent = {};
  let comment = '';
  let fieldName = '';
  let fieldValue = '';

  return (data: string, callback: (event: IEvent) => void) => {
    const cursor = data[Symbol.iterator]();
    let value: IteratorResult<string> = { done: false, value: '' };
    const looks: IteratorResult<string>[] = [];

    function lookNext(
      ignoreIfFn: (v: IteratorResult<string>) => boolean,
    ): void {
      next();

      if (value.value === undefined) return;

      if (!ignoreIfFn(value)) {
        looks.push(value);
      }
    }

    function next(): boolean {
      if (looks.length > 0) {
        value = looks.shift() as IteratorResult<string>;
        return value.done ?? false;
      }

      value = cursor.next();
      return value.done ?? false;
    }

    while (!next()) {
      const char = value.value;
      const charCode = char.codePointAt(0);

      function isLF(): boolean {
        if (charCode === LF) return true;
        if (charCode === CR) {
          lookNext(c => c.value.codePointAt(0) === LF);
          return true;
        }

        return false;
      }

      switch (state) {
        case 'stream':
          state = 'event';
          if (charCode === BOM) break;
        // tslint:disable-next-line: no-fallthrough --> intentional fallthrough
        case 'event':
          if (isLF()) {
            callback(event);
            event = {};
          } else if (charCode === COLON) {
            state = 'comment';
            comment = '';
          } else {
            state = 'field';
            fieldName = char;
            fieldValue = '';
          }
          break;
        case 'comment':
          if (isLF()) {
            if (event.comments === undefined) {
              event.comments = [];
            }
            event.comments.push(comment);
            comment = '';
            state = 'event';
          } else {
            comment += char;
          }
          break;
        case 'field':
          if (charCode === COLON) {
            lookNext(c => c.value.codePointAt(0) === SPACE);
            state = 'field_value';
          } else if (isLF()) {
            if (event[fieldName] !== undefined) event[fieldName] += '\n';
            else event[fieldName] = '';
            fieldName = '';
            fieldValue = '';
            state = 'event';
          } else fieldName += char;
          break;
        case 'field_value':
          if (isLF()) {
            if (event[fieldName] !== undefined)
              event[fieldName] += '\n' + fieldValue;
            else event[fieldName] = fieldValue;
            fieldName = '';
            fieldValue = '';
            state = 'event';
          } else fieldValue += char;
      }
    }
  };
}

export type TransformParser = Transform & {
  on: (eventName: 'data', callback: (event: IEvent) => void) => TransformParser;
};

/**
 * create a parser with {@link createParser} and return a Transform stream, push event on parser callback
 *
 * @return Transform stream which output objects on data events
 *
 * @example
 * ```ts
 * // const readable = // some readable stream with text/event-stream format
 * const transformer = createEventStreamTransform();
 *
 * transformer.on('data', event => console.log(event));
 * ```
 */
export function createEventStreamTransform(): TransformParser {
  const parser = createParser();

  return new Transform({
    writableObjectMode: false, // input buffer / string
    readableObjectMode: true, // output IEvent
    transform(this: Transform, _data: Buffer, encoding, callback) {
      const data = _data.toString('utf8');

      parser(data, event => this.push(event));

      callback();
    },
  });
}
