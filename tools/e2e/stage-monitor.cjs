// The stage monitor (1.19.21, approved mock-up docs/design/stage-monitor.html), on a pretend second
// screen: what is on is named once at the top (NOW · what · its part); a verse shows its reference and
// Next is the next verse; a song shows its part (Verse 1) and Next is named by the song's next part, not
// the song's name again; on the last slide of a song, Next carries on into the next part of the service;
// Next can be switched off; settings saved with the old small sizes move to the new ones; the 1920 × 1080
// design scales to any TV; every word on it is readable (measured on the real pixels).
const { OUT, launch, plugInSecondDisplay, check, done } = require('./lib.cjs');
const { auditContrast } = require('../checks/check-contrast.cjs');

(async () => {
  const { app, win, errors } = await launch('stage-monitor');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1440, height: 1000 }));
  await win.waitForTimeout(2500);
  // Saved before 1.19.21 with the Classic layout's old sizes
  await win.evaluate(() => localStorage.setItem('cornerstone-confidence-settings', JSON.stringify({ currentVerseFontSize: 60, nextVerseFontSize: 24, clockFontSize: 36, backgroundColor: '#000000', textColor: '#FFFFFF', accentColor: '#3B82F6', clockFormat: '12h', nextVerseCount: 1 })));
  await plugInSecondDisplay(app);
  await win.evaluate(async () => { const c = await window.voiceVerses.screens.get(); return window.voiceVerses.screens.set({ ...c, confidence: 4242 }); });
  await win.waitForTimeout(2500);
  const stage = app.windows().find((w) => w.url().includes('/confidence'));
  check('the stage monitor opens on the second screen', !!stage);
  const text = (sel) => stage.locator(sel).first().innerText().catch(() => '');
  const until = async (fn, ms = 8000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await fn().catch(() => false)) return true;
      await win.waitForTimeout(200);
    }
    return false;
  };
  const take = () => win.locator('[data-guide="take"]').click();

  check('before anything is on, it says so', await until(async () => /Nothing on the screens/.test(await text('[data-stage-now]'))), await text('[data-stage-now]'));
  const scale = await stage.evaluate(() => getComputedStyle(document.querySelector('[data-stage]')).transform);
  check('the 1920 × 1080 design fills a 1080p TV as it is', /matrix\(1, 0, 0, 1/.test(scale) || scale === 'none', scale);

  // A verse
  await win.evaluate(() => (location.hash = '#/'));
  await win.waitForTimeout(1500);
  await win.keyboard.press('Control+k');
  await win.keyboard.type('Romans 8:28');
  await win.waitForTimeout(600);
  await win.keyboard.press('Enter');
  await win.waitForTimeout(400);
  await take();
  check('a verse: NOW names it once', await until(async () => /NOW\s*Romans 8:28\s*· Scripture/.test(await text('[data-stage-now]'))), await text('[data-stage-now]'));
  check('…and Next is the next verse', await until(async () => /Romans 8:29 · next verse/.test(await text('[data-stage-next-name]'))), await text('[data-stage-next-name]'));
  const nameSize = await stage.locator('[data-stage-next-name]').first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  check('settings saved with the old small sizes move to the new ones (Next readable from the platform)', nameSize >= 44, `${nameSize}px`);
  await stage.screenshot({ path: `${OUT}/stage-1-verse.png` });

  // A hymn from the sample service
  await win.locator('button').filter({ hasText: /^.*Holy, Holy, Holy/ }).first().click();
  await win.waitForTimeout(800);
  if (!(await win.locator('[aria-label="Slides"] [data-state="live"]').count())) await take();
  check('a song: NOW names the song and the part being sung', await until(async () => /Holy, Holy, Holy\s*· \S/.test(await text('[data-stage-now]'))), await text('[data-stage-now]'));
  const next = await text('[data-stage-next-name]');
  check('…and Next is named by the next part of the song, not the song again', /· Holy, Holy, Holy$/.test(next) && !/^Holy, Holy, Holy/.test(next), next);
  await stage.screenshot({ path: `${OUT}/stage-2-song.png` });

  // Its last slide: Next carries on into the next part of the service
  const slides = await win.locator('[aria-label="Slides"] [role="listitem"]').count();
  for (let i = 0; i < slides; i++) {
    const last = await win.locator('[aria-label="Slides"] [role="listitem"]').last().locator('[data-state="live"]').count();
    if (last) break;
    await take();
    await win.waitForTimeout(500);
  }
  check('the last slide of the song: Next is the next part of the service', await until(async () => /^Blessed Assurance · \S/.test(await text('[data-stage-next-name]'))), await text('[data-stage-next-name]'));
  await stage.screenshot({ path: `${OUT}/stage-3-last-slide.png` });

  // Every word on it readable
  const res = await auditContrast(stage);
  const fails = res.filter((r) => !r.pass);
  check('every word on the stage monitor is readable (4.5:1, measured)', fails.length === 0, `${res.length - fails.length} of ${res.length}${fails.length ? ': ' + fails.map((f) => `${f.ratio} "${f.text}"`).join(', ') : ''}`);

  // Next switched off
  await stage.evaluate(() => { const s = JSON.parse(localStorage.getItem('cornerstone-confidence-settings')); s.nextVerseCount = 0; localStorage.setItem('cornerstone-confidence-settings', JSON.stringify(s)); location.reload(); });
  await win.waitForTimeout(2500);
  check('Next switched off: only what is on', (await stage.locator('[data-stage-next]').count()) === 0 && /Holy, Holy, Holy/.test(await text('[data-stage-now]')));

  // A 720p TV: the same design, smaller
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('/confidence'))?.setBounds({ x: 1440, y: 0, width: 1280, height: 720 }));
  await win.waitForTimeout(1200);
  const small = await stage.evaluate(() => getComputedStyle(document.querySelector('[data-stage]')).transform);
  check('a 720p TV shows the same design, scaled', /matrix\(0\.66/.test(small), small);

  check('no errors in the window', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
