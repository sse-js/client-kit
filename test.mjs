import {createReadStream} from 'node:fs';
import eventStreamReader from './eventStreamReader.mjs';

const stream = createReadStream('./test.txt', {encoding: 'utf8'});

for await (const event of eventStreamReader(stream)) {
  console.log(event);
}
