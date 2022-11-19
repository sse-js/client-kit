import { Transform } from 'node:stream';

const BOM = 0xfeff;
const LF = 0x000a;
const CR = 0x000d;
const SPACE = 0x0020;
const COLON = 0x003a;

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
            if (event.comments == null) {
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
  on: (eventName: 'data', callback: (event: IEvent) => void) => Transform;
};

/**
 * @return Transform stream which output objects on data events
 */
export function createEventStreamTransform(): TransformParser {
  const parser = createParser();

  return new Transform({
    writableObjectMode: false, // input buffer / string
    readableObjectMode: true, // output IEvent
    transform(_data: Buffer, encoding, callback) {
      const data = _data.toString('utf8');

      parser(data, event => this.push(event));

      callback();
    },
  });
}
