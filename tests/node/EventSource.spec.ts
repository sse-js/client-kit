import { createReadStream } from 'fs';
import { createServer } from 'http';
import { beforeAll, test, expect } from 'vitest';
import { EventSource } from '../../src/undici/EventSource';

beforeAll(async () => {
  const server = createServer((req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    console.log('request');
    const testDataStream = createReadStream('./tests/_fixtures/test.txt');
    testDataStream.on('end', () => {
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

  // cleanup
  return async () => {
    server.close();
  };
});

test(
  'EventSource correctly fetchs datas',
  async () =>
    await new Promise<void>(resolve => {
      const es = new EventSource('http://localhost:8080');

      es.addEventListener('open', () => {
        console.log('open');
      });

      const updates: Event[] = [];
      es.addEventListener('update', event => {
        updates.push(event);
        console.log(updates.length);
      });

      es.addEventListener('error', () => {
        es.close();
        expect(updates.length).toBe(3);
        resolve();
      });
    }),
  { timeout: 1000000 },
);
