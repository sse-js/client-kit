import {on} from 'node:events';
import eventStreamParser from './eventStreamParser.mjs';

export default async function* eventStreamReader(stream) {
  const transform = eventStreamParser();
  stream = stream.pipe(transform);

  for await (const events of on(stream, 'data')) {
    yield* events;
  }
}
