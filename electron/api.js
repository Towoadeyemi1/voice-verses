// The local API v1 (1.19.5, D33): other apps and devices on the church network use Voice
// Verses through it: a Stream Deck, a phone, the CCCG Dashboard, Planning Center, sermon
// preparation on a laptop. Off unless the operator turns on Settings → Other apps and devices.
// Served by the same server as the network screens (electron/network.js) under /api/v1;
// described in electron/api-spec/openapi.json and asyncapi.json.
//
// Who may use it: a device pairs once with a six-digit code shown in Settings (one use, five
// minutes, five wrong tries) and receives its own key. Only a hash of each key is kept. Each
// key has scopes: read (what is on, events, services), control (Next, Take, Clear, logo) and
// write (send things in, from step 2.3). Keys are removed one by one in Settings.
//
// Events are the event bus's CloudEvents, passed on unchanged (practice never reaches here);
// over Server-Sent Events or a WebSocket at /api/v1/events, and to signed webhooks.
// Commands go to the operator's window, which answers them (src/core/commands.ts).
//
// No Electron imports here, so tools/checks/api-check.mjs can test it in plain Node.
import crypto from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export const SCOPES = ['read', 'control', 'write'];
const PAIR_MINUTES = 5;
const PAIR_TRIES = 5;
const BODY_LIMIT = 64 * 1024;
/** A service package can carry songs' words and small pictures */
const PACKAGE_LIMIT = 4 * 1024 * 1024;
const ANSWER_MS = 6000;
const MAX_DEVICES = 50;
const MAX_HOOKS = 10;

let storePath = null;
let appVersion = '';
let sendCommand = null; // (message) => boolean: delivers a command to the operator's window
let onChange = () => {};
let spec = { openapi: null, asyncapi: null };

let devices = []; // { id, name, scopes, hash, createdAt, lastUsed, webhooks: [{ id, url, types, secret, createdAt, failures, paused }] }
let loaded = null;
let pairing = null; // { code, scopes, expires, tries }
let modules = [];
const state = { live: null, next: null, updatedAt: null };
const streams = new Set(); // { kind: 'sse'|'ws', patterns, device, write(event), ping(), close() }
const pending = new Map(); // command id → { resolve, timer }
const hookQueues = new Map(); // webhook id → Promise chain

// ---- Set-up --------------------------------------------------------------------------------

/** Called once by the main process. */
export function init(options) {
  storePath = options.storePath;
  appVersion = options.version ?? '';
  sendCommand = options.sendCommand ?? null;
  onChange = options.onChange ?? (() => {});
  spec = options.spec ?? spec;
  loaded = load();
  return loaded;
}

async function load() {
  try {
    const saved = JSON.parse(await readFile(storePath, 'utf8'));
    devices = Array.isArray(saved.devices) ? saved.devices.filter((d) => d && typeof d.hash === 'string') : [];
  } catch {
    devices = [];
  }
}

let saving = Promise.resolve();
function save() {
  saving = saving.then(async () => {
    if (!storePath) return;
    await mkdir(dirname(storePath), { recursive: true });
    const temp = `${storePath}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify({ devices }, null, 2), { mode: 0o600 });
    await rename(temp, storePath);
  }).catch(() => {});
  return saving;
}

const hash = (key) => crypto.createHash('sha256').update(String(key)).digest('hex');
const newId = (prefix) => `${prefix}_${crypto.randomBytes(9).toString('base64url')}`;

// ---- What Settings shows -------------------------------------------------------------------

const publicHook = (h) => ({ id: h.id, url: h.url, types: h.types, createdAt: h.createdAt, failures: h.failures ?? 0, paused: Boolean(h.paused) });
const publicDevice = (d) => ({ id: d.id, name: d.name, scopes: d.scopes, createdAt: d.createdAt, lastUsed: d.lastUsed ?? null, webhooks: (d.webhooks ?? []).map(publicHook) });

export async function overview() {
  await loaded;
  return {
    pairing: pairing && pairing.expires > Date.now() ? { code: pairing.code, scopes: pairing.scopes, expires: pairing.expires } : null,
    devices: devices.map(publicDevice),
    listening: streams.size,
  };
}

/** A new six-digit code for one device, with what it will be allowed to do. */
export async function startPairing(scopes) {
  await loaded;
  const chosen = SCOPES.filter((s) => Array.isArray(scopes) && scopes.includes(s));
  if (!chosen.includes('read')) chosen.unshift('read');
  pairing = { code: String(crypto.randomInt(0, 1_000_000)).padStart(6, '0'), scopes: chosen, expires: Date.now() + PAIR_MINUTES * 60_000, tries: 0 };
  onChange();
  return overview();
}

export function stopPairing() {
  pairing = null;
  onChange();
  return overview();
}

export async function removeDevice(id) {
  await loaded;
  const device = devices.find((d) => d.id === id);
  devices = devices.filter((d) => d.id !== id);
  for (const s of [...streams]) if (s.device === id) s.close();
  for (const h of device?.webhooks ?? []) hookQueues.delete(h.id);
  await save();
  onChange();
  return overview();
}

export async function removeWebhook(deviceId, hookId) {
  await loaded;
  const device = devices.find((d) => d.id === deviceId);
  if (device) device.webhooks = (device.webhooks ?? []).filter((h) => h.id !== hookId);
  hookQueues.delete(hookId);
  await save();
  onChange();
  return overview();
}

export function setModules(list) {
  if (Array.isArray(list)) modules = list.slice(0, 100);
}

/** Closes every event stream (the API was turned off or the server is stopping). */
export function closeAll() {
  for (const s of [...streams]) s.close();
  for (const [id, p] of pending) {
    clearTimeout(p.timer);
    p.resolve({ ok: false, status: 503, message: 'Voice Verses stopped the API.' });
    pending.delete(id);
  }
}

// ---- Events from the bus -------------------------------------------------------------------

export function matches(pattern, name) {
  if (pattern === '*') return true;
  if (pattern.endsWith('.*')) return name.startsWith(pattern.slice(0, -1));
  return pattern === name;
}

const wanted = (patterns, name) => patterns.some((p) => matches(p, name));

/** An event from the operator's window (practice events never arrive). */
export function onEvent(event) {
  if (!event || typeof event !== 'object' || typeof event.name !== 'string' || typeof event.type !== 'string' || event.practice) return;
  const { remote: _remote, ...clean } = event;
  if (clean.name === 'live.changed') {
    state.live = clean.data;
    state.updatedAt = clean.time;
  } else if (clean.name === 'next.changed') state.next = clean.data;
  for (const s of [...streams]) if (wanted(s.patterns, clean.name)) s.write(clean);
  for (const d of devices) for (const h of d.webhooks ?? []) if (!h.paused && wanted(h.types, clean.name)) deliver(d, h, clean);
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** Posts an event to a webhook, signed with its secret; three tries, in order per webhook. */
function deliver(device, hook, event) {
  const body = JSON.stringify(event);
  const signature = `sha256=${crypto.createHmac('sha256', hook.secret).update(body).digest('hex')}`;
  const send = async () => {
    for (const wait of [0, 2000, 10000]) {
      if (wait) await delay(wait);
      if (!devices.includes(device) || !(device.webhooks ?? []).includes(hook)) return;
      try {
        const res = await fetch(hook.url, {
          method: 'POST',
          headers: { 'content-type': 'application/cloudevents+json', 'x-voiceverses-signature': signature, 'x-voiceverses-delivery': event.id, 'user-agent': `VoiceVerses/${appVersion}` },
          body,
          signal: AbortSignal.timeout(5000),
          redirect: 'manual',
        });
        if (res.ok) {
          if (hook.failures) {
            hook.failures = 0;
            void save();
          }
          return;
        }
      } catch {
        // Tried again below
      }
    }
    hook.failures = (hook.failures ?? 0) + 1;
    // A webhook that keeps failing is paused (Settings shows it), so it can't slow the booth
    if (hook.failures >= 20) {
      hook.paused = true;
      onChange();
    }
    void save();
  };
  const chain = (hookQueues.get(hook.id) ?? Promise.resolve()).then(send, send);
  hookQueues.set(hook.id, chain);
}

// ---- Commands to the operator's window -----------------------------------------------------

/** Asks the operator's window to do something; resolves with { ok, status?, message?, result? }. */
function ask(command, body, ms = ANSWER_MS) {
  return new Promise((resolve) => {
    const id = crypto.randomUUID();
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve({ ok: false, status: 504, message: 'Voice Verses did not answer. Is the app open?' });
    }, ms);
    pending.set(id, { resolve, timer });
    const sent = sendCommand?.({ id, command, body: body ?? {} });
    if (!sent) {
      clearTimeout(timer);
      pending.delete(id);
      resolve({ ok: false, status: 503, message: 'The Voice Verses window is closed.' });
    }
  });
}

/** The operator's window answering a command. */
export function reply(id, answer) {
  const p = pending.get(id);
  if (!p) return;
  clearTimeout(p.timer);
  pending.delete(id);
  p.resolve(answer && typeof answer === 'object' ? answer : { ok: false, status: 500, message: 'No answer.' });
}

// ---- HTTP ----------------------------------------------------------------------------------

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
};

function json(res, code, value) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS });
  res.end(JSON.stringify(value));
}

const problem = (res, code, error, message) => json(res, code, { error: { code: error, message } });

function readBody(req, limit = BODY_LIMIT) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('Too large'), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8').trim();
      if (!text) return resolve({});
      try {
        const value = JSON.parse(text);
        resolve(value && typeof value === 'object' && !Array.isArray(value) ? value : {});
      } catch {
        reject(Object.assign(new Error('Not JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

/** The device a request's key belongs to, or null. `?key=` is accepted for event streams only. */
function deviceFor(req, url, allowQuery) {
  const header = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? '');
  const key = header?.[1] ?? (allowQuery ? url.searchParams.get('key') : null);
  if (!key) return null;
  const h = Buffer.from(hash(key), 'hex');
  for (const d of devices) {
    const mine = Buffer.from(d.hash, 'hex');
    if (mine.length === h.length && crypto.timingSafeEqual(mine, h)) {
      const now = new Date().toISOString();
      // Remembered at most once a minute
      if (!d.lastUsed || Date.parse(now) - Date.parse(d.lastUsed) > 60_000) {
        d.lastUsed = now;
        void save();
      }
      return d;
    }
  }
  return null;
}

/** Wrong pairing codes, per address: after five in a minute, wait. */
const pairAttempts = new Map();
/** For tools/checks/api-check.mjs only. */
export const resetLimits = () => pairAttempts.clear();
const recentFailures = (address) => (pairAttempts.get(address) ?? []).filter((t) => Date.now() - t < 60_000);
const tooMany = (address) => recentFailures(address).length >= 5;
function failed(address) {
  pairAttempts.set(address, [...recentFailures(address), Date.now()]);
}

async function pair(req, res) {
  const body = await readBody(req);
  const address = req.socket.remoteAddress ?? '';
  if (tooMany(address)) return problem(res, 429, 'too_many_tries', 'Too many wrong codes. Wait a minute.');
  if (!pairing || pairing.expires < Date.now()) return problem(res, 403, 'no_pairing', 'No pairing code is showing. In Voice Verses, open Settings → Other apps and devices and choose Pair a device.');
  const code = String(body.code ?? '').replace(/\D/g, '');
  const a = Buffer.from(code.padEnd(6, ' ').slice(0, 6));
  const b = Buffer.from(pairing.code);
  if (code.length !== 6 || !crypto.timingSafeEqual(a, b)) {
    failed(address);
    pairing.tries++;
    if (pairing.tries >= PAIR_TRIES) {
      pairing = null;
      onChange();
      return problem(res, 403, 'code_used_up', 'Too many wrong codes. Ask for a new code in Voice Verses.');
    }
    return problem(res, 403, 'wrong_code', 'That code is not right.');
  }
  if (devices.length >= MAX_DEVICES) return problem(res, 409, 'too_many_devices', 'Remove a device in Voice Verses first.');
  const name = String(body.name ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60) || 'A device';
  const key = `vv1_${crypto.randomBytes(32).toString('base64url')}`;
  const device = { id: newId('dev'), name, scopes: pairing.scopes, hash: hash(key), createdAt: new Date().toISOString(), lastUsed: null, webhooks: [] };
  devices.push(device);
  pairing = null;
  await save();
  onChange({ paired: device.name });
  return json(res, 201, { key, device: publicDevice(device) });
}

function openStream(req, res, device, patterns) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', ...CORS });
  res.write('retry: 2000\n\n');
  const stream = {
    kind: 'sse',
    device: device.id,
    patterns,
    write: (e) => res.write(`id: ${e.id}\nevent: ${e.name}\ndata: ${JSON.stringify(e)}\n\n`),
    ping: () => res.write(': keep-alive\n\n'),
    close: () => {
      streams.delete(stream);
      res.end();
    },
  };
  streams.add(stream);
  req.on('close', () => streams.delete(stream));
}

const patternsFrom = (url) => {
  const list = (url.searchParams.get('types') ?? '*')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^(\*|[a-z][a-z0-9-]*(\.[a-z0-9-]+)*(\.\*)?)$/.test(s));
  return list.length ? list.slice(0, 20) : ['*'];
};

const LIVE_ACTIONS = new Set(['show', 'next', 'take', 'clear', 'logo', 'advance', 'back']);

/** Handles a request under /api. */
export async function handle(req, res, pathname) {
  await loaded;
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    return res.end();
  }
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = pathname.replace(/\/+$/, '') || '/';
  const method = req.method ?? 'GET';
  try {
    // Open to all: what this is, and how to use it
    if (path === '/api' || path === '/api/v1') {
      if (method !== 'GET') return problem(res, 405, 'method', 'Use GET.');
      return json(res, 200, { name: 'Voice Verses', version: appVersion, api: '1', pairing: Boolean(pairing && pairing.expires > Date.now()), docs: { openapi: '/api/v1/openapi.json', asyncapi: '/api/v1/asyncapi.json' } });
    }
    if (path === '/api/v1/openapi.json' || path === '/api/v1/asyncapi.json') {
      const doc = path.endsWith('openapi.json') ? spec.openapi : spec.asyncapi;
      return doc ? json(res, 200, doc) : problem(res, 404, 'not_found', 'Not found.');
    }
    if (path === '/api/v1/pair') {
      if (method !== 'POST') return problem(res, 405, 'method', 'Use POST.');
      return await pair(req, res);
    }

    const device = deviceFor(req, url, path === '/api/v1/events');
    if (!device) return problem(res, 401, 'not_paired', 'Pair this device first: POST /api/v1/pair with the code shown in Voice Verses.');
    const may = (scope) => device.scopes.includes(scope);
    const forbid = (scope) => problem(res, 403, 'not_allowed', `This device is not allowed to ${scope === 'control' ? 'control the screens' : scope === 'write' ? 'send things in' : 'read'}. Pair it again with that allowed.`);

    if (path === '/api/v1/me' && method === 'GET') return json(res, 200, publicDevice(device));
    if (path === '/api/v1/modules' && method === 'GET') return may('read') ? json(res, 200, { modules }) : forbid('read');
    if (path === '/api/v1/live' && method === 'GET') return may('read') ? json(res, 200, state) : forbid('read');
    if (path === '/api/v1/events' && method === 'GET') return may('read') ? openStream(req, res, device, patternsFrom(url)) : forbid('read');

    if (path === '/api/v1/services' && method === 'GET') {
      if (!may('read')) return forbid('read');
      const date = url.searchParams.get('date');
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return problem(res, 400, 'bad_date', 'Give the date as YYYY-MM-DD.');
      const answer = await ask('services.list', { date });
      return answer.ok ? json(res, 200, answer.result) : problem(res, answer.status ?? 500, 'no_answer', answer.message);
    }

    // Service packages (1.19.6): send one in, or get a service as one
    if (path === '/api/v1/packages') {
      if (method !== 'POST') return problem(res, 405, 'method', 'Use POST.');
      if (!may('write')) return forbid('write');
      const body = await readBody(req, PACKAGE_LIMIT);
      const answer = await ask('services.receive', { package: body, app: device.name }, 30_000);
      return answer.ok ? json(res, answer.result?.created ? 201 : 200, answer.result) : problem(res, answer.status ?? 400, 'not_used', answer.message);
    }
    const packagePath = /^\/api\/v1\/services\/([\w-]+)\/package$/.exec(path);
    if (packagePath) {
      if (method !== 'GET') return problem(res, 405, 'method', 'Use GET.');
      if (!may('read')) return forbid('read');
      const answer = await ask('services.package', { id: packagePath[1] });
      return answer.ok ? json(res, 200, answer.result) : problem(res, answer.status ?? 404, 'not_found', answer.message);
    }

    const live = /^\/api\/v1\/live\/([a-z]+)$/.exec(path);
    if (live && LIVE_ACTIONS.has(live[1])) {
      if (method !== 'POST') return problem(res, 405, 'method', 'Use POST.');
      if (!may('control')) return forbid('control');
      const body = await readBody(req);
      if ((live[1] === 'show' || live[1] === 'next') && typeof body.reference !== 'string') return problem(res, 400, 'no_reference', 'Give a reference, e.g. { "reference": "John 3:16" }.');
      const answer = await ask(`live.${live[1]}`, body);
      return answer.ok ? json(res, 200, { ok: true, ...(answer.result ?? {}) }) : problem(res, answer.status ?? 409, 'not_done', answer.message);
    }

    if (path === '/api/v1/webhooks') {
      if (!may('read')) return forbid('read');
      if (method === 'GET') return json(res, 200, { webhooks: (device.webhooks ?? []).map(publicHook) });
      if (method !== 'POST') return problem(res, 405, 'method', 'Use GET or POST.');
      const body = await readBody(req);
      let target;
      try {
        target = new URL(String(body.url ?? ''));
      } catch {
        return problem(res, 400, 'bad_url', 'Give the webhook as a full http:// or https:// address.');
      }
      if (target.protocol !== 'http:' && target.protocol !== 'https:') return problem(res, 400, 'bad_url', 'Only http:// and https:// addresses.');
      if (target.username || target.password) return problem(res, 400, 'bad_url', 'Put no password in the address; check the signature instead.');
      device.webhooks = device.webhooks ?? [];
      if (device.webhooks.length >= MAX_HOOKS) return problem(res, 409, 'too_many_webhooks', `At most ${MAX_HOOKS} webhooks per device.`);
      const types = (Array.isArray(body.types) ? body.types : ['*']).map(String).filter((s) => /^(\*|[a-z][a-z0-9-]*(\.[a-z0-9-]+)*(\.\*)?)$/.test(s)).slice(0, 20);
      const hook = { id: newId('hook'), url: target.toString(), types: types.length ? types : ['*'], secret: crypto.randomBytes(24).toString('base64url'), createdAt: new Date().toISOString(), failures: 0, paused: false };
      device.webhooks.push(hook);
      await save();
      onChange();
      // The secret is shown once: it signs every delivery (X-VoiceVerses-Signature)
      return json(res, 201, { ...publicHook(hook), secret: hook.secret });
    }
    const hookPath = /^\/api\/v1\/webhooks\/([\w-]+)$/.exec(path);
    if (hookPath) {
      if (method !== 'DELETE') return problem(res, 405, 'method', 'Use DELETE.');
      const before = (device.webhooks ?? []).length;
      device.webhooks = (device.webhooks ?? []).filter((h) => h.id !== hookPath[1]);
      if (device.webhooks.length === before) return problem(res, 404, 'not_found', 'No such webhook for this device.');
      hookQueues.delete(hookPath[1]);
      await save();
      onChange();
      return json(res, 200, { ok: true });
    }
    return problem(res, 404, 'not_found', 'Not found. See /api/v1/openapi.json.');
  } catch (error) {
    if (res.headersSent) return res.end();
    return problem(res, error?.status ?? 500, error?.status === 413 ? 'too_large' : error?.status === 400 ? 'bad_json' : 'error', error?.status ? error.message : 'Something went wrong.');
  }
}

// ---- WebSocket (events only, server to client) ---------------------------------------------

function frame(opcode, payload) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload), 'utf8');
  let head;
  if (data.length < 126) head = Buffer.from([0x80 | opcode, data.length]);
  else if (data.length < 65536) {
    head = Buffer.alloc(4);
    head[0] = 0x80 | opcode;
    head[1] = 126;
    head.writeUInt16BE(data.length, 2);
  } else {
    head = Buffer.alloc(10);
    head[0] = 0x80 | opcode;
    head[1] = 127;
    head.writeBigUInt64BE(BigInt(data.length), 2);
  }
  return Buffer.concat([head, data]);
}

/** Handles an HTTP upgrade to a WebSocket at /api/v1/events. Returns false if it isn't one of ours. */
export async function upgrade(req, socket) {
  await loaded;
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname.replace(/\/+$/, '') !== '/api/v1/events') return false;
  const refuse = (code, text) => {
    socket.end(`HTTP/1.1 ${code} ${text}\r\nconnection: close\r\ncontent-length: 0\r\n\r\n`);
    return true;
  };
  const key = req.headers['sec-websocket-key'];
  if (String(req.headers.upgrade ?? '').toLowerCase() !== 'websocket' || typeof key !== 'string') return refuse(400, 'Bad Request');
  const device = deviceFor(req, url, true);
  if (!device) return refuse(401, 'Unauthorized');
  if (!device.scopes.includes('read')) return refuse(403, 'Forbidden');
  const accept = crypto.createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nupgrade: websocket\r\nconnection: Upgrade\r\nsec-websocket-accept: ${accept}\r\n\r\n`);
  socket.setNoDelay(true);
  const stream = {
    kind: 'ws',
    device: device.id,
    patterns: patternsFrom(url),
    write: (e) => {
      if (socket.writable) socket.write(frame(0x1, JSON.stringify(e)));
    },
    ping: () => {
      if (socket.writable) socket.write(frame(0x9, Buffer.alloc(0)));
    },
    close: () => {
      streams.delete(stream);
      if (socket.writable) socket.end(frame(0x8, Buffer.from([0x03, 0xe8])));
    },
  };
  streams.add(stream);
  // Read the client's frames only for ping and close (anything else is ignored)
  let buffer = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 2) {
      const opcode = buffer[0] & 0x0f;
      const masked = (buffer[1] & 0x80) !== 0;
      let length = buffer[1] & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (buffer.length < 4) return;
        length = buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (buffer.length < 10) return;
        const big = buffer.readBigUInt64BE(2);
        if (big > BigInt(BODY_LIMIT)) return stream.close();
        length = Number(big);
        offset = 10;
      }
      if (length > BODY_LIMIT) return stream.close();
      const total = offset + (masked ? 4 : 0) + length;
      if (buffer.length < total) return;
      const mask = masked ? buffer.subarray(offset, offset + 4) : null;
      const payload = Buffer.from(buffer.subarray(offset + (masked ? 4 : 0), total));
      if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
      buffer = buffer.subarray(total);
      if (opcode === 0x8) return stream.close();
      if (opcode === 0x9 && socket.writable) socket.write(frame(0xa, payload));
    }
  });
  socket.on('close', () => streams.delete(stream));
  socket.on('error', () => streams.delete(stream));
  return true;
}

// Keeps idle streams (and proxies) from dropping them
setInterval(() => {
  for (const s of streams) s.ping();
}, 20_000).unref?.();
