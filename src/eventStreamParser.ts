import {Transform} from 'node:stream';

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

export function createParser() {
  let state = 'stream';

  let event: IEvent = {};
  let comment = '';
  let field_name = '';
  let field_value = '';

  return (data: string, callback: (event: IEvent) => void) => {
    const cursor = data[Symbol.iterator]();
    let value: IteratorResult<string> = {done: false, value: ''};
    let looks: IteratorResult<string>[] = [];

    function lookNext(ignoreIfFn: (v: IteratorResult<string>) => boolean) {
      next();

      if (!ignoreIfFn(value)) {
        looks.push(value);
      }
    }

    function next() {
      if (looks.length) {
        value = looks.shift() as IteratorResult<string>;
        return value.done;
      }

      value = cursor.next();
      return value.done;
    }

    while (!next()) {
      const char = value.value;
      const charCode = char.codePointAt(0);

      function isLF() {
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
        case 'event':
          if (isLF()) {
            callback(event);
            event = {};
          } else if (charCode === COLON) {
            state = 'comment';
            comment = '';
          } else {
            state = 'field';
            field_name = char;
            field_value = '';
          }
          break;
        case 'comment':
          if (isLF()) {
            if (!event.comments) {
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
            if (event[field_name]) event[field_name] += '\n';
            else event[field_name] = '';
            field_name = '';
            field_value = '';
            state = 'event';
          } else field_name += char;
          break;
        case 'field_value':
          if (isLF()) {
            if (event[field_name]) event[field_name] += '\n' + field_value;
            else event[field_name] = field_value;
            field_name = '';
            field_value = '';
            state = 'event';
          } else field_value += char;
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
