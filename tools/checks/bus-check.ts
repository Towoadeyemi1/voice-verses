/**
 * Checks the event bus and module registry (1.19.4, D33). Run in CI (CHECK 10):
 *   npx esbuild tools/checks/bus-check.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/bus-check.cjs && node /tmp/bus-check.cjs
 */
import { matches, publish, recentEvents, subscribe } from '@/core/bus';
import { cloudType } from '@/core/events';
import { getModule, listModules, registerModule } from '@/core/registry';
import { MODULES } from '@/core/modules';
import { setPractice } from '@/lib/practice';
import { answer, answered, ask, CommandError } from '@/core/commands';

let failed = 0;
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed++;
};

// Patterns
check('"*" matches everything', matches('*', 'live.changed'));
check('"live.*" matches live.changed', matches('live.*', 'live.changed'));
check('"live.*" does not match listening.started', !matches('live.*', 'listening.started'));
check('an exact name matches only itself', matches('live.changed', 'live.changed') && !matches('live.changed', 'live.changedx'));

// Envelope
const event = publish('live.changed', { kind: 'clear' }, 'live');
check('envelope is CloudEvents 1.0', event.specversion === '1.0' && event.datacontenttype === 'application/json' && !!event.id && !Number.isNaN(Date.parse(event.time)));
check('type is versioned', event.type === 'org.voiceverses.live.changed.v1' && cloudType('speech.heard') === 'org.voiceverses.speech.heard.v1');
check('source names the module', event.source === 'voiceverses://app/live');
check('the event is kept in recent events', recentEvents().at(-1)?.id === event.id);

// Delivery
const got: string[] = [];
const offAll = subscribe('*', (e) => got.push(`all:${e.name}`));
const offLive = subscribe('live.*', (e) => got.push(`live:${e.name}`));
const offExact = subscribe('listening.started', (e) => got.push(`exact:${e.name}`));
publish('live.changed', { kind: 'logo' });
publish('listening.started', { engine: 'local' });
check('each subscriber gets what matches', JSON.stringify(got) === JSON.stringify(['all:live.changed', 'live:live.changed', 'all:listening.started', 'exact:listening.started']));
offLive();
got.length = 0;
publish('live.changed', { kind: 'clear' });
check('unsubscribing stops delivery', JSON.stringify(got) === JSON.stringify(['all:live.changed']));
offAll();
offExact();

// A failing subscriber doesn't stop the others or the publisher
const errLog = console.error;
console.error = () => {};
let after = false;
const offBad = subscribe('live.changed', () => {
  throw new Error('boom');
});
const offGood = subscribe('live.changed', () => (after = true));
let threw = false;
try {
  publish('live.changed', { kind: 'clear' });
} catch {
  threw = true;
}
console.error = errLog;
check('a failing subscriber is contained', !threw && after);
offBad();
offGood();

// Practice stays out of the room
const room: string[] = [];
const practiceSeen: string[] = [];
const offRoom = subscribe('live.changed', (e) => room.push(e.id));
const offPractice = subscribe('live.changed', (e) => practiceSeen.push(e.id), { includePractice: true });
setPractice(true);
const p = publish('live.changed', { kind: 'clear' });
setPractice(false);
check('practice events are marked', p.practice === true);
check('practice events skip ordinary subscribers', !room.includes(p.id));
check('a subscriber can ask for practice events', practiceSeen.includes(p.id));
offRoom();
offPractice();

// Ring of recent events stays bounded
for (let i = 0; i < 260; i++) publish('speech.heard', { text: `line ${i}` });
check('recent events keep the last 200', recentEvents().length === 200 && (recentEvents().at(-1)?.data as { text: string }).text === 'line 259');

// Registry
const registered: string[] = [];
const offReg = subscribe('module.registered', (e) => registered.push((e.data as { id: string }).id));
for (const m of MODULES) registerModule(m);
registerModule(MODULES[0]);
check('every module registers once', registered.length === MODULES.length && listModules().length === MODULES.length);
check('ProPresenter listens for live.changed', !!getModule('propresenter')?.listens.includes('live.changed'));
const ids = new Set(MODULES.map((m) => m.id));
check('module ids are unique', ids.size === MODULES.length);
offReg();

// Commands (1.19.5): answered by one module, asked by the local API
(async () => {
  const none = await ask('live.take');
  check('a live command nobody answers says the live screen isn’t open', !none.ok && none.status === 409);
  check('an unknown command says so', (await ask('nothing.here')).ok === false);
  const off = answer('live.take', () => ({ live: { kind: 'verse' } }));
  check('an answered command returns its result', JSON.stringify(await ask('live.take')) === JSON.stringify({ ok: true, result: { live: { kind: 'verse' } } }));
  check('answered() lists it', answered().includes('live.take'));
  setPractice(true);
  const practising = await ask('live.take');
  setPractice(false);
  check('live commands are refused while practising', !practising.ok && practising.status === 409 && /practice/.test(practising.message));
  const offRefuse = answer('live.next', () => {
    throw new CommandError(404, 'Couldn’t find it.');
  });
  const refused = await ask('live.next');
  check('a refusal keeps its status and words', !refused.ok && refused.status === 404 && refused.message === 'Couldn’t find it.');
  const errLog2 = console.error;
  console.error = () => {};
  const offCrash = answer('services.list', () => {
    throw new Error('disk');
  });
  const crashed = await ask('services.list');
  console.error = errLog2;
  check('a crash is a plain 500, never its details', !crashed.ok && crashed.status === 500 && !/disk/.test(crashed.message));
  off();
  offRefuse();
  offCrash();
  check('unanswering removes it', !answered().includes('live.take'));
  finish();
})();

function finish() {
if (failed) {
  console.error(`\n${failed} bus check(s) failed`);
  process.exit(1);
}
console.log('\n✅ Event bus checks passed');
}
