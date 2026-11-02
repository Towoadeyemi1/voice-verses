// Settings → Listening with a fake microphone: the sound check moves, a channel can be chosen and is
// kept, and an input that comes back with a new id is found again by its name.
const path = require('path');
const { OUT, launch, check, done } = require('./lib.cjs');
const audio = process.argv[2] || path.join(OUT, 'worship.wav');

(async () => {
  const { app, win, errors } = await launch('microphone', { audio: audio.replace('%noloop', '') });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1500, height: 1000 }));
  const open = async () => {
    await win.evaluate(() => (location.hash = '#/media-library'));
    await win.waitForTimeout(600);
    await win.evaluate(() => (location.hash = '#/settings'));
    await win.waitForTimeout(1200);
    await win.getByRole('button', { name: 'Listening' }).click();
    await win.waitForTimeout(4000);
  };
  await open();
  const status = await win.evaluate(() => window.voiceVerses.microphone?.status());
  check('the app can tell whether it may use the microphone', typeof status === 'string', status);
  const text = await win.locator('text=/Sound is coming in|No sound yet/').first().textContent();
  check('the sound check hears the microphone', /Sound is coming in/.test(text), text);
  await win.screenshot({ path: `${OUT}/microphone.png` });
  const channels = await win.getByRole('radiogroup', { name: 'Channel' }).getByRole('radio').count();
  check('channels are shown with meters', channels >= 1, `${channels} channels`);
  await win.getByRole('radiogroup', { name: 'Channel' }).getByRole('radio').first().click();
  let saved = await win.evaluate(() => JSON.parse(localStorage.getItem('cornerstone-settings') || '{}'));
  check('the chosen channel is kept', saved.audioChannel === 0, JSON.stringify(saved));

  // Choose the named fake input, then pretend the computer gave it a new id
  await win.getByRole('combobox', { name: 'Input to listen to' }).click();
  await win.waitForTimeout(400);
  const options = await win.getByRole('option').allTextContents();
  const named = options.find((o) => !o.startsWith('Default input'));
  if (named) {
    await win.getByRole('option', { name: named }).click();
    await win.waitForTimeout(1500);
    saved = await win.evaluate(() => JSON.parse(localStorage.getItem('cornerstone-settings') || '{}'));
    check('the input is kept with its name', saved.audioDeviceName === named, JSON.stringify(saved));
    await win.evaluate(() => { const s = JSON.parse(localStorage.getItem('cornerstone-settings')); s.audioDevice = 'an-old-id'; localStorage.setItem('cornerstone-settings', JSON.stringify(s)); });
    await open();
    saved = await win.evaluate(() => JSON.parse(localStorage.getItem('cornerstone-settings') || '{}'));
    check('an input with a new id is found again by its name', saved.audioDevice !== 'an-old-id', JSON.stringify(saved));
  } else {
    await win.keyboard.press('Escape');
    check('a named input is listed', false, options.join(', '));
  }
  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
