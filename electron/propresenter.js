// Sends verses to ProPresenter through its network API (ProPresenter 7.9 and
// later; enable it in ProPresenter → Settings → Network).
//
// The API has no Bible endpoint, so verses go through a ProPresenter message:
// a message named "Voice Verses" whose text contains {Verse} and {Reference}
// tokens. Triggering it with new token values puts the verse on the Messages
// layer, styled by the message's theme, on whichever screens the operator's
// Looks send messages to. Optionally the verse also goes to the stage screens
// as a stage message.
//
// Requests run here rather than in the page: ProPresenter serves plain HTTP
// without CORS headers, which a web page cannot call.

export const MESSAGE_NAME = 'Voice Verses';
const TIMEOUT_MS = 3000;

function baseUrl({ host, port }) {
  const h = String(host ?? '').trim();
  const p = Number(port);
  // A hostname or IP address (IPv6 in brackets); nothing that could change the URL's path
  if (!/^(\[[0-9a-f:.]+\]|[a-z0-9.-]+)$/i.test(h)) throw new Error('Enter the ProPresenter computer name or IP address.');
  if (!Number.isInteger(p) || p < 1 || p > 65535) throw new Error('Enter the port shown in ProPresenter → Settings → Network.');
  return `http://${h}:${p}`;
}

async function request(connection, method, path, body) {
  const url = baseUrl(connection) + path;
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new Error(
      `ProPresenter is not reachable at ${connection.host}:${connection.port}. Check that ProPresenter is open and Network is enabled in its settings.`,
    );
  }
  if (response.status === 404) {
    throw new Error(path.startsWith('/v1/message/') ? `ProPresenter has no message named "${MESSAGE_NAME}".` : 'ProPresenter did not recognise the request. Update ProPresenter to 7.9 or later.');
  }
  if (!response.ok) {
    throw new Error(`ProPresenter returned an error (${response.status}).`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * The "Voice Verses" message is always addressed by its own ProPresenter id
 * (uuid), found by its exact name. Addressing it by name let ProPresenter 21
 * pick another message (the owner's "Service Countdown") when it could not
 * resolve the name (1.18.4). Ids are remembered per ProPresenter and looked up
 * again if ProPresenter no longer knows one.
 */
const ids = new Map();
const where = ({ host, port }) => `${host}:${port}`;
const messageList = (answer) => (Array.isArray(answer) ? answer : Array.isArray(answer?.messages) ? answer.messages : []);
const isOurs = (m) => messageName(m).toLowerCase() === MESSAGE_NAME.toLowerCase();

async function ourMessageId(connection, fresh = false) {
  const key = where(connection);
  if (!fresh && ids.has(key)) return ids.get(key);
  const message = messageList(await request(connection, 'GET', '/v1/messages')).find(isOurs);
  const uuid = message?.id?.uuid;
  if (!message) throw new Error(`ProPresenter has no message named "${MESSAGE_NAME}". Press Set up again in Settings → ProPresenter.`);
  if (!uuid) throw new Error(`ProPresenter did not give the "${MESSAGE_NAME}" message an id. Update ProPresenter, or make the message again.`);
  ids.set(key, uuid);
  return uuid;
}

/** Runs a request on the Voice Verses message; if ProPresenter has forgotten its id, finds it again once. */
async function onOurMessage(connection, method, suffix, body) {
  const run = async (fresh) => request(connection, method, `/v1/message/${encodeURIComponent(await ourMessageId(connection, fresh))}/${suffix}`, body);
  try {
    return await run(false);
  } catch (error) {
    if (!ids.has(where(connection))) throw error;
    ids.delete(where(connection));
    return run(true);
  }
}

/** A message's name and tokens, however this ProPresenter version reports them. */
const messageName = (m) => String(m?.id?.name ?? m?.name ?? '').trim();
export function tokenNames(message) {
  const list = Array.isArray(message?.tokens) ? message.tokens : Array.isArray(message?.message?.tokens) ? message.message.tokens : [];
  return list
    .map((t) => (typeof t === 'string' ? t : t?.name ?? t?.id?.name ?? t?.token?.name ?? t?.text?.name ?? ''))
    .map((n) => String(n).replace(/[{}]/g, '').trim())
    .filter(Boolean);
}
const messageText = (m) => String((typeof m?.message === 'string' ? m.message : m?.message?.text) ?? m?.text ?? '');

/**
 * Whether the Voice Verses message can show a verse: it has Verse and Reference
 * tokens. ProPresenter 21 may leave tokens out of the list of messages, so the
 * message itself is read too; when ProPresenter doesn't say, the operator can
 * still send a test verse and look.
 */
export function messageReadiness(message) {
  const names = tokenNames(message).map((n) => n.toLowerCase());
  const text = messageText(message);
  const has = (token) => names.includes(token) || new RegExp(`\\{\\s*${token}\\s*\\}`, 'i').test(text);
  const known = names.length > 0 || /\{[^}]+\}/.test(text);
  return { ready: has('verse') && has('reference'), known, tokens: tokenNames(message) };
}

/** Connection check: which ProPresenter is this, and is the Voice Verses message set up? */
export async function status(connection) {
  const version = await request(connection, 'GET', '/version');
  const messages = messageList(await request(connection, 'GET', '/v1/messages'));
  let message = messages.find(isOurs);
  if (message?.id?.uuid) ids.set(where(connection), message.id.uuid);
  let check = messageReadiness(message);
  if (message && !check.ready) {
    // The message on its own may say more than the list does
    try {
      const id = message?.id?.uuid || MESSAGE_NAME;
      const detail = await request(connection, 'GET', `/v1/message/${encodeURIComponent(id)}`);
      const full = detail?.message && typeof detail.message === 'object' && !Array.isArray(detail.message) ? { ...detail, ...detail.message } : detail;
      const better = messageReadiness(full);
      if (better.ready || better.known) {
        message = full;
        check = better;
      }
    } catch {
      // Not available in this version; go by the list
    }
  }
  return {
    name: version?.name ?? '',
    version: version?.host_description ?? '',
    hasMessage: Boolean(message),
    // Ready when both tokens are seen, or when ProPresenter doesn't list tokens at all (send a test verse to check)
    messageReady: Boolean(message) && (check.ready || !check.known),
    tokensUnconfirmed: Boolean(message) && !check.known,
    tokens: check.tokens,
  };
}

/**
 * Theme slides the Voice Verses message can use, as "Theme › Slide" choices.
 * ProPresenter 7.9–7.x answers /v1/themes with a list of theme groups; later
 * versions (ProPresenter 21) with an object ({ system: [themes], groups: [...] }).
 * Either way, every theme (anything with slides) is found however it is nested.
 */
export async function themeSlides(connection) {
  return themeSlidesFrom(await request(connection, 'GET', '/v1/themes'));
}

export function themeSlidesFrom(answer) {
  const slides = [];
  const seen = new Set();
  const visit = (node, depth) => {
    if (!node || typeof node !== 'object' || depth > 8) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }
    if (Array.isArray(node.slides)) {
      const themeName = node.id?.name ?? node.name ?? 'Theme';
      for (const slide of node.slides) {
        const id = slide?.id;
        if (id?.uuid && !seen.has(id.uuid)) {
          seen.add(id.uuid);
          slides.push({ id, label: `${themeName} › ${id.name || 'Slide'}` });
        }
      }
    }
    for (const key of ['system', 'themes', 'groups']) if (node[key]) visit(node[key], depth + 1);
  };
  visit(answer, 0);
  return slides;
}

/** Creates the "Voice Verses" message with the chosen theme slide (once). */
export async function createMessage(connection, theme) {
  if (!theme?.uuid) throw new Error('Choose a theme for the verse.');
  const current = await status(connection);
  if (current.hasMessage) return current;
  const before = messageList(await request(connection, 'GET', '/v1/messages'));
  // A new message: only its name. An empty id with index 0 let ProPresenter 21 overwrite message 0 instead.
  await request(connection, 'POST', '/v1/messages', {
    id: { name: MESSAGE_NAME },
    message: '{Verse} — {Reference}',
    tokens: [
      { name: 'Verse', text: { text: '' } },
      { name: 'Reference', text: { text: '' } },
    ],
    theme: { uuid: String(theme.uuid), name: String(theme.name ?? ''), index: Number(theme.index ?? 0) },
    visible_on_network: false,
    is_active: false,
  });
  const after = messageList(await request(connection, 'GET', '/v1/messages'));
  const changed = changedMessages(before, after);
  if (changed.length) {
    throw new Error(
      `ProPresenter changed your message “${changed.join('”, “')}” instead of making a new one. Open it in ProPresenter and put back what it said, then make a message named “${MESSAGE_NAME}” with {Verse} and {Reference} tokens yourself.`,
    );
  }
  if (!after.some(isOurs)) throw new Error(`ProPresenter did not make the "${MESSAGE_NAME}" message. Make it in ProPresenter (Messages → +) with {Verse} and {Reference} tokens.`);
  return status(connection);
}

/** Messages that were there before and now read differently (their text or tokens), other than ours. */
export function changedMessages(before, after) {
  const shape = (m) => JSON.stringify({ text: messageText(m), tokens: tokenNames(m), theme: m?.theme?.uuid ?? null });
  const was = new Map(before.filter((m) => m?.id?.uuid).map((m) => [m.id.uuid, m]));
  return after
    .filter((m) => m?.id?.uuid && was.has(m.id.uuid) && shape(was.get(m.id.uuid)) !== shape(m))
    .map((m) => messageName(was.get(m.id.uuid)) || 'Untitled');
}

/**
 * Shows a verse: triggers the Voice Verses message with the verse in its tokens,
 * optionally on the stage screens too. Then asks ProPresenter whether its
 * Messages layer is showing: `messagesOn` false means it took the verse but
 * shows nothing (e.g. another message took its place); null when it can't say.
 */
export async function showVerse(connection, { reference, text, stage }) {
  await onOurMessage(connection, 'POST', 'trigger', [
    { name: 'Verse', text: { text: String(text) } },
    { name: 'Reference', text: { text: String(reference) } },
  ]);
  if (stage) {
    await request(connection, 'PUT', '/v1/stage/message', `${reference} — ${text}`);
  }
  let messagesOn = null;
  try {
    const layers = await request(connection, 'GET', '/v1/status/layers');
    if (typeof layers?.messages === 'boolean') messagesOn = layers.messages;
  } catch {
    // Older ProPresenter: it can't say
  }
  return { messagesOn };
}

/**
 * Why a verse may not be on ProPresenter's screens (1.18.4): what ProPresenter
 * itself says about the Voice Verses message (its text, tokens and their values,
 * its theme), its layers, its screens and the current Look. Each answer is read
 * however this version shapes it; what it doesn't say is left out.
 */
export async function diagnose(connection) {
  const ask = (path) => request(connection, 'GET', path).catch(() => undefined);
  const out = { checks: [] };
  const add = (state, title, detail) => out.checks.push({ state, title, detail });
  let uuid = null;
  try {
    uuid = await ourMessageId(connection, true);
  } catch (error) {
    add('problem', `No message named “${MESSAGE_NAME}”`, error.message);
    return out;
  }
  const raw = await ask(`/v1/message/${encodeURIComponent(uuid)}`);
  const m = raw?.message && typeof raw.message === 'object' && !Array.isArray(raw.message) ? { ...raw, ...raw.message } : raw;
  const text = messageText(m);
  const tokens = (Array.isArray(m?.tokens) ? m.tokens : []).map((t) => ({ name: String(t?.name ?? '').replace(/[{}]/g, ''), value: t?.text?.text ?? null, kind: t?.text ? 'text' : t?.timer ? 'timer' : t?.clock ? 'clock' : 'other' }));
  if (m) {
    add(text.trim() ? 'ok' : 'problem', 'The message’s text', text.trim() ? `“${text}”` : 'The message has no text, so nothing can show. In ProPresenter, edit the message and put the Verse and Reference tokens in its text box.');
    for (const t of tokens) add(t.kind === 'text' ? 'ok' : 'warn', `Token “${t.name}”`, t.kind === 'text' ? (t.value ? `Now: “${String(t.value).slice(0, 80)}”` : 'Empty now') : `It is a ${t.kind} token; Voice Verses needs text tokens.`);
    const theme = m?.theme?.name || m?.theme?.id?.name || '';
    add(theme ? 'ok' : 'warn', 'Its theme', theme ? `“${theme}”. Its text box is where the verse appears: if the theme’s text is white on white, or outside the screen, nothing is seen.` : 'ProPresenter didn’t name a theme for the message: choose one in the message’s Theme.');
  }
  const layers = await ask('/v1/status/layers');
  if (layers && typeof layers.messages === 'boolean') add(layers.messages ? 'ok' : 'problem', 'Messages layer', layers.messages ? 'On: a message is showing.' : 'Off: no message is showing right now. Send a test verse, then check again.');
  const screens = await ask('/v1/status/screens');
  if (screens && typeof screens === 'object') {
    for (const [name, on] of Object.entries(screens)) if (typeof on === 'boolean') add(on ? 'ok' : 'problem', `${name.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())} screens`, on ? 'On.' : 'Off in ProPresenter: nothing shows on them.');
  }
  const look = await ask('/v1/look/current');
  if (look && typeof look === 'object') {
    const name = look?.id?.name ?? look?.name ?? 'The current Look';
    const list = Array.isArray(look.screens) ? look.screens : [];
    list.forEach((sc, i) => {
      const on = typeof sc?.messages === 'boolean' ? sc.messages : typeof sc?.layers?.messages === 'boolean' ? sc.layers.messages : null;
      if (on === null) return;
      const screen = sc?.name ?? sc?.id?.name ?? `screen ${i + 1}`;
      add(on ? 'ok' : 'problem', `Look “${name}”, ${screen}`, on ? 'Shows messages.' : 'Messages are switched off for this screen in the Look, so the verse never reaches it. Turn Messages on for it in ProPresenter’s Looks.');
    });
    if (!list.length) add('warn', `Look “${name}”`, 'ProPresenter didn’t say which layers this Look shows. Check that Messages is on for the audience screens in its Looks.');
  }
  return out;
}

export async function clear(connection, { stage }) {
  await onOurMessage(connection, 'GET', 'clear');
  if (stage) {
    await request(connection, 'DELETE', '/v1/stage/message');
  }
}

// ---- Finding ProPresenter and setting it up in one step ------------------------------

/** "ProPresen 812 user 31u IPv4 … TCP *:52739 (LISTEN)" lines from lsof → the ports ProPresenter listens on. */
export function portsFromLsof(output) {
  const ports = new Set();
  for (const line of String(output).split('\n')) {
    if (!/^ProPresen/i.test(line) || !/\(LISTEN\)/.test(line)) continue;
    const m = line.match(/:(\d{2,5})\s+\(LISTEN\)/);
    if (m) ports.add(Number(m[1]));
  }
  return [...ports];
}

/** "TCP 0.0.0.0:52739 0.0.0.0:0 LISTENING 4321" lines from netstat, for the given process ids → ports. */
export function portsFromNetstat(output, pids) {
  const ports = new Set();
  for (const line of String(output).split('\n')) {
    const m = line.trim().match(/^TCP\s+\S+:(\d{2,5})\s+\S+\s+LISTENING\s+(\d+)/i);
    if (m && pids.has(m[2])) ports.add(Number(m[1]));
  }
  return [...ports];
}

function run(file, args) {
  return import('node:child_process').then(
    ({ execFile }) =>
      new Promise((resolve) => execFile(file, args, { timeout: 4000, windowsHide: true }, (error, stdout) => resolve(error && !stdout ? '' : String(stdout)))),
  );
}

/** The ports ProPresenter listens on, on this computer (none if it isn't running). */
async function localPorts() {
  if (process.platform === 'darwin') return portsFromLsof(await run('/usr/sbin/lsof', ['-nP', '-iTCP', '-sTCP:LISTEN']));
  if (process.platform === 'win32') {
    const tasks = await run('tasklist', ['/FO', 'CSV', '/NH']);
    const pids = new Set([...tasks.matchAll(/^"ProPresenter[^"]*","(\d+)"/gim)].map((m) => m[1]));
    if (!pids.size) return [];
    return portsFromNetstat(await run('netstat', ['-ano', '-p', 'tcp']), pids);
  }
  return [];
}

/** Of these ports, the first where ProPresenter's network API answers. */
export async function probe(host, ports) {
  for (const port of ports) {
    try {
      const response = await fetch(`http://${host}:${port}/version`, { signal: AbortSignal.timeout(800) });
      if (!response.ok) continue;
      const version = await response.json().catch(() => null);
      if (version && (version.host_description || version.name)) return { host, port, version: version.host_description ?? '', name: version.name ?? '' };
    } catch {
      // Not this one
    }
  }
  return null;
}

/**
 * Finds ProPresenter running on this computer, without typing a port: the
 * ports it listens on, then the one its network API answers on. Null when
 * it isn't running, or its network is off (Settings → Network → Enable Network).
 */
export async function findLocal() {
  const ports = await localPorts().catch(() => []);
  return ports.length ? probe('127.0.0.1', ports) : null;
}

/** The theme slide that suits verses best: one named for scripture, else a lower third, else the first. */
export function pickTheme(slides) {
  const score = (s) => (/scripture|bible|verse|word/i.test(s.label) ? 2 : /lower|third|message/i.test(s.label) ? 1 : 0);
  return [...slides].sort((a, b) => score(b) - score(a))[0] ?? null;
}

/**
 * One step: make sure the "Voice Verses" message exists (created with the
 * best-suited theme if not) and say what is ready. Returns the status and the
 * theme used, if one was chosen.
 */
export async function setUp(connection) {
  let current = await status(connection);
  let theme = null;
  if (!current.hasMessage) {
    theme = pickTheme(await themeSlides(connection));
    if (!theme) throw new Error('ProPresenter has no themes to show the verse in. Add a theme in ProPresenter, then try again.');
    current = await createMessage(connection, theme.id);
  }
  return { ...current, theme: theme?.label ?? null };
}

// ---- Finding ProPresenter on other computers on the network ----------------------------------
//
// Two ways, at the same time: ProPresenter announces itself with Bonjour (mDNS), which is
// instant where the network passes it; and, because some church networks block that, every
// address on this computer's local network is tried on ProPresenter's usual ports. Anything
// found is confirmed by asking it for /version, so only a real ProPresenter is listed.

/** Bonjour names ProPresenter (and its remote) are known to announce. */
const BONJOUR_SERVICES = ['_pro7proremote._tcp.local', '_propresenter._tcp.local', '_pro7stagedsply._tcp.local', '_services._dns-sd._udp.local'];
/** The ports ProPresenter uses unless changed in its Settings → Network. */
export const USUAL_PORTS = [50001, 1025, 20652];

function encodeName(name) {
  const parts = name.split('.').filter(Boolean).map((label) => {
    const bytes = Buffer.from(label, 'utf8');
    return Buffer.concat([Buffer.from([bytes.length]), bytes]);
  });
  return Buffer.concat([...parts, Buffer.from([0])]);
}

/** A DNS query packet asking for PTR records for each name. */
export function bonjourQuery(names) {
  const header = Buffer.alloc(12);
  header.writeUInt16BE(names.length, 4);
  const questions = names.map((n) => Buffer.concat([encodeName(n), Buffer.from([0, 12, 0, 1])])); // PTR, IN
  return Buffer.concat([header, ...questions]);
}

function readName(buf, offset, depth = 0) {
  const labels = [];
  let pos = offset;
  let end = -1;
  while (pos < buf.length && depth < 20) {
    const len = buf[pos];
    if (len === 0) {
      pos += 1;
      break;
    }
    if ((len & 0xc0) === 0xc0) {
      if (end < 0) end = pos + 2;
      pos = ((len & 0x3f) << 8) | buf[pos + 1];
      depth++;
      continue;
    }
    labels.push(buf.toString('utf8', pos + 1, pos + 1 + len));
    pos += 1 + len;
  }
  return { name: labels.join('.'), next: end >= 0 ? end : pos };
}

/** The records in a DNS answer: PTR (to), SRV (target, port), A (address). */
export function parseBonjour(buf) {
  const records = [];
  if (buf.length < 12) return records;
  const qd = buf.readUInt16BE(4);
  const total = buf.readUInt16BE(6) + buf.readUInt16BE(8) + buf.readUInt16BE(10);
  let pos = 12;
  try {
    for (let i = 0; i < qd; i++) pos = readName(buf, pos).next + 4;
    for (let i = 0; i < total && pos < buf.length; i++) {
      const { name, next } = readName(buf, pos);
      const type = buf.readUInt16BE(next);
      const length = buf.readUInt16BE(next + 8);
      const data = next + 10;
      if (type === 12) records.push({ type: 'PTR', name, to: readName(buf, data).name });
      else if (type === 33) records.push({ type: 'SRV', name, port: buf.readUInt16BE(data + 4), target: readName(buf, data + 6).name });
      else if (type === 1 && length === 4) records.push({ type: 'A', name, address: [...buf.subarray(data, data + 4)].join('.') });
      pos = data + length;
    }
  } catch {
    // A cut-off packet: keep what was read
  }
  return records;
}

/** What Bonjour says about ProPresenter: [{ host, port, label }], within `ms`. */
async function bonjour(ms) {
  const dgram = await import('node:dgram');
  return new Promise((resolve) => {
    const records = [];
    let socket;
    try {
      socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    } catch {
      resolve([]);
      return;
    }
    const finish = () => {
      try {
        socket.close();
      } catch {
        // Already closed
      }
      const addresses = new Map(records.filter((r) => r.type === 'A').map((r) => [r.name.toLowerCase(), r.address]));
      const found = records
        .filter((r) => r.type === 'SRV' && /pro7|propresenter/i.test(r.name))
        .map((r) => ({ host: addresses.get(r.target.toLowerCase()) ?? r.target.replace(/\.$/, ''), port: r.port, label: r.name.split('._')[0] }));
      resolve(found);
    };
    socket.on('error', finish);
    socket.on('message', (msg, from) => {
      for (const r of parseBonjour(msg)) {
        // A host without an address record: the answer came from it
        if (r.type === 'SRV' && !records.some((a) => a.type === 'A' && a.name === r.target)) records.push({ type: 'A', name: r.target, address: from.address });
        records.push(r);
        // Ask for the details of any ProPresenter service another answer pointed to
        if (r.type === 'PTR' && /pro7|propresenter/i.test(r.to) && !/^_services\./.test(r.to)) socket.send(bonjourQuery([r.to]), 5353, '224.0.0.251');
      }
    });
    socket.bind(0, () => {
      socket.send(bonjourQuery(BONJOUR_SERVICES), 5353, '224.0.0.251', () => {});
      setTimeout(finish, ms);
    });
  });
}

/** This computer's local networks (IPv4), as the 254 neighbours of each address; none for big or public networks. */
export function neighbours(interfaces) {
  const hosts = new Set();
  for (const list of Object.values(interfaces)) {
    for (const a of list ?? []) {
      if (a.family !== 'IPv4' && a.family !== 4) continue;
      if (a.internal || !/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)) continue;
      const prefix = a.address.split('.').slice(0, 3).join('.');
      for (let i = 1; i < 255; i++) if (`${prefix}.${i}` !== a.address) hosts.add(`${prefix}.${i}`);
    }
  }
  return [...hosts].slice(0, 1024);
}

/** Whether something accepts a connection at host:port within `ms` (cheaper than an HTTP request). */
async function isOpen(host, port, ms) {
  const net = await import('node:net');
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(ms, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

/** Runs `work` on each item, `limit` at a time. */
async function eachLimited(items, limit, work) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await work(items[next++]);
    }),
  );
}

/** Tries each host on each port; calls `onFound` for every ProPresenter that answers. */
export async function scan(hosts, ports, onFound) {
  const targets = hosts.flatMap((host) => ports.map((port) => ({ host, port })));
  await eachLimited(targets, 128, async ({ host, port }) => {
    if (await isOpen(host, port, 450)) {
      const r = await probe(host, [port]);
      if (r) onFound(r);
    }
  });
}

/**
 * Every ProPresenter this computer can reach: on this computer, and on the
 * local network (Bonjour, then each address on the usual ports and any extra
 * ones, such as the port saved last time). [{ host, port, name, version, here }]
 */
export async function search({ ports = [], interfaces } = {}) {
  const os = await import('node:os');
  const own = new Set(['127.0.0.1', ...Object.values(interfaces ?? os.networkInterfaces()).flat().map((a) => a?.address).filter(Boolean)]);
  const tryPorts = [...new Set([...ports.map(Number).filter((p) => Number.isInteger(p) && p > 0 && p < 65536), ...USUAL_PORTS])];
  const found = new Map();
  const add = (r, here = false) => {
    if (!r) return;
    const key = here || own.has(r.host) ? `local:${r.port}` : `${r.host}:${r.port}`;
    if (!found.has(key)) found.set(key, { ...r, host: here || own.has(r.host) ? '127.0.0.1' : r.host, here: here || own.has(r.host) });
  };

  const local = findLocal().then((r) => add(r, true)).catch(() => {});
  const viaBonjour = bonjour(1500)
    .then((services) => Promise.all(services.map(async (s) => add(await probe(s.host, [s.port])))))
    .catch(() => {});
  const viaScan = scan(neighbours(interfaces ?? os.networkInterfaces()), tryPorts, (r) => add(r));
  await Promise.all([local, viaBonjour, viaScan]);
  return [...found.values()].sort((a, b) => Number(b.here) - Number(a.here) || a.host.localeCompare(b.host, undefined, { numeric: true }));
}
