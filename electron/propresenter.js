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

/** Connection check: which ProPresenter is this, and is the Voice Verses message set up? */
export async function status(connection) {
  const version = await request(connection, 'GET', '/version');
  const messages = (await request(connection, 'GET', '/v1/messages')) ?? [];
  const message = messages.find((m) => m?.id?.name === MESSAGE_NAME);
  const tokens = new Set((message?.tokens ?? []).map((t) => t?.name));
  return {
    name: version?.name ?? '',
    version: version?.host_description ?? '',
    hasMessage: Boolean(message),
    messageReady: Boolean(message) && tokens.has('Verse') && tokens.has('Reference'),
  };
}

/** Theme slides the Voice Verses message can use, as "Theme › Slide" choices. */
export async function themeSlides(connection) {
  const groups = (await request(connection, 'GET', '/v1/themes')) ?? [];
  const slides = [];
  const walk = (group) => {
    for (const theme of group?.themes ?? []) {
      for (const slide of theme?.slides ?? []) {
        if (slide?.id?.uuid) slides.push({ id: slide.id, label: `${theme.id?.name ?? 'Theme'} › ${slide.id.name}` });
      }
    }
    for (const child of group?.groups ?? []) walk(child);
  };
  groups.forEach(walk);
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
