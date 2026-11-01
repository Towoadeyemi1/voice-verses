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
  await win.getByRole('button', { name: 'Show on the screens' }).click();
  await win.waitForTimeout(600);
  const saved = await win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-alert') || 'null'));
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
  await win.getByRole('button', { name: 'Show on the screens' }).click();
  await win.waitForTimeout(500);
  await go('#/confidence');
  check('the stage monitor shows the note', (await win.locator('[data-stage-alert]').textContent())?.includes('Please wrap up'));
  await win.screenshot({ path: `${OUT}/alerts-stage.png` });
  await go('#/projection');
  check('the room does not see it', (await win.locator('[data-alert]').count()) === 0);

  // Clear
  await go('#/');
  await win.getByRole('button', { name: 'Clear the alert' }).first().click();
  await win.waitForTimeout(400);
  check('cleared', (await win.evaluate(() => localStorage.getItem('voice-verses-alert'))) === null);

  // One that hides itself
  await win.evaluate(() => new BroadcastChannel('cornerstone-bible-sync').postMessage({ type: 'ALERT', data: { alert: { id: 'x', text: 'Seats at the front', projector: true, stream: false, stage: false, position: 'bottom', until: Date.now() + 1500 } } }));
  await win.evaluate(() => localStorage.setItem('voice-verses-alert', JSON.stringify({ id: 'x', text: 'Seats at the front', projector: true, stream: false, stage: false, position: 'bottom', until: Date.now() + 1500 })));
  await go('#/projection');
  const shown = await win.locator('[data-alert]').count();
  await win.waitForTimeout(1800);
  check('an alert set to hide does so by itself', shown === 1 && (await win.locator('[data-alert]').count()) === 0, `${shown} then ${await win.locator('[data-alert]').count()}`);

  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
