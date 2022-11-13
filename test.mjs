import {createReadStream} from 'node:fs';
import eventStreamReader from './eventStreamReader.mjs';

const stream = createReadStream('./test.txt', {encoding: 'utf8'});

for await (const events of eventStreamReader(stream)) {
  for (const event of events) {
    console.log(event);
  }
}
