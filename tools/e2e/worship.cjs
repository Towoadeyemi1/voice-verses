// Spoken worship through the built-in engine: Predictive Next after a hint, the leader's
// cues in a hymn ("go to the bridge", "back to the chorus"), then new singing captured
// as slides and saved as a draft song. Needs `npm run models` and the audio from
// make-worship-audio.py. ~2 min.
//   node tools/e2e/worship.cjs [path/to/worship.wav]
const path = require('path');
const { OUT, launch, seedMedia, check, done } = require('./lib.cjs');
const audio = process.argv[2] || path.join(OUT, 'worship.wav');

// A public-domain hymn with the Doxology as its chorus (never copyrighted lyrics in the repo)
const HYMN = 'Verse 1\nAmazing grace how sweet the sound\nThat saved a wretch like me\nI once was lost but now am found\nWas blind but now I see\n\nChorus\nPraise God from whom all blessings flow\nPraise Him all creatures here below\n\nBridge\nPraise Him above ye heavenly host\nPraise Father Son and Holy Ghost';

(async () => {
  const { app, win, errors } = await launch('worship', { audio });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1900, height: 1150 }));
  await win.evaluate(() => localStorage.setItem('voice-verses-send-mode', 'auto'));
  await seedMedia(win, [{ id: 'song-grace', type: 'song', name: 'Amazing Grace', lyrics: HYMN }]);
  await win.reload(); await win.waitForTimeout(2500);
  await win.getByRole('button', { name: 'Start listening' }).first().click();
  await win.waitForSelector('text=Using', { timeout: 150000 });

  const t0 = Date.now(); const seen = []; let last = ''; let predicted = ''; let captured = 0; let capturedText = '';
  for (let i = 0; i < 170; i++) {
    await win.waitForTimeout(500);
    const live = await win.evaluate(() => { try { const m = JSON.parse(localStorage.getItem('voice-verses-live') || 'null'); const v = m?.data?.verse; const s = m?.data?.slide; return v ? `${v.book} ${v.chapter}:${v.verse}` : s ? `${s.songTitle} · ${s.sectionLabel ?? ''} · ${s.content.split('\n')[0]}` : ''; } catch { return ''; } });
    const sugg = await win.evaluate(() => document.querySelector('[data-suggestion]')?.textContent?.replace(/\s+/g, ' ').slice(0, 120) ?? '');
    const next = await win.evaluate(() => [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && /likely next/.test(e.textContent || ''))?.textContent ?? '');
    const capture = await win.evaluate(() => document.querySelector('[data-capture]')?.textContent?.replace(/\s+/g, ' ') ?? '');
    const state = `live=${live} | next=${next} | sugg=[${sugg}] | capture=[${capture}]`;
    if (state !== last) { console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s ${state}`); last = state; }
    if (live && seen[seen.length - 1] !== live) seen.push(live);
    if (next && !predicted) predicted = next;
    if (/singing Amazing Grace/.test(sugg)) await win.locator('[data-suggestion]').getByRole('button', { name: 'Show now' }).click().catch(() => {});
    if (/Singing something new/.test(sugg)) await win.locator('[data-suggestion]').getByRole('button', { name: 'Show the words live' }).click().catch(() => {});
    const m = capture.match(/(\d+) lines?/);
    if (m) { captured = Math.max(captured, Number(m[1])); if (/Sung live/.test(live)) capturedText = live; }
  }
  await win.screenshot({ path: `${OUT}/worship.png` });

  check('John 3:16 went live', seen.includes('John 3:16'), seen.join(' → '));
  check('"Paul says the same thing in Romans": a Romans verse waits in Next', /^Romans \d+:\d+ · likely next/.test(predicted), predicted);
  const bridge = seen.findIndex((s) => s.includes('· Bridge ·'));
  check('"Go to the bridge" went to the bridge', bridge >= 0, seen.join(' → '));
  check('"Back to the chorus" went to the chorus after it', bridge >= 0 && seen.slice(bridge + 1).some((s) => s.includes('· Chorus ·')), seen.join(' → '));
  check('new singing shown live as it was sung', captured >= 2 && /Sung live/.test(capturedText), `${captured} lines; ${capturedText}`);

  // Stop: the words are kept as a draft song
  await win.getByRole('button', { name: 'Stop and save' }).click().catch(() => {});
  await win.waitForTimeout(1500);
  const drafts = await win.evaluate(() => new Promise((res) => { const r = indexedDB.open('cornerstone-bible-db'); r.onsuccess = () => { const q = r.result.transaction('media').objectStore('media').getAll(); q.onsuccess = () => res(q.result.filter((x) => (x.tags || []).includes('sung live')).map((x) => `${x.name} :: ${x.lyrics.replace(/\n/g, ' / ')}`)); }; }));
  check('kept as a draft song', drafts.length === 1, drafts.join(' | '));
  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
