import {IncomingMessage} from 'node:http';
import https from 'node:https';
import {once} from 'node:events';
import eventStreamReader from "./eventStreamReader.mjs";

const request = https.request('https://tooting.ch/api/v1/streaming/public', {
  headers: {
    'Cache-Control': 'no-cache',
    'Accept': 'text/event-stream',
    'Connection': 'keep-alive',
    'Host': 'tooting.ch',
    'Cookie': '_mastodon_session=DJd0dWRGv5oi5S%2FA8Ssx76AsY9a9WLbvaG8qkBf9vv5tmRM45vx99N2YmP9y9bHLPxPPBsGpMSJFSMs2iyj3zmh0JcVZuuLlke2rfZuXximnvZr7ZioHuf3jO6bj9T5ULLBsZ40UKvYgMqxO6Q0NH%2FLIYoOEHEr1BtEREyM1g%2Bz2hlo9LU7rblzsZMYakfJIDqza2nPmeLEep1KxU7BJ1CEEO4b4fclKSSX3IyTG1qdbMQGWSdY3T%2F%2FQroCpZZ76d9jYy85AY34rS0Y9ixoFcdAvFaUq2U%2FYrpAaz0fNjFAsts5qm85gS5bnpt6Uk%2BEtqOoMviEoYFm8su4RtiT0A9VTvv%2Br2AObe0vohraHXBdKCwbHNr%2BzrtVjK0azU2XO1cshfhClETIwAkIgW%2BxNnMtw7DDzEBgJROSAt%2Bq1JzWPVPPNtmPs74gOGkfopIH9btzM5gepGuk6M%2FdsbEKPByALzU0ugmrH9eFuVxa9FxFoXWalkN%2Bwz6KY48XW--jBJmDrHjUGP0DlOQ--XWekb4joobmCF9obW3UdjQ%3D%3D',
    'Pragma': 'no-cache',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
  },
}, response => {
  console.log({statusCode: response.statusCode, headers: response.headers});

  process.exit(0);
});

request.on('error', (error) => {
  console.error(error);
  request.end();
})

await new Promise(() => {});

const responses = await once(request, 'response');
/** @type {IncomingMessage} */ const response = responses[0];

console.log({statusCode: response.statusCode, headers: response.headers});

if (response.statusCode < 200 || response.statusCode >= 300) {
  response.destroy();
  request.end();
  throw new Error('invalid response');
}

response.setEncoding('utf8');

for await (const events of eventStreamReader(response)) {
  console.log(events);
}
