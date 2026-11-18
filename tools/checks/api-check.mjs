// Checks the local API (electron/api.js) and the Bonjour announcement (electron/mdns.js) in
// plain Node, on a real HTTP server on a free port: pairing, keys and scopes, live commands,
// events over Server-Sent Events and WebSocket, signed webhooks, removing a device, and that
// the API description lists exactly the events in src/core/events.ts. CI CHECK 11:
//   node tools/checks/api-check.mjs
import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as api from '../../electron/api.js';
import { answerPacket, parseQuestions, SERVICE } from '../../electron/mdns.js';
import { bonjourQuery, parseBonjour } from '../../electron/propresenter.js';

let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
};

const dir = mkdtempSync(join(tmpdir(), 'vv-api-'));
const store = join(dir, 'api-devices.json');
const commands = [];
let answerWith = (msg) => ({ ok: true, result: { live: { kind: 'verse', reference: msg.body.reference ?? '' } } });
const spec = {
  openapi: JSON.parse(readFileSync(new URL('../../electron/api-spec/openapi.json', import.meta.url), 'utf8')),
  asyncapi: JSON.parse(readFileSync(new URL('../../electron/api-spec/asyncapi.json', import.meta.url), 'utf8')),
};
await api.init({
  storePath: store,
  version: '9.9.9',
  spec,
  sendCommand: (msg) => {
    commands.push(msg);
    setTimeout(() => api.reply(msg.id, answerWith(msg)), 5);
    return true;
  },
});

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  if (pathname.startsWith('/api')) return void api.handle(req, res, pathname);
  res.writeHead(404).end();
});
server.on('upgrade', (req, socket) => api.upgrade(req, socket).then((ours) => ours || socket.destroy()));
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/api/v1`;

const call = async (path, { method = 'GET', key, body } = {}) => {
  const res = await fetch(base + path, { method, headers: { ...(key ? { authorization: `Bearer ${key}` } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) }, body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not JSON
  }
  return { status: res.status, json, headers: res.headers };
};

// Open to all
const about = await call('');
check('GET /api/v1 says what this is', about.status === 200 && about.json.name === 'Voice Verses' && about.json.api === '1' && about.json.version === '9.9.9');
check('…with CORS for other apps’ pages', about.headers.get('access-control-allow-origin') === '*');
check('the OpenAPI document is served', (await call('/openapi.json')).json?.openapi === '3.1.0');
check('the AsyncAPI document is served', (await call('/asyncapi.json')).json?.asyncapi === '3.0.0');
const pre = await fetch(`${base}/live/take`, { method: 'OPTIONS' });
check('a preflight is answered', pre.status === 204);

// Without a key
check('without a key: 401', (await call('/live')).status === 401);
check('with a made-up key: 401', (await call('/live', { key: 'vv1_nothing' })).status === 401);

// Pairing
check('no code showing: refused', (await call('/pair', { method: 'POST', body: { code: '123456' } })).json?.error?.code === 'no_pairing');
let view = await api.startPairing(['control']);
check('a six-digit code, read always included', /^\d{6}$/.test(view.pairing.code) && view.pairing.scopes.join() === 'read,control');
const wrong = view.pairing.code === '000000' ? '111111' : '000000';
for (let i = 0; i < 4; i++) await call('/pair', { method: 'POST', body: { code: wrong } });
let paired = await call('/pair', { method: 'POST', body: { code: view.pairing.code, name: 'Stream Deck\u0007 in the booth' } });
check('the right code after four wrong ones pairs', paired.status === 201 && /^vv1_[\w-]{40,}$/.test(paired.json.key), JSON.stringify(paired.json));
const controlKey = paired.json.key;
check('…the name is cleaned', paired.json.device.name === 'Stream Deck in the booth');
check('…with the chosen scopes', paired.json.device.scopes.join() === 'read,control');
check('the code works once', (await call('/pair', { method: 'POST', body: { code: view.pairing.code } })).status === 403);
await new Promise((r) => setTimeout(r, 50));
const saved = readFileSync(store, 'utf8');
check('only a hash of the key is saved', !saved.includes(controlKey) && saved.includes(crypto.createHash('sha256').update(controlKey).digest('hex')));

api.resetLimits();
view = await api.startPairing([]);
for (let i = 0; i < 4; i++) await call('/pair', { method: 'POST', body: { code: wrong } });
const fifth = await call('/pair', { method: 'POST', body: { code: wrong } });
check('five wrong codes use the code up', fifth.json?.error?.code === 'code_used_up');
check('…and a sixth try in a minute is refused', (await call('/pair', { method: 'POST', body: { code: view.pairing.code } })).status === 429);
api.resetLimits();
view = await api.startPairing(['read']);
const readKey = (await call('/pair', { method: 'POST', body: { code: view.pairing.code, name: 'Phone' } })).json.key;
check('a read-only device pairs', typeof readKey === 'string');

// Reading
check('GET /me', (await call('/me', { key: readKey })).json?.name === 'Phone');
api.setModules([{ id: 'live', name: 'Live' }]);
check('GET /modules', (await call('/modules', { key: readKey })).json?.modules?.[0]?.id === 'live');

// Commands
const notAllowed = await call('/live/take', { method: 'POST', key: readKey });
check('a read-only device can’t take', notAllowed.status === 403 && /not allowed/.test(notAllowed.json.error.message));
check('show needs a reference', (await call('/live/show', { method: 'POST', key: controlKey, body: {} })).status === 400);
check('a body that isn’t JSON: 400', (await call('/live/show', { method: 'POST', key: controlKey, body: '{oops' })).status === 400);
check('a body too large: 413', (await call('/live/show', { method: 'POST', key: controlKey, body: { reference: 'x'.repeat(70_000) } }).catch(() => ({ status: 413 }))).status === 413);
const shown = await call('/live/show', { method: 'POST', key: controlKey, body: { reference: 'John 3:16' } });
check('show goes to the operator’s window and answers', shown.status === 200 && shown.json.live.reference === 'John 3:16' && commands.at(-1).command === 'live.show' && commands.at(-1).body.reference === 'John 3:16');
answerWith = () => ({ ok: false, status: 409, message: 'Nothing is waiting in Next.' });
const take = await call('/live/take', { method: 'POST', key: controlKey });
check('a refusal comes back in plain words', take.status === 409 && take.json.error.message === 'Nothing is waiting in Next.');
check('an unknown action: 404', (await call('/live/explode', { method: 'POST', key: controlKey })).status === 404);
answerWith = (msg) => ({ ok: true, result: { services: [{ id: 's1', name: 'Sunday', date: msg.body.date }] } });
check('services by date', (await call('/services?date=2026-11-22', { key: readKey })).json?.services?.[0]?.date === '2026-11-22');
check('a bad date: 400', (await call('/services?date=next-sunday', { key: readKey })).status === 400);

// Service packages (1.19.6)
answerWith = (msg) => (msg.command === 'services.receive' ? { ok: true, result: { serviceId: 's9', created: true, songsAdded: 1, warnings: [] } } : { ok: true, result: { package: '1.0', service: { name: 'Sunday', date: '2026-11-22' }, order: [] } });
check('a device without write can’t send a package', (await call('/packages', { method: 'POST', key: controlKey, body: { package: '1.0' } })).status === 403);
api.resetLimits();
view = await api.startPairing(['write']);
const writeKey = (await call('/pair', { method: 'POST', body: { code: view.pairing.code, name: 'CCCG Dashboard' } })).json.key;
const sent = await call('/packages', { method: 'POST', key: writeKey, body: { package: '1.0', service: { name: 'Sunday', date: '2026-11-22' }, songs: [{ title: 'Long', lyrics: 'x'.repeat(200_000) }] } });
check('a device with write sends a package (larger than 64 KB is fine)', sent.status === 201 && sent.json.serviceId === 's9' && commands.at(-1).command === 'services.receive' && commands.at(-1).body.app === 'CCCG Dashboard', JSON.stringify(sent.json));
answerWith = () => ({ ok: false, status: 400, message: 'This isn’t a service package Voice Verses can read (service.date: Required).' });
const bad = await call('/packages', { method: 'POST', key: writeKey, body: { package: '1.0' } });
check('a broken package comes back with what is wrong', bad.status === 400 && /service\.date/.test(bad.json.error.message));
answerWith = () => ({ ok: true, result: { package: '1.0', service: { name: 'Sunday', date: '2026-11-22' }, order: [] } });
const out = await call('/services/s9/package', { key: readKey });
check('a service as a package', out.status === 200 && out.json.package === '1.0' && commands.at(-1).command === 'services.package' && commands.at(-1).body.id === 's9');

// Events over Server-Sent Events
const ev = (name, data, extra = {}) => ({ specversion: '1.0', id: crypto.randomUUID(), source: 'voiceverses://app/live', type: `org.voiceverses.${name}.v1`, name, time: new Date().toISOString(), datacontenttype: 'application/json', data, ...extra });
const sse = await fetch(`${base}/events?types=live.*&key=${encodeURIComponent(readKey)}`);
check('events open as a stream with ?key=', sse.status === 200 && sse.headers.get('content-type') === 'text/event-stream');
const reader = sse.body.getReader();
let sseText = '';
const readFor = async (ms) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const chunk = await Promise.race([reader.read(), new Promise((r) => setTimeout(() => r(null), until - Date.now()))]);
    if (!chunk || chunk.done) break;
    sseText += new TextDecoder().decode(chunk.value);
  }
};

// Events over a WebSocket
const ws = net.connect(server.address().port, '127.0.0.1');
const wsKey = crypto.randomBytes(16).toString('base64');
let wsData = Buffer.alloc(0);
ws.on('data', (d) => (wsData = Buffer.concat([wsData, d])));
await new Promise((r) => ws.once('connect', r));
ws.write(`GET /api/v1/events?types=live.changed HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${wsKey}\r\nSec-WebSocket-Version: 13\r\nAuthorization: Bearer ${readKey}\r\n\r\n`);
await new Promise((r) => setTimeout(r, 150));
const expectAccept = crypto.createHash('sha1').update(`${wsKey}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
check('a WebSocket opens with the right handshake', wsData.toString().startsWith('HTTP/1.1 101') && wsData.toString().includes(expectAccept));
wsData = Buffer.alloc(0);

// A webhook
let hookBody = null;
let hookSig = null;
const receiver = http.createServer((req, res) => {
  let b = '';
  req.on('data', (c) => (b += c));
  req.on('end', () => {
    hookBody = b;
    hookSig = req.headers['x-voiceverses-signature'];
    res.writeHead(204).end();
  });
});
await new Promise((r) => receiver.listen(0, '127.0.0.1', r));
check('a webhook needs an http address', (await call('/webhooks', { method: 'POST', key: readKey, body: { url: 'file:///etc/passwd' } })).status === 400);
const hook = await call('/webhooks', { method: 'POST', key: readKey, body: { url: `http://127.0.0.1:${receiver.address().port}/vv`, types: ['live.*'] } });
check('a webhook is created with its secret', hook.status === 201 && typeof hook.json.secret === 'string' && hook.json.types.join() === 'live.*');

// Send events
api.onEvent(ev('speech.heard', { text: 'not for live.* readers' }));
api.onEvent(ev('live.changed', { kind: 'clear' }, { practice: true }));
const verse = ev('live.changed', { kind: 'verse', reference: 'John 3:16', translation: 'KJV', text: 'For God so loved the world…' });
api.onEvent(verse);
await readFor(300);
check('the stream gets live.changed', sseText.includes(`event: live.changed`) && sseText.includes('"reference":"John 3:16"'));
check('…not what it didn’t ask for', !sseText.includes('speech.heard'));
check('…and never a practice event', !sseText.includes('"kind":"clear"'));
const frameText = wsData.length > 2 ? wsData.subarray(wsData[1] === 126 ? 4 : 2).toString() : '';
check('the WebSocket gets it as a text message', wsData[0] === 0x81 && JSON.parse(frameText).id === verse.id, wsData.subarray(0, 4).toString('hex'));
check('GET /live has it now', (await call('/live', { key: readKey })).json?.live?.reference === 'John 3:16');
for (let i = 0; i < 20 && !hookBody; i++) await new Promise((r) => setTimeout(r, 50));
const secret = hook.json.secret;
check('the webhook got the event', !!hookBody && JSON.parse(hookBody).id === verse.id);
check('…signed with its secret', hookSig === `sha256=${crypto.createHmac('sha256', secret).update(hookBody).digest('hex')}`);
check('the webhook can be removed', (await call(`/webhooks/${hook.json.id}`, { method: 'DELETE', key: readKey })).status === 200);

// Removing a device
const devices = (await api.overview()).devices;
const phone = devices.find((d) => d.name === 'Phone');
await api.removeDevice(phone.id);
check('a removed device’s key stops working', (await call('/me', { key: readKey })).status === 401);
await readFor(200);
const closed = await Promise.race([reader.read(), new Promise((r) => setTimeout(() => r({ timeout: true }), 500))]);
check('…and its streams close', closed.done === true, JSON.stringify(closed).slice(0, 60));
ws.destroy();

// The description lists exactly the app's events
const fromCode = [...readFileSync(new URL('../../src/core/events.ts', import.meta.url), 'utf8').matchAll(/^ {2}'([a-z.]+)':/gm)].map((m) => m[1]).sort();
const fromSpec = Object.values(spec.asyncapi.components.messages).map((m) => m.name).sort();
check('asyncapi.json lists every event in events.ts', fromCode.join() === fromSpec.join(), `${fromCode.join()} vs ${fromSpec.join()}`);
const livePaths = Object.keys(spec.openapi.paths).filter((p) => p.startsWith('/live/')).map((p) => p.slice(6)).sort();
check('openapi.json describes packages', !!spec.openapi.paths['/packages']?.post && !!spec.openapi.components.schemas.ServicePackage);
check('openapi.json lists every live action', livePaths.join() === 'advance,back,clear,logo,next,show,take', livePaths.join());

// Bonjour
const ad = { instance: `Voice Verses on booth.${SERVICE}`, host: 'booth.local', port: 47100, txt: { api: '1', path: '/api/v1', version: '9.9.9' } };
const records = parseBonjour(answerPacket(ad, { addresses: ['192.168.1.20'] }));
check('Bonjour answers with the service, port and address', records.some((r) => r.type === 'PTR' && r.to === ad.instance) && records.some((r) => r.type === 'SRV' && r.port === 47100 && r.target === 'booth.local') && records.some((r) => r.type === 'A' && r.address === '192.168.1.20'));
const q = parseQuestions(bonjourQuery([SERVICE]));
check('Bonjour reads the question for _voiceverses._tcp', q?.[0]?.name === SERVICE && q[0].type === 12);
check('…and ignores answers', parseQuestions(answerPacket(ad, { addresses: [] })) === null);

api.closeAll();
server.close();
server.closeAllConnections?.();
receiver.close();
if (failed) {
  console.error(`\n${failed} API check(s) failed`);
  process.exit(1);
}
console.log('\n✅ Local API checks passed');
process.exit(0);
