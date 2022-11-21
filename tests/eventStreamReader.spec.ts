import { test, expect } from 'vitest';
import { createReadStream } from 'node:fs';
import { eventStreamReader } from '../src/eventStreamReader';
import { full } from './fixtures/files';

test('eventStreamReader - test file', async () => {
  const stream = createReadStream(full, {
    encoding: 'utf8',
  });

  const events = [];
  for await (const event of eventStreamReader(stream)) {
    events.push(event);
    if (events.length === 2400) {
      break;
    }
  }

  expect(events.length).toBe(2400);
});
