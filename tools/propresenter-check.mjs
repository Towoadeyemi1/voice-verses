// Checks electron/propresenter.js against a stand-in ProPresenter that
// implements the endpoints Voice Verses uses, as documented in ProPresenter's
// API spec (https://openapi.propresenter.com). Run: node tools/propresenter-check.mjs
import { createServer } from 'http';
import assert from 'assert/strict';
import * as pp from '../electron/propresenter.js';

const requests = [];
const messages = [];
let stageMessage = null;

const THEMES = [
  {
    id: { uuid: '', name: 'Church', index: 0 },
    themes: [
      {
        id: { uuid: '', name: 'Scripture', index: 0 },
        slides: [{ id: { uuid: 'AAAA-1111', name: 'Lower Third', index: 0 } }],
      },
    ],
    groups: [
      {
        id: { uuid: '', name: 'Folder', index: 1 },
        themes: [{ id: { uuid: '', name: 'Nested', index: 0 }, slides: [{ id: { uuid: 'BBBB-2222', name: 'Full', index: 0 } }] }],
        groups: [],
      },
    ],
  },
];

const server = createServer(async (req, res) => {
  let body = '';
  for await (const chunk of req) body += chunk;
  const json = body ? JSON.parse(body) : undefined;
  requests.push({ method: req.method, url: req.url, json });
  const send = (status, data) => {
    res.writeHead(status, data === undefined ? {} : { 'content-type': 'application/json' });
    res.end(data === undefined ? undefined : JSON.stringify(data));
  };
  const messageMatch = /^\/v1\/message\/([^/]+)\/(trigger|clear)$/.exec(req.url);

  if (req.method === 'GET' && req.url === '/version') {
    return send(200, { name: 'Booth iMac', platform: 'mac', os_version: '26.0', host_description: 'ProPresenter 21.2', api_version: 'v1' });
  }
  if (req.method === 'GET' && req.url === '/v1/messages') return send(200, messages);
  if (req.method === 'POST' && req.url === '/v1/messages') {
    messages.push({ ...json, id: { ...json.id, uuid: 'MSG-1', index: messages.length } });
    return send(200, messages.at(-1));
  }
  if (req.method === 'GET' && req.url === '/v1/themes') return send(200, THEMES);
  if (messageMatch) {
    const name = decodeURIComponent(messageMatch[1]);
    if (!messages.some((m) => m.id.name === name)) return send(404);
    return send(204);
  }
  if (req.url === '/v1/stage/message') {
    if (req.method === 'PUT') stageMessage = json;
    if (req.method === 'DELETE') stageMessage = null;
    return send(204);
  }
  send(404);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const connection = { host: '127.0.0.1', port: server.address().port };

try {
  // Invalid settings are refused before any request
  await assert.rejects(pp.status({ host: 'evil.example/path', port: 1 }), /computer name or IP/);
  await assert.rejects(pp.status({ host: '127.0.0.1', port: 0 }), /port/);
  assert.equal(requests.length, 0);

  // Not reachable: a readable error, quickly
  await assert.rejects(pp.status({ host: '127.0.0.1', port: 9 }), /not reachable/);

  // First connection: no message yet
  let status = await pp.status(connection);
  assert.deepEqual(status, { name: 'Booth iMac', version: 'ProPresenter 21.2', hasMessage: false, messageReady: false });

  // Sending before the message exists explains what is missing
  await assert.rejects(pp.showVerse(connection, { reference: 'John 3:16', text: 'x', stage: false }), /no message named "Voice Verses"/);

  // Theme slides from nested groups
  const slides = await pp.themeSlides(connection);
  assert.deepEqual(slides.map((s) => s.label), ['Scripture › Lower Third', 'Nested › Full']);

  // Creating the message
  status = await pp.createMessage(connection, slides[0].id);
  assert.equal(status.messageReady, true);
  const created = requests.find((r) => r.method === 'POST' && r.url === '/v1/messages').json;
  assert.equal(created.id.name, 'Voice Verses');
  assert.match(created.message, /\{Verse\}/);
  assert.match(created.message, /\{Reference\}/);
  assert.deepEqual(created.theme, { uuid: 'AAAA-1111', name: 'Lower Third', index: 0 });
  // A second "create" does not duplicate it
  await pp.createMessage(connection, slides[0].id);
  assert.equal(messages.length, 1);

  // Showing a verse fills the tokens; the stage message is optional
  await pp.showVerse(connection, { reference: 'Romans 8:28', text: 'And we know that all things work together for good', stage: false });
  const trigger = requests.at(-1);
  assert.equal(trigger.method, 'POST');
  assert.equal(trigger.url, '/v1/message/Voice%20Verses/trigger');
  assert.deepEqual(trigger.json, [
    { name: 'Verse', text: { text: 'And we know that all things work together for good' } },
    { name: 'Reference', text: { text: 'Romans 8:28' } },
  ]);
  assert.equal(stageMessage, null);

  await pp.showVerse(connection, { reference: 'John 11:35', text: 'Jesus wept.', stage: true });
  assert.equal(stageMessage, 'John 11:35 — Jesus wept.');

  await pp.clear(connection, { stage: true });
  assert.equal(requests.at(-2).url, '/v1/message/Voice%20Verses/clear');
  assert.equal(stageMessage, null);

  console.log('✅ ProPresenter client OK');
} finally {
  server.close();
}
