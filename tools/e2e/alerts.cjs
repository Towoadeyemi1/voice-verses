// Alerts on the screens: a nursery alert on the projector over what is showing, a note for the
// preacher on the stage monitor only, clearing, and an alert that hides itself.
const { OUT, launch, setBounds, check, done } = require('./lib.cjs');

(async () => {
  const { app, win, errors } = await launch('alerts');
  await setBounds(app, 1680, 1050);
  await win.waitForTimeout(3000);
  const go = async (hash) => { await win.evaluate((h) => (location.hash = h), hash); await win.waitForTimeout(1500); };

  // A nursery alert for the room
  await win.getByRole('button', { name: /^Alert$/ }).first().click();
  await win.waitForTimeout(500);
  await win.getByPlaceholder('42').fill('42');
  await win.waitForTimeout(400);
  await win.screenshot({ path: `${OUT}/alerts-dialog.png` });
  await win.getByRole('button', { name: /^Show on / }).click();
  await win.waitForTimeout(600);
  const saved = await win.evaluate(() => (JSON.parse(localStorage.getItem('voice-verses-alert') || '[]'))[0]);
  check('the alert is on', saved?.text === 'Parent of child 42, please come to the nursery' && saved.projector && !saved.stage, JSON.stringify(saved));
  check('the operator sees it on the Live monitor', (await win.locator('[data-alert]').count()) >= 1);
  await win.screenshot({ path: `${OUT}/alerts-live.png` });
  await go('#/projection');
  check('the projector shows it', (await win.locator('[data-alert]').textContent())?.includes('child 42'));
  await win.screenshot({ path: `${OUT}/alerts-projector.png` });
  await go('#/confidence');
  check('the stage monitor does not', (await win.locator('[data-stage-alert]').count()) === 0);

  // A note for the preacher only
  await go('#/');
  await win.getByRole('button', { name: /^Alert on$/ }).first().click();
  await win.waitForTimeout(400);
  await win.getByRole('button', { name: 'Please wrap up' }).click();
  await win.getByRole('button', { name: /^Show on / }).click();
  await win.waitForTimeout(500);
  await go('#/confidence');
  check('the stage monitor shows the note', (await win.locator('[data-stage-alert]').textContent())?.includes('Please wrap up'));
  await win.screenshot({ path: `${OUT}/alerts-stage.png` });
  await go('#/projection');
  check('the room does not see the stage note', !((await win.locator('[data-alert]').textContent()) || '').includes('wrap up'));

  // Both at once: the nursery alert stays on the projector while the stage has its own
  await go('#/projection');
  check('the projector still shows the nursery alert', (await win.locator('[data-alert]').textContent())?.includes('child 42'));

  // Clear
  await go('#/');
  await win.getByRole('button', { name: 'Clear the alerts' }).first().click();
  await win.waitForTimeout(400);
  check('cleared', (await win.evaluate(() => localStorage.getItem('voice-verses-alert'))) === null);

  // One that hides itself
  await win.evaluate(() => new BroadcastChannel('cornerstone-bible-sync').postMessage({ type: 'ALERT', data: { alert: { id: 'x', text: 'Seats at the front', projector: true, stream: false, stage: false, position: 'bottom', until: Date.now() + 1500 } } }));
  await win.evaluate(() => localStorage.setItem('voice-verses-alert', JSON.stringify([{ id: 'x', text: 'Seats at the front', projector: true, stream: false, stage: false, position: 'bottom', until: Date.now() + 1500 }])));
  await go('#/projection');
  const shown = await win.locator('[data-alert]').count();
  await win.waitForTimeout(1800);
  check('an alert set to hide does so by itself', shown === 1 && (await win.locator('[data-alert]').count()) === 0, `${shown} then ${await win.locator('[data-alert]').count()}`);

  // Countdowns: the room counts down to the start while the stage times the sermon
  await go('#/');
  await win.getByRole('button', { name: /^Countdown/ }).first().click();
  await win.waitForTimeout(400);
  await win.getByRole('button', { name: 'Before the service' }).click();
  await win.getByRole('button', { name: /^Start on / }).click();
  await win.waitForTimeout(400);
  await win.getByRole('button', { name: /^\d+:\d+/ }).first().click();
  await win.waitForTimeout(400);
  await win.getByRole('button', { name: 'Sermon timer (stage only)' }).click();
  await win.getByRole('button', { name: /^Start on / }).click();
  await win.waitForTimeout(500);
  const running = await win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-countdown') || '[]').map((c) => `${c.message}|${c.projector}|${c.confidence}|${c.stream}`));
  check('two countdowns, each on its own screens', running.length === 2 && running.some((r) => r.startsWith('Time left|off|true')) && running.some((r) => r.startsWith('Service begins in|full|false')), running.join(' · '));
  await go('#/confidence');
  check('the stage shows the sermon timer', (await win.locator('[data-stage-countdown]').count()) === 1);
  // Close to the end: yellow; past it: red
  await win.evaluate(() => { const list = JSON.parse(localStorage.getItem('voice-verses-countdown')); const stage = list.find((c) => c.confidence); stage.endsAt = Date.now() + 20000; stage.flash = true; new BroadcastChannel('cornerstone-bible-sync').postMessage({ type: 'COUNTDOWN', data: { countdowns: list } }); localStorage.setItem('voice-verses-countdown', JSON.stringify(list)); });
  await win.waitForTimeout(600);
  check('yellow near the end', (await win.locator('[data-stage-countdown]').getAttribute('data-stage-countdown')) === 'warn');
  check('blinking', ((await win.locator('[data-stage-countdown]').getAttribute('class')) || '').includes('vv-blink'));
  await win.screenshot({ path: `${OUT}/countdown-stage-yellow.png` });
  await win.evaluate(() => { const list = JSON.parse(localStorage.getItem('voice-verses-countdown')); const stage = list.find((c) => c.confidence); stage.endsAt = Date.now() - 5000; new BroadcastChannel('cornerstone-bible-sync').postMessage({ type: 'COUNTDOWN', data: { countdowns: list } }); localStorage.setItem('voice-verses-countdown', JSON.stringify(list)); });
  await win.waitForTimeout(600);
  check('red when done', (await win.locator('[data-stage-countdown]').getAttribute('data-stage-countdown')) === 'over');
  await win.screenshot({ path: `${OUT}/countdown-stage-red.png` });
  await go('#/projection');
  check('the projector still counts down to the start', (await win.evaluate(() => document.body.innerText)).includes('Service begins in'));
  await win.screenshot({ path: `${OUT}/countdown-projector.png` });

  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
