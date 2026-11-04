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

const messagePath = (suffix) => `/v1/message/${encodeURIComponent(MESSAGE_NAME)}/${suffix}`;

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
  const answer = await request(connection, 'GET', '/v1/messages');
  const messages = Array.isArray(answer) ? answer : Array.isArray(answer?.messages) ? answer.messages : [];
  let message = messages.find((m) => messageName(m).toLowerCase() === MESSAGE_NAME.toLowerCase());
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
  await request(connection, 'POST', '/v1/messages', {
    id: { uuid: '', name: MESSAGE_NAME, index: 0 },
    message: '{Verse} — {Reference}',
    tokens: [
      { name: 'Verse', text: { text: '' } },
      { name: 'Reference', text: { text: '' } },
    ],
    theme: { uuid: String(theme.uuid), name: String(theme.name ?? ''), index: Number(theme.index ?? 0) },
    visible_on_network: false,
    is_active: false,
  });
  return status(connection);
}

/** Shows a verse: updates the message tokens and triggers it, optionally on the stage screens too. */
export async function showVerse(connection, { reference, text, stage }) {
  await request(connection, 'POST', messagePath('trigger'), [
    { name: 'Verse', text: { text: String(text) } },
    { name: 'Reference', text: { text: String(reference) } },
  ]);
  if (stage) {
    await request(connection, 'PUT', '/v1/stage/message', `${reference} — ${text}`);
  }
}

export async function clear(connection, { stage }) {
  await request(connection, 'GET', messagePath('clear'));
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
