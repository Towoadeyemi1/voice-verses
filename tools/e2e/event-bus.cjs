// The event bus (1.19.4, D33): the modules register at start, and what the screens show is
// announced as live.changed (verse, slide, clear) with CloudEvents envelopes; Next, Bible
// are announced too. Practice staying out of the room is checked by tools/checks/bus-check.ts,
// and ProPresenter following the bus (and not in practice) by propresenter-routes.cjs.
const { OUT, launch, check, done } = require('./lib.cjs');

(async () => {
  const { app, win, errors } = await launch('event-bus');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1500, height: 1000 }));
  await win.evaluate(() => localStorage.setItem('voice-verses-guide-voice', 'off'));
  await win.waitForTimeout(2500);

  const bus = () => win.evaluate(() => ({ events: window.__voiceVersesBus.recent(), modules: window.__voiceVersesBus.modules().map((m) => m.id) }));
  const last = async (name) => (await bus()).events.filter((e) => e.name === name).at(-1);

  const first = await bus();
  check('nine modules registered', first.modules.length === 9 && first.modules.includes('propresenter'), first.modules.join(','));
  check('each announced itself', first.events.filter((e) => e.name === 'module.registered').length === 9);

  // Take a verse
  await win.locator('[data-guide="search"]').click();
  await win.locator('[cmdk-input]').fill('John 3:16');
  await win.waitForTimeout(400);
  await win.keyboard.press('Enter');
  await win.waitForTimeout(1200);
  const next = await last('next.changed');
  check('Next is announced', next?.data.kind === 'verse' && next.data.reference === 'John 3:16', JSON.stringify(next?.data));
  await win.locator('[data-guide="take"]').click();
  await win.waitForTimeout(1000);
  const verse = await last('live.changed');
  check('a verse taken is announced', verse?.data.kind === 'verse' && verse.data.reference === 'John 3:16' && /For God so loved/.test(verse.data.text) && !!verse.data.translation, JSON.stringify(verse?.data).slice(0, 160));
  check('…as a CloudEvent', verse?.specversion === '1.0' && verse.type === 'org.voiceverses.live.changed.v1' && verse.source === 'voiceverses://app/live');
  check('…not marked practice', !verse?.practice);

  // Clear
  await win.keyboard.press('Escape');
  await win.waitForTimeout(800);
  const cleared = await last('live.changed');
  check('Clear is announced', cleared?.data.kind === 'clear' && cleared.id !== verse?.id);

  await win.screenshot({ path: `${OUT}/event-bus-1.png` });
  check('no errors in the window', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})();
