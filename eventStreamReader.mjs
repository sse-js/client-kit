import {on} from 'node:events';
import eventStreamParser from './eventStreamParser.mjs';

export default async function* eventStreamReader(stream) {
  const parser = eventStreamParser();

  for await (const data of on(stream, 'data')) {
    for (const d of data) {
      process.nextTick(() => parser.emit('consume', d));
    }

    for await (const event of on(parser, 'event')) {
      yield * event;
    }
  }
}
