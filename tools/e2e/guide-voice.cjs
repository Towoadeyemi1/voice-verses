// The guide's voice (1.19.13, owner 26 Nov 2026): heard only in Training's lessons and the
// demo, after "Hear the guide?" each time (Play the voice | Words only; Esc is Words only), in
// the recorded voice (every line has its recording); never during a service, so Show me the
// fix, with or without listening, is words only.
const path = require('path');
const { OUT, launch, check, done } = require('./lib.cjs');
const audio = process.argv[2] || path.join(OUT, 'tone.wav');

(async () => {
  const { app, win, errors } = await launch('guide-voice', { audio });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1500, height: 1000 }));
  const missing = [];
  win.on('console', (m) => {
    if (/\[voice\] no recording/.test(m.text())) missing.push(m.text());
  });
  // Count every sound the page starts: recordings, and the computer's own voice
  const listen = () =>
    win.evaluate(() => {
      window.__played = [];
      window.__spoke = [];
      if (!window.__hooked) {
        window.__hooked = true;
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
          window.__played.push(this.src);
          return play.call(this);
        };
        const speak = speechSynthesis.speak.bind(speechSynthesis);
        speechSynthesis.speak = (u) => {
          window.__spoke.push(u.text);
          speak(u);
        };
      }
    });
  const sounds = () => win.evaluate(() => ({ played: window.__played.slice(), spoke: window.__spoke.slice() }));
  const until = async (fn, ms) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await fn().catch(() => false)) return true;
      await win.waitForTimeout(250);
    }
    return false;
  };
  const ask = win.locator('[data-ask-voice]');
  await win.evaluate(() => localStorage.removeItem('voice-verses-guide-voice'));
  await listen();

  // A lesson asks first, and nothing is heard until Play the voice
  await win.evaluate(() => (location.hash = '#/training'));
  await win.waitForTimeout(1500);
  await win.locator('[data-lesson="first-sunday"] [data-lesson-show]').click();
  check('a lesson asks “Hear the guide?” first', await until(() => ask.isVisible(), 6000));
  check('…saying the sound may go to the room', /goes to the room, choose Words only/.test(await ask.innerText()));
  await win.waitForTimeout(1500);
  let s = await sounds();
  check('…and nothing is heard while it asks', !s.played.length && !s.spoke.length, JSON.stringify(s));
  check('…the lesson waits for the answer', (await win.locator('[data-guide-card]').count()) === 0);
  await win.screenshot({ path: `${OUT}/guide-voice-1-ask.png` });
  await win.locator('[data-ask-voice-yes]').click();
  check('Play the voice: the lesson is heard in the recorded voice', await until(async () => (await sounds()).played.some((u) => /\/voice\/[0-9a-f]{8}\.mp3$/.test(u)), 10000), JSON.stringify(await sounds()));
  const urls = (await sounds()).played;
  const ok = await win.evaluate(async (u) => (await Promise.all(u.map((x) => fetch(x).then((r) => r.ok && r.headers.get('content-length') !== '0').catch(() => false)))).every(Boolean), urls);
  check('…its recordings are there', urls.length > 0 && ok, urls.join(' '));
  check('…not the computer’s voice', !(await sounds()).spoke.length);
  check('…sentence after sentence, step after step', await until(async () => new Set((await sounds()).played).size >= 4, 20000), String(new Set((await sounds()).played).size));
  await win.keyboard.press('Escape');
  await win.waitForTimeout(800);

  // Words only (Esc): nothing is heard
  await listen();
  await win.evaluate(() => (location.hash = '#/training'));
  await win.waitForTimeout(1200);
  await win.locator('[data-lesson="booth-check"] [data-lesson-show]').click();
  await until(() => ask.isVisible(), 6000);
  await win.keyboard.press('Escape');
  check('Esc is Words only: the lesson runs', await until(() => win.locator('[data-guide-card]').isVisible(), 8000));
  await win.waitForTimeout(5000);
  s = await sounds();
  check('…and nothing is heard', !s.played.length && !s.spoke.length, JSON.stringify(s));
  await win.keyboard.press('Escape');
  await win.waitForTimeout(800);

  // The demo asks too
  await listen();
  await win.evaluate(() => (location.hash = '#/training'));
  await win.waitForTimeout(1200);
  await win.locator('[data-lesson="demo"] [data-lesson-show]').click();
  check('the demo asks first', await until(() => ask.isVisible(), 10000));
  await win.waitForTimeout(1000);
  check('…and is silent while it asks', !(await sounds()).played.length);
  await win.locator('[data-ask-voice-yes]').click();
  check('…Play the voice: heard in the recorded voice', await until(async () => (await sounds()).played.some((u) => /\/voice\//.test(u)), 10000));
  await win.waitForTimeout(8000);
  await win.locator('[data-practice-band] button').click();
  await win.waitForTimeout(1000);
  check('every line said had its recording', missing.length === 0, missing.join(' | '));

  // Never during a service: Show me the fix while listening is words only
  await win.evaluate(() => (location.hash = '#/'));
  await win.waitForTimeout(2000);
  await win.locator('[data-guide="listen"]').click();
  await win.waitForTimeout(3000);
  await win.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cornerstone-settings') || '{}');
    localStorage.setItem('cornerstone-settings', JSON.stringify({ ...s, audioDevice: 'gone', audioDeviceName: 'Scarlett 4i4 USB' }));
    window.dispatchEvent(new Event('settings-updated'));
  });
  await win.waitForTimeout(1500);
  await listen();
  await win.locator('[data-booth-check]').click();
  await win.locator('[data-booth-check-list] [data-show-fix="mic"]').click({ timeout: 8000 });
  check('during a service, Show me the fix shows its line', await until(() => win.locator('[data-guide-narration]').isVisible(), 6000));
  check('…without asking', (await ask.count()) === 0);
  await win.waitForTimeout(4000);
  s = await sounds();
  check('…and says nothing aloud', !s.played.length && !s.spoke.length, JSON.stringify(s));
  await win.screenshot({ path: `${OUT}/guide-voice-2-service.png` });
  await win.keyboard.press('Escape');

  check('no errors in the window', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
