import { createReadStream } from 'fs';
import { createServer } from 'http';
import { test, expect } from 'vitest';
import { ReadyState } from '../../src/BaseEventSource';
import { EventSource } from '../../src/undici/EventSource';

test('EventSource correctly fetchs datas', async () => {
  const server = createServer((req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    console.log('open');

    const testDataStream = createReadStream('./tests/_fixtures/test.txt');
    testDataStream.on('end', () => {
      console.log('ended');
      res.end();
    });
    testDataStream.pipe(res);
  });

  await new Promise<void>((resolve, reject) => {
    server.on('error', reject);
    server.listen(8080, () => {
      resolve();
    });
  });

  await new Promise<void>(resolve => {
    const es = new EventSource('http://localhost:8080/');
    const updates: Event[] = [];
    es.addEventListener('update', event => {
      updates.push(event);
      console.log(updates.length);
    });

    es.addEventListener('error', () => {
      expect(updates.length).toBe(2160);
      es.close();
      expect(es.readyState).toBe(ReadyState.CLOSED);
      resolve();
    });
  });

  return async () => {
    server.close();
  };
});
