// The "Voice Verses" message is always the one that gets the verse (1.18.4). A pretend ProPresenter 21
// that, like the owner's, resolves a message it can't find by name to message 0, and treats a new
// message posted with index 0 as "replace message 0". Its message 0 is the church's "Service Countdown".
// Checks: the verse goes to Voice Verses by its id, Service Countdown is never changed, a new message is
// posted without an index, a replaced message is noticed, and "not showing" is reported.
// Run: node tools/checks/propresenter-trigger.mjs
import http from 'node:http';
import { changedMessages, clear, createMessage, diagnose, pickTheme, showVerse } from '../../electron/propresenter.js';

let failed = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
};

function pretend({ withOurs, layersOn = true }) {
  const state = { layersOn };
  const messages = [{ id: { uuid: 'c0', name: 'Service Countdown', index: 0 }, message: 'Service begins in {Countdown}', tokens: [{ name: 'Countdown', timer: {} }], theme: { uuid: 't0' } }];
  if (withOurs) messages.push({ id: { uuid: 'v1', name: 'Voice Verses', index: 1 }, message: '{Verse} — {Reference}', tokens: [{ name: 'Verse', text: { text: '' } }, { name: 'Reference', text: { text: '' } }], theme: { uuid: 't1' } });
  const triggered = [];
  const posted = [];
  const resolve = (id) => messages.find((m) => m.id.uuid === id) ?? messages[Number.parseInt(id, 10) || 0];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const send = (status, data) => (res.writeHead(status, { 'content-type': 'application/json' }), res.end(data === undefined ? '' : JSON.stringify(data)));
      const url = decodeURIComponent(req.url);
      if (url === '/version') return send(200, { name: 'Media iMac', host_description: 'ProPresenter 21.4' });
      if (url === '/v1/messages' && req.method === 'GET') return send(200, messages);
      if (url === '/v1/messages' && req.method === 'POST') {
        const m = JSON.parse(body);
        posted.push(m);
        // Like ProPresenter 21: an id with index 0 and no uuid replaces message 0
        if (m.id?.index === 0 && !m.id?.uuid) Object.assign(messages[0], { message: m.message, tokens: m.tokens, theme: m.theme });
        else messages.push({ ...m, id: { uuid: `n${messages.length}`, name: m.id.name, index: messages.length } });
        return send(200, m);
      }
      const trig = url.match(/^\/v1\/message\/(.+)\/trigger$/);
      if (trig) {
        const m = resolve(trig[1]);
        triggered.push(m.id.name);
        return send(204);
      }
      if (url === '/v1/status/layers') return send(200, { messages: state.layersOn, slide: true, media: true });
      if (url === '/v1/status/screens') return send(200, { audience: true, stage: true });
      if (url === '/v1/look/current') return send(200, { id: { name: 'Sunday' }, screens: [{ name: 'Audience', messages: false }, { name: 'Stage', messages: true }] });
      const one = url.match(/^\/v1\/message\/([^/]+)$/);
      if (one) return send(200, resolve(one[1]));
      send(404);
    });
  });
  return { server, messages, triggered, posted, state };
}

const listen = (server) => new Promise((r) => server.listen(0, '127.0.0.1', () => r({ host: '127.0.0.1', port: server.address().port })));

// 1. The verse goes to Voice Verses, by its id; Service Countdown is untouched
{
  const p = pretend({ withOurs: true });
  const c = await listen(p.server);
  const result = await showVerse(c, { reference: 'John 3:16', text: 'For God so loved the world', stage: false });
  check('the verse goes to the Voice Verses message', p.triggered.join(',') === 'Voice Verses', p.triggered.join(','));
  check('…and ProPresenter says its Messages layer is showing', result.messagesOn === true, JSON.stringify(result));
  p.server.close();
}

// 2. Making the message: posted without an index, and Service Countdown stays as it was
{
  const p = pretend({ withOurs: false });
  const c = await listen(p.server);
  await createMessage(c, { uuid: 't1', name: 'Scripture', index: 2 }).catch((e) => check('making the message succeeds', false, e.message));
  check('a new message is posted with only its name', p.posted.length === 1 && p.posted[0].id.index === undefined && p.posted[0].id.uuid === undefined, JSON.stringify(p.posted[0]?.id));
  check('Service Countdown is not changed', p.messages[0].message === 'Service begins in {Countdown}');
  check('the Voice Verses message is there', p.messages.some((m) => m.id.name === 'Voice Verses'));
  p.server.close();
}

// 3. A message ProPresenter changed instead of adding ours is noticed
{
  const before = [{ id: { uuid: 'c0', name: 'Service Countdown' }, message: 'Service begins in {Countdown}', tokens: [{ name: 'Countdown' }] }];
  const after = [{ id: { uuid: 'c0', name: 'Service Countdown' }, message: '{Verse} — {Reference}', tokens: [{ name: 'Verse' }, { name: 'Reference' }] }];
  check('a replaced message is noticed by name', changedMessages(before, after).join(',') === 'Service Countdown', changedMessages(before, after).join(','));
  check('an unchanged list is fine', changedMessages(before, before).length === 0);
}

// 4. Took the verse but shows nothing
{
  const p = pretend({ withOurs: true, layersOn: false });
  const c = await listen(p.server);
  const result = await showVerse(c, { reference: 'John 3:16', text: 'For God so loved the world', stage: false });
  check('"not showing" is reported when the Messages layer is off', result.messagesOn === false, JSON.stringify(result));
  p.server.close();
}

// 5. Why isn't it on the screens: ProPresenter's own answers, in words
{
  const p = pretend({ withOurs: true, layersOn: true });
  const c = await listen(p.server);
  const { checks } = await diagnose(c);
  const find = (re) => checks.find((x) => re.test(x.title));
  check('the message’s text is read', /Verse/.test(find(/text/)?.detail ?? ''), find(/text/)?.detail);
  check('the Look with Messages off for the audience is found', find(/Look “Sunday”, Audience/)?.state === 'problem', JSON.stringify(find(/Audience/)));
  check('…and the stage screen in it is fine', find(/Look “Sunday”, Stage/)?.state === 'ok');
  p.server.close();
}

// 6. Hide pressed in ProPresenter: the next verse is not put back over it, until Voice Verses clears or is told to send
{
  const p = pretend({ withOurs: true, layersOn: true });
  const c = await listen(p.server);
  await showVerse(c, { reference: 'John 5:8', text: 'Rise', stage: false });
  p.state.layersOn = false; // the ProPresenter operator pressed Hide
  const next = await showVerse(c, { reference: 'John 5:9', text: 'And immediately', stage: false });
  check('after Hide in ProPresenter, the next verse is not sent', next.hiddenInProPresenter === true && p.triggered.length === 1, JSON.stringify({ next, sent: p.triggered.length }));
  const forced = await showVerse(c, { reference: 'John 5:9', text: 'And immediately', stage: false, force: true });
  check('…“Send again” sends it', p.triggered.length === 2 && !forced.hiddenInProPresenter);
  p.state.layersOn = true;
  await showVerse(c, { reference: 'John 5:10', text: 'The Jews', stage: false });
  await clear(c, { stage: false }).catch(() => {});
  p.state.layersOn = false; // cleared by Voice Verses itself: not a Hide
  const after = await showVerse(c, { reference: 'John 5:11', text: 'He answered', stage: false });
  check('a verse after Voice Verses cleared its own is sent', !after.hiddenInProPresenter && p.triggered.length === 4, JSON.stringify({ after, sent: p.triggered.length }));
  p.server.close();
}

// 7. Set-up picks a lower third over a full-screen scripture theme
{
  const pick = pickTheme([{ label: 'Scripture › Full Screen' }, { label: 'Default › Lower Third' }, { label: 'Message › Bar' }]);
  check('set-up picks a lower-third theme', pick?.label === 'Default › Lower Third', pick?.label);
}

console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
