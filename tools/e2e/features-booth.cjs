// Settings → Features switches every smart feature on or off (with presets), the booth
// check's light on the live screen lists what to fix, a screen unplugged during the service
// shows a warning, and the screen tiles in Settings → Screens put an output on a display.
const { OUT, launch, check, done, plugInSecondDisplay } = require('./lib.cjs');

const features = (win) => win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-features') || '{}'));

(async () => {
  const { app, win, errors } = await launch('features-booth');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1680, height: 1050 }));
  await win.waitForTimeout(3500);

  // The booth check's light
  const light = win.locator('[data-booth-check]');
  await light.waitFor({ timeout: 10000 });
  await win.waitForTimeout(1500);
  check('the live screen has a booth check light', (await light.count()) === 1, (await light.textContent()) || '');
  await light.click();
  await win.waitForTimeout(1200);
  const list = win.locator('[data-booth-check-list]');
  const ids = await list.locator('[data-check]').evaluateAll((els) => els.map((e) => `${e.dataset.check}:${e.dataset.state}`));
  check('it checks the microphone, speech, screens, Bible and today’s service', ['mic', 'speech', 'screens', 'bible', 'service'].every((id) => ids.some((x) => x.startsWith(`${id}`))), ids.join(' '));
  check('with no projector connected, it says so', ids.includes('screens:warn'));
  await win.screenshot({ path: `${OUT}/features-1-booth-check.png` });
  await list.locator('[data-check="screens"] button').click();
  await win.waitForTimeout(800);
  check('Fix opens Settings → Screens', (await win.locator('[role="dialog"]').getByText('Your screens').count()) >= 1);

  // Settings → Screens tiles: put the projector on a second display
  await plugInSecondDisplay(app);
  const tile = win.locator('[data-screen-tile="HDMI-SDI"]');
  await tile.waitFor({ timeout: 10000 });
  await tile.getByRole('button', { name: 'Projector' }).click();
  await win.waitForTimeout(1500);
  const screens = await win.evaluate(() => window.voiceVerses.screens.get());
  check('a screen tile puts the projector on that display', screens.projection === 4242, JSON.stringify(screens));
  await win.screenshot({ path: `${OUT}/features-2-screen-tiles.png` });

  // Settings → Features
  await win.locator('[role="dialog"] button', { hasText: /^Features/ }).first().click();
  await win.waitForTimeout(600);
  const pane = win.locator('[data-feature-settings]');
  check('Recommended is the preset on a new install', (await pane.locator('[role="radio"][aria-checked="true"]').textContent()) === 'Recommended');
  check('features not built yet say Coming and can’t be switched on', (await pane.getByRole('switch', { name: 'Moment autopilot' }).isDisabled()) === true);
  await win.screenshot({ path: `${OUT}/features-3-pane.png` });
  await pane.getByRole('radio', { name: 'Essentials' }).click();
  await win.waitForTimeout(400);
  let saved = await features(win);
  check('Essentials keeps reading and safety, and switches off the rest', saved.readAlong && saved.guardian && saved.boothCheck && !saved.quotes && !saved.stories && !saved.worshipCues, JSON.stringify(saved).slice(0, 160));
  await pane.getByRole('switch', { name: /Verses quoted without a reference/ }).click();
  await win.waitForTimeout(400);
  check('one switch changed shows “Your own choice”', (await pane.getByText('Your own choice').count()) === 1 && (await features(win)).quotes === true);
  await pane.getByRole('radio', { name: 'Recommended' }).click();
  await pane.getByRole('switch', { name: 'Booth check' }).click();
  await win.waitForTimeout(400);
  await win.keyboard.press('Escape');
  await win.waitForTimeout(600);
  check('switching off Booth check removes its light', (await win.locator('[data-booth-check]').count()) === 0);
  await win.evaluate(() => {
    const f = JSON.parse(localStorage.getItem('voice-verses-features'));
    f.boothCheck = true;
    localStorage.setItem('voice-verses-features', JSON.stringify(f));
    window.dispatchEvent(new Event('voice-verses-features-changed'));
  });
  await win.waitForTimeout(1500);
  check('switching it on brings it back', (await win.locator('[data-booth-check]').count()) === 1);

  // During the service: the projector's display is unplugged
  await app.evaluate(({ screen }) => {
    const first = screen.getAllDisplays()[0];
    screen.getAllDisplays = () => [first];
    screen.emit('display-removed', {}, { id: 4242 });
  });
  await win.waitForTimeout(7000);
  const warning = win.locator('[data-guardian-warning="screen-projection"]');
  check('unplugging the projector warns on the live screen', (await warning.count()) === 1, (await warning.textContent().catch(() => '')) || '');
  await win.screenshot({ path: `${OUT}/features-4-guardian.png` });
  await warning.getByRole('button', { name: 'Close this warning' }).click();
  await win.waitForTimeout(6000);
  check('a closed warning stays closed while the problem lasts', (await warning.count()) === 0);

  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
