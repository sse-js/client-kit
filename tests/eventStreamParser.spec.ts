import { readFile } from 'node:fs/promises';
import { Transform } from 'node:stream';
import { expect, test } from 'vitest';
import {
  createEventStreamTransform,
  createParser,
  IEvent,
} from '../src/eventStreamParser';
import {
  eventData,
  eventDataComments,
  onlyEvent,
  whatWgExample1,
  whatWgExample2,
} from './fixtures/files';

test('createEventStreamTransform returns a transform', async () => {
  const parser = createEventStreamTransform();

  expect(parser).toBeInstanceOf(Transform);
});

test('createParser returns a function', async () => {
  const parser = createParser();

  expect(parser).toBeInstanceOf(Function);
});

test('parse stream with only event', async () => {
  const parser = createParser();
  const content = await readFile(onlyEvent, { encoding: 'utf8' });
  const events: IEvent[] = [];

  parser(content, event => {
    events.push(event);
  });

  expect(events).toStrictEqual([{ event: 'update' }]);
});

test('parse stream with event and data', async () => {
  const parser = createParser();
  const content = await readFile(eventData, { encoding: 'utf8' });
  const events: IEvent[] = [];

  parser(content, event => {
    events.push(event);
  });

  expect(events).toStrictEqual([{ event: 'update', data: 'imma good test' }]);
});

test('parse stream with event and data and comments', async () => {
  const parser = createParser();
  const content = await readFile(eventDataComments, { encoding: 'utf8' });
  const events: IEvent[] = [];

  parser(content, event => {
    events.push(event);
  });

  expect(events).toStrictEqual([
    { comments: [')'], event: 'update', data: 'imma good test' },
    { comments: ['yo', 'onche'] },
  ]);
});

test('parse with empty data', async () => {
  const parser = createParser();
  const content = await readFile(whatWgExample1, { encoding: 'utf8' });
  const events: IEvent[] = [];

  parser(content, event => {
    events.push(event);
  });

  expect(events).toStrictEqual([{ data: '' }, { data: '\n' }]);
});

test('parse ignoring space after colon', async () => {
  const parser = createParser();
  const content = await readFile(whatWgExample2, { encoding: 'utf8' });
  const events: IEvent[] = [];

  parser(content, event => {
    events.push(event);
  });

  expect(events.length).toBe(2);
  expect(events[0]).toStrictEqual(events[1]);
});
