// The Bitfocus Companion module (tools/companion-module, 1.19.16), loaded as Companion loads it
// (with a stand-in for @companion-module/base) against the real desktop app: it pairs with the
// code from Settings → Other apps and devices and keeps its key, then its buttons show a verse,
// put one in Next and take it, go forward and back, clear and show the logo; Take lights green
// while something waits in Next, Clear red while something is on the screens; removing the
// device in Settings tells Companion it is no longer paired.
const path = require('path');
const Module = require('module');
const { OUT, ROOT, launch, check, done } = require('./lib.cjs');

const PORT = 47188;

// A stand-in for @companion-module/base: records what the module tells Companion
let Instance = null;
const base = {
  InstanceStatus: { Ok: 'ok', Connecting: 'connecting', ConnectionFailure: 'connection_failure', BadConfig: 'bad_config', UnknownError: 'unknown_error' },
  combineRgb: (r, g, b) => ((r & 255) << 16) | ((g & 255) << 8) | (b & 255),
  runEntrypoint: (cls) => (Instance = cls),
  InstanceBase: class {
    constructor() {
      this.label = 'voice-verses';
      this.status = null;
      this.why = '';
      this.saved = null;
      this.vars = {};
      this.logs = [];
      this.checked = 0;
    }
    setActionDefinitions(a) { this.actionDefs = a; }
    setFeedbackDefinitions(f) { this.feedbackDefs = f; }
    setVariableDefinitions(v) { this.variableDefs = v; }
    setPresetDefinitions(p) { this.presetDefs = p; }
    setVariableValues(v) { Object.assign(this.vars, v); }
    checkFeedbacks() { this.checked++; }
    updateStatus(s, why) { this.status = s; this.why = why ?? ''; }
    saveConfig(c) { this.saved = c; }
    log(level, text) { this.logs.push(`${level}: ${text}`); }
  },
};
const load = Module._load;
Module._load = function (request, ...rest) {
  return request === '@companion-module/base' ? base : load.call(this, request, ...rest);
};
require(path.join(ROOT, 'tools/companion-module/src/main.js'));

(async () => {
  check('the module starts as Companion starts it', typeof Instance === 'function');
  const { app, win, errors } = await launch('companion');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1500, height: 1000 }));
  await win.evaluate((port) => localStorage.setItem('voice-verses-network', JSON.stringify({ enabled: false, port })), PORT);
  await win.waitForTimeout(1500);
  const until = async (fn, ms = 6000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await fn()) return true;
      await new Promise((r) => setTimeout(r, 150));
    }
    return false;
  };
  const liveLabel = () => win.locator('[data-label-detail="live"]').innerText().catch(() => '');

  // Settings: switch it on, show a code that may control the screens
  await win.locator('[data-guide="settings"]').click();
  await win.waitForTimeout(800);
  await win.locator('[data-pane="devices"]').click();
  await win.waitForTimeout(800);
  await win.locator('#api-switch').click();
  await win.waitForTimeout(1200);
  await win.locator('[data-api-pair-start]').click();
  await win.waitForTimeout(600);
  const code = (await win.locator('[data-api-code] .code').innerText()).replace(/\D/g, '');
  await win.keyboard.press('Escape');
  await win.waitForTimeout(600);

  // Companion: the code typed once, then saved
  const deck = new Instance();
  const fields = deck.getConfigFields().map((f) => f.id);
  check('its settings ask for the computer, the port and the pairing code', ['host', 'port', 'code', 'name', 'key'].every((f) => fields.includes(f)), fields.join(','));
  await deck.init({ host: '127.0.0.1', port: PORT, code, name: 'Stream Deck in the booth', key: '' });
  check('it pairs with the code and keeps its key (the code is cleared)', /^vv1_/.test(deck.saved?.key ?? '') && deck.saved.code === '', JSON.stringify(deck.saved).slice(0, 80));
  check('…and connects', await until(() => deck.status === 'ok'), `${deck.status} ${deck.why}`);
  await win.locator('[data-guide="settings"]').click();
  await win.waitForTimeout(800);
  await win.locator('[data-pane="devices"]').click();
  await win.waitForTimeout(800);
  check('Voice Verses lists it by its name', (await win.locator('[data-api-device="Stream Deck in the booth"]').count()) === 1);
  await win.screenshot({ path: `${OUT}/companion-1-paired.png` });
  await win.keyboard.press('Escape');
  await win.waitForTimeout(600);

  check('it offers Take, Clear, Logo, Forward, Back, Show a verse and Put a verse in Next', ['take', 'clear', 'logo', 'advance', 'back', 'show', 'next'].every((a) => deck.actionDefs[a]));
  check('…and ready-made buttons', ['take', 'clear', 'logo', 'back', 'advance'].every((p) => deck.presetDefs[p]) && deck.presetDefs.take.style.text.includes('$(voice-verses:next)'));
  const press = async (id, options = {}) => deck.actionDefs[id].callback({ options }, { parseVariablesInString: async (s) => s });
  const lit = (id) => deck.feedbackDefs[id].callback({ options: {} });

  await press('show', { reference: 'John 3:16' });
  check('Show a verse puts it on the screens', await until(async () => /John 3:16/.test(await liveLabel())), await liveLabel());
  check('…Clear lights red, and its words say what is on', await until(() => lit('on_screens') && /John 3:16/.test(deck.vars.live ?? '')), JSON.stringify(deck.vars));
  await press('next', { reference: 'Romans 8:28' });
  check('Put a verse in Next: Take lights green and names it', await until(() => lit('next_ready') && /Romans 8:28/.test(deck.vars.next ?? '')), JSON.stringify(deck.vars));
  await press('take');
  check('Take puts it on the screens', await until(async () => /Romans 8:28/.test(await liveLabel())), await liveLabel());
  await press('advance');
  check('Forward goes to the next verse', await until(async () => /Romans 8:29/.test(await liveLabel())), await liveLabel());
  await press('back');
  check('Back goes to the one before', await until(async () => /Romans 8:28/.test(await liveLabel())), await liveLabel());
  await press('logo');
  check('Logo shows the logo', await until(() => deck.vars.live === 'Logo'), JSON.stringify(deck.vars));
  await press('clear');
  check('Clear takes it off, and the red goes out', await until(() => !lit('on_screens')), JSON.stringify(deck.vars));
  await win.screenshot({ path: `${OUT}/companion-2-live.png` });

  // Removed in Settings: Companion says so
  await win.locator('[data-guide="settings"]').click();
  await win.waitForTimeout(800);
  await win.locator('[data-pane="devices"]').click();
  await win.waitForTimeout(800);
  await win.locator('[data-api-device="Stream Deck in the booth"] button:has-text("Remove")').click();
  check('removed in Voice Verses, Companion says it is no longer paired', await until(() => deck.status === 'bad_config' && /no longer paired/.test(deck.why), 40000), `${deck.status} ${deck.why}`);
  await deck.destroy();

  check('no errors in the window', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
