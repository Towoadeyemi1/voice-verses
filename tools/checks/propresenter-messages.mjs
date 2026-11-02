// The "Voice Verses" message is recognised as ready however ProPresenter reports its tokens:
// 7.x lists them in /v1/messages; ProPresenter 21 may leave them out of the list (they are read
// from /v1/message/{id}), wrap names in braces, or not report them at all (then the operator can
// still send a test verse). Uses a pretend ProPresenter. Run: node tools/checks/propresenter-messages.mjs
import http from 'node:http';
import { status } from '../../electron/propresenter.js';

const tok = (name) => ({ name, text: { text: '' } });
const id = { uuid: 'm1', name: 'Voice Verses', index: 0 };
const cases = [
  ['7.x: tokens in the list', [{ id, message: '{Verse} — {Reference}', tokens: [tok('Verse'), tok('Reference')] }], null, { ready: true, unconfirmed: false }],
  ['21: tokens only in the message itself', [{ id }], { id, message: '{Verse} — {Reference}', tokens: [tok('Verse'), tok('Reference')] }, { ready: true, unconfirmed: false }],
  ['names in braces', [{ id, tokens: [tok('{Verse}'), tok('{Reference}')] }], null, { ready: true, unconfirmed: false }],
  ['tokens as plain strings', [{ id, tokens: ['Verse', 'Reference'] }], null, { ready: true, unconfirmed: false }],
  ['not reported anywhere', [{ id }], { id }, { ready: true, unconfirmed: true }],
  ['Reference missing', [{ id, tokens: [tok('Verse')] }], { id, tokens: [tok('Verse')] }, { ready: false, unconfirmed: false }],
];

let failed = 0;
for (const [label, list, detail, want] of cases) {
  const server = http.createServer((req, res) => {
    const send = (body) => (res.writeHead(body === undefined ? 404 : 200, { 'content-type': 'application/json' }), res.end(body === undefined ? '' : JSON.stringify(body)));
    if (req.url === '/version') return send({ name: 'Mac-mini', host_description: 'ProPresenter 21.4' });
    if (req.url === '/v1/messages') return send(list);
    if (req.url.startsWith('/v1/message/')) return send(detail ?? undefined);
    send(undefined);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const got = await status({ host: '127.0.0.1', port: server.address().port }).catch((e) => ({ error: e.message }));
  server.close();
  const ok = got.messageReady === want.ready && Boolean(got.tokensUnconfirmed) === want.unconfirmed;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} → ready ${got.messageReady}, unconfirmed ${Boolean(got.tokensUnconfirmed)}, tokens [${(got.tokens ?? []).join(', ')}]${got.error ? ` (${got.error})` : ''}`);
}
console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
