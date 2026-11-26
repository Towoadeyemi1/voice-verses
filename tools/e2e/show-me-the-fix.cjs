// Show me the fix (1.19.11): a warning's fix as one control lit up on the right Settings page,
// with a line to say what to change, "Do it for me" where Voice Verses can, and a tick and back to
// the live screen once the check passes.
//  A. The projector's screen is unplugged during the service: the warning's Show me the fix opens
//     Settings → Screens on the projector; plugging it back in clears it by itself.
//  B. The input chosen for the preacher isn't connected: the booth check's Show me the fix opens
//     Settings → Listening, and "Do it for me" listens to every input and chooses the one with sound.
//  Esc goes back at any time; going to another Settings page ends the fix and stays there.
// The fake microphone plays a tone made here (no words).
const fs = require('fs');
const path = require('path');
const { OUT, launch, plugInSecondDisplay, check, done } = require('./lib.cjs');

// A tone that rises and falls like speech, 90 seconds, 16 kHz mono
const wav = path.join(OUT, 'tone.wav');
{
  const rate = 16000, secs = 90, n = rate * secs;
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const v = Math.sin(2 * Math.PI * 220 * t) * (0.5 + 0.4 * Math.sin(2 * Math.PI * 3 * t));
    data.writeInt16LE(Math.round(v * 20000), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(wav, Buffer.concat([h, data]));
}

const unplugSecondDisplay = (app) =>
  app.evaluate(({ screen }) => {
    const [first, second] = screen.getAllDisplays();
    screen.getAllDisplays = () => [first];
    screen.getDisplayMatching = () => first;
    screen.emit('display-removed', {}, second);
  });

(async () => {
  const { app, win, errors } = await launch('show-me-the-fix', { audio: wav });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1500, height: 1000 }));
  await win.evaluate(() => localStorage.setItem('voice-verses-guide-voice', 'off'));
  const narration = win.locator('[data-guide-narration]');
  const waitFor = async (fn, ms) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await fn().catch(() => false)) return true;
      await win.waitForTimeout(250);
    }
    return false;
  };

  // ---- A. The projector's screen is unplugged
  await plugInSecondDisplay(app);
  await win.waitForTimeout(500);
  await win.evaluate(async () => window.voiceVerses.screens.set({ ...(await window.voiceVerses.screens.get()), projection: 4242 }));
  await win.waitForTimeout(2500);
  await unplugSecondDisplay(app);
  const warning = win.locator('[data-guardian-warning="screen-projection"]');
  check('unplugging the projector’s screen warns during the service', await waitFor(() => warning.isVisible(), 12000));
  check('…with Show me the fix and Not now', (await warning.locator('[data-show-fix]').innerText()).trim() === 'Show me the fix' && (await warning.getByRole('button', { name: 'Not now' }).count()) === 1);
  await win.screenshot({ path: `${OUT}/show-me-the-fix-1-warning.png` });
  await warning.locator('[data-show-fix]').click();
  check('the fix is said in one line', await waitFor(async () => /projector’s screen isn’t connected/.test(await narration.innerText()), 5000), await narration.innerText().catch(() => ''));
  check('…on Settings → Screens, the projector lit up', await waitFor(() => win.locator('[data-output="projection"]').isVisible(), 3000));
  // The light, the line and the pointer are on the control, after the page has scrolled to it
  const lit = (sel) =>
    win.evaluate((sel) => {
      const t = document.querySelector(sel)?.getBoundingClientRect();
      const s = document.querySelector('[data-guide-spotlight]')?.getBoundingClientRect();
      const c = document.querySelector('[data-guide-narration]')?.getBoundingClientRect();
      if (!t || !s || !c) return false;
      const over = c.left < t.right && c.right > t.left && c.top < t.bottom && c.bottom > t.top;
      return Math.abs(t.top - s.top) < 12 && Math.abs(t.left - s.left) < 12 && Math.abs(t.width - s.width) < 20 && !over;
    }, sel);
  await win.waitForTimeout(800);
  check('…the light is on the projector, and the line beside it', await lit('[data-output="projection"]'));
  check('…and listening carries on', /Listening carries on/.test(await narration.innerText()));
  await win.screenshot({ path: `${OUT}/show-me-the-fix-2-screens.png` });
  await plugInSecondDisplay(app);
  check('plugging it back in: ✓ The projector is showing again', await waitFor(async () => (await win.locator('[data-guide-say].done').count()) === 1 && /projector is showing again/.test(await narration.innerText()), 8000));
  await win.screenshot({ path: `${OUT}/show-me-the-fix-3-solved.png` });
  check('…and back to the live screen', await waitFor(async () => !(await win.locator('[data-guide-narration]').count()) && !(await win.locator('[data-show-fix="screen-projection"]').count()) && !(await win.locator('[data-output="projection"]').isVisible().catch(() => false)), 6000));
  check('the warning has gone', !(await warning.count()));

  // ---- B. The preacher's input isn't connected
  await win.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cornerstone-settings') || '{}');
    localStorage.setItem('cornerstone-settings', JSON.stringify({ ...s, audioDevice: 'gone', audioDeviceName: 'Scarlett 4i4 USB', audioChannel: null }));
    window.dispatchEvent(new Event('settings-updated'));
  });
  await win.waitForTimeout(1500);
  await win.locator('[data-booth-check]').click();
  const item = win.locator('[data-booth-check-list] [data-check="mic"]');
  check('the booth check says the input isn’t connected', await waitFor(async () => /Scarlett 4i4 USB/.test(await item.innerText()), 5000), await item.innerText().catch(() => ''));
  await win.locator('[data-booth-check-list] [data-show-fix="mic"]').click();
  check('Show me the fix: choose the input the preacher is on', await waitFor(async () => /Choose the input the preacher is on/.test(await narration.innerText()), 5000));
  check('…on Settings → Listening', await waitFor(() => win.locator('#mic-device').isVisible(), 3000));
  const doIt = win.locator('[data-guide-action]');
  check('…with Do it for me', (await doIt.innerText().catch(() => '')).trim() === 'Do it for me');
  await win.waitForTimeout(800);
  check('…the light is on the input, and the line beside it', await lit('#mic-device'));
  await win.screenshot({ path: `${OUT}/show-me-the-fix-4-listening.png` });
  await doIt.click();
  check('Do it for me: ✓ Hearing the preacher again', await waitFor(async () => (await win.locator('[data-guide-say].done').count()) === 1 && /Hearing the preacher again/.test(await narration.innerText()), 20000), await narration.innerText().catch(() => ''));
  const saved = await win.evaluate(() => JSON.parse(localStorage.getItem('cornerstone-settings') || '{}'));
  check('…the input with sound is chosen', saved.audioDevice && saved.audioDevice !== 'gone' && saved.audioDeviceName !== 'Scarlett 4i4 USB', JSON.stringify({ d: saved.audioDevice, n: saved.audioDeviceName }));
  await win.screenshot({ path: `${OUT}/show-me-the-fix-5-done.png` });
  check('…and back to the live screen', await waitFor(async () => !(await win.locator('[data-guide-narration]').count()) && !(await win.locator('#mic-device').isVisible().catch(() => false)), 6000));

  // ---- Esc goes back at any time
  await win.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cornerstone-settings') || '{}');
    localStorage.setItem('cornerstone-settings', JSON.stringify({ ...s, audioDevice: 'gone', audioDeviceName: 'Scarlett 4i4 USB' }));
    window.dispatchEvent(new Event('settings-updated'));
  });
  await win.waitForTimeout(1500);
  await win.locator('[data-booth-check]').click();
  await win.locator('[data-booth-check-list] [data-show-fix="mic"]').click({ timeout: 5000 });
  await waitFor(() => narration.isVisible(), 5000);
  await win.keyboard.press('Escape');
  check('Esc goes back and the light goes out', await waitFor(async () => !(await win.locator('[data-guide-narration]').count()) && !(await win.locator('#mic-device').isVisible().catch(() => false)), 4000));

  // ---- Going to another page ends the fix quietly, and leaves Settings open there
  await win.locator('[data-booth-check]').click();
  await win.locator('[data-booth-check-list] [data-show-fix="mic"]').click({ timeout: 5000 });
  await waitFor(() => win.locator('#mic-device').isVisible(), 5000);
  await win.locator('[data-pane="features"]').click();
  check('another page ends the fix, and Settings stays there', await waitFor(async () => !(await win.locator('[data-guide-narration]').count()), 5000) && (await win.locator('[data-feature-settings]').isVisible()));
  await win.keyboard.press('Escape');

  check('no errors in the window', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
