import {on} from 'node:events';
import type {Readable} from 'node:stream';

import {createEventStreamTransform} from './eventStreamParser.js';
import type {IEvent} from './eventStreamParser.js';

/**
 * @param stream A readable stream which output string or buffer of utf8 string
 */
export default async function* eventStreamReader(
  stream: Readable,
): AsyncGenerator<IEvent, void, void> {
  const transform = createEventStreamTransform();
  stream = stream.pipe(transform);

  for await (const events of on(stream, 'data')) {
    yield* events;
  }
}
