import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'url';

const file = fileURLToPath(import.meta.url);
const dir = dirname(file);

export const full = resolve(dir, 'test.txt');
export const onlyEvent = resolve(dir, 'only-event.txt');
export const onlyComment = resolve(dir, 'only-comment.txt');
export const whatWgExample1 = resolve(dir, 'whatwg-example-1.txt');
export const whatWgExample2 = resolve(dir, 'whatwg-example-2.txt');
export const eventData = resolve(dir, 'event-data.txt');
export const eventDataComments = resolve(dir, 'event-data-comments.txt');
