// A spoken sermon through the built-in engine: a passage read verse by verse,
// a quote without a reference, then a song. Needs `npm run models` and the audio
// from make-sermon-audio.py. Prints what was on screen over time. ~2–3 min.
//   node tools/e2e/sermon.cjs [auto|preview] [path/to/sermon.wav]
const path = require('path');
const { OUT, launch, seedMedia, check, done } = require('./lib.cjs');
const mode = process.argv[2] || 'auto';
const audio = process.argv[3] || path.join(OUT, 'sermon.wav');

(async () => {
  const { app, win, errors } = await launch('sermon', { audio });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1900, height: 1150 }));
  await win.evaluate((m) => localStorage.setItem('voice-verses-send-mode', m), mode);
  await seedMedia(win, [{ id: 'song-grace', type: 'song', name: 'Amazing Grace', lyrics: "Verse 1\nAmazing grace how sweet the sound\nThat saved a wretch like me\nI once was lost but now am found\nWas blind but now I see\n\nVerse 2\n'Twas grace that taught my heart to fear\nAnd grace my fears relieved\nHow precious did that grace appear\nThe hour I first believed" }]);
  await win.reload(); await win.waitForTimeout(2500);
  await win.getByRole('button', { name: 'Start listening' }).click();
  await win.waitForSelector('text=Using', { timeout: 150000 });

  const t0 = Date.now(); const seen = new Set(); let last = '';
  for (let i = 0; i < 160; i++) {
    await win.waitForTimeout(500);
    const live = await win.evaluate(() => { try { const m = JSON.parse(localStorage.getItem('voice-verses-live') || 'null'); const v = m?.data?.verse; return v ? `${v.book} ${v.chapter}:${v.verse}` : m?.data?.slide?.songTitle ?? ''; } catch { return ''; } });
    // The suggestion bar shows one suggestion at a time
    const sugg = await win.evaluate(() => document.querySelector('[data-suggestion]')?.textContent?.replace(/\s+/g, ' ').slice(0, 140) ?? '');
    const state = `live=${live} sugg=[${sugg}]`;
    if (state !== last) { console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s ${state}`); last = state; }
    if (live) seen.add(live);
    if (/singing Amazing Grace/.test(sugg)) {
      await win.locator('[data-suggestion]').getByRole('button', { name: 'Show now' }).click().catch(() => {});
    }
  }
  await win.screenshot({ path: `${OUT}/sermon-${mode}.png` });
  if (mode === 'auto') {
    for (const v of ['John 5:8', 'John 5:9', 'John 5:10']) check(`${v} went live`, seen.has(v), [...seen].join(', '));
  }
  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
