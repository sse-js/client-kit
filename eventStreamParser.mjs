import {Transform} from 'node:stream';

const BOM = 0xfeff;
const LF = 0x000a;
const CR = 0x000d;
const SPACE = 0x0020;
const COLON = 0x003a;

export const RAW_DATA_SYMBOL = Symbol('RAW_DATA_SYMBOL');

export default function eventStreamParser() {
  let state = 'stream';

  let event = {};
  let comment = '';
  let field_name = '';
  let field_value = '';

  const transformer = new Transform({
    readableObjectMode: true,
    writableObjectMode: false,
    transform(data, encoding, callback) {
      data = data.toString('utf8');
      const cursor = data[Symbol.iterator]();
      let value;
      let looks = [];

      function lookNext(ignoreIfFn) {
        next();

        if (!ignoreIfFn(value)) {
          looks.push(value);
        }
      }

      function next() {
        if (looks.length) {
          value = looks.shift();
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
              this.push(event);
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
              if (event[RAW_DATA_SYMBOL]) event[RAW_DATA_SYMBOL] += field_name;
              else event[RAW_DATA_SYMBOL] = field_name;
              field_name = '';
              field_value = '';
              state = 'event';
            } else field_name += char;
            break;
          case 'field_value':
            if (isLF()) {
              if (event[field_name]) event[field_name] += field_value;
              else event[field_name] = field_value;
              field_name = '';
              field_value = '';
              state = 'event';
            } else field_value += char;
        }
      }

      callback();
    },
  });

  return transformer;
}
