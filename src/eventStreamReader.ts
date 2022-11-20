import { on } from 'node:events';
import type { Readable } from 'node:stream';

import { createEventStreamTransform } from './eventStreamParser.js';
import type { IEvent } from './eventStreamParser.js';

/**
 * return an AsyncGenerator on event 'data' of string passed in argument
 * rely on {@link Parser:createEventStreamTransform} and `node:events` `on` api
 *
 * @param stream A readable stream which output string or buffer of utf8 string
 *
 * @example
 * ```ts
 * import { createReadStream } from 'node:fs';
 * import { eventStreamReader } from './eventStreamReader.js';
 *
 * const stream = createReadStream('./test.txt', { encoding: 'utf8' });
 *
 * for await (const event of eventStreamReader(stream)) {
 *   console.log(event);
 * }
 * ```
 */
export async function* eventStreamReader(
  stream: Readable,
): AsyncGenerator<IEvent, void, void> {
  const transform = createEventStreamTransform();
  stream = stream.pipe(transform);

  for await (const events of on(stream, 'data')) {
    yield* events;
  }
}
