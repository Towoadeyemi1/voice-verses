// A fresh install: sample services and songs are added, the live screen opens on today's service
// (never blank), the demo plays through the real detector, and every page is photographed with content.
const { OUT, launch, check, done } = require('./lib.cjs');

(async () => {
  const { app, win, errors } = await launch('samples');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1680, height: 1050 }));
  await win.waitForTimeout(4000);
  await win.reload(); await win.waitForTimeout(3500);

  const db = await win.evaluate(() => new Promise((res) => { const r = indexedDB.open('cornerstone-bible-db'); r.onsuccess = () => { const t = r.result.transaction(['services', 'media']); const a = t.objectStore('services').getAll(); const b = t.objectStore('media').getAll(); t.oncomplete = () => res({ services: a.result.map((s) => s.name), songs: b.result.filter((m) => m.type === 'song').length }); }; }));
  check('three sample services added', db.services.filter((n) => n.startsWith('Sample:')).length === 3, db.services.join(', '));
  check('sample songs added', db.songs >= 9, `${db.songs} songs`);

  check('the live screen welcomes with today\'s service', (await win.locator('[data-welcome]').textContent()).includes('Sunday Celebration is ready'));
  const cards = await win.locator('[data-welcome] button[title^="Load"]').count();
  check('today\'s parts are shown as pictures', cards >= 8, `${cards} parts`);
  const next = await win.evaluate(() => document.body.innerText.includes('Countdown'));
  check('Next already holds the first slide', next);
  await win.screenshot({ path: `${OUT}/tour-1-live-welcome.png` });

  // The demo
  await win.getByRole('button', { name: /Watch a 1-minute demo/ }).click();
  const seen = new Set(); let predicted = ''; let newSong = false; let shotVerse = false; let shotSong = false;
  for (let i = 0; i < 140; i++) {
    await win.waitForTimeout(500);
    const live = await win.evaluate(() => { const m = JSON.parse(localStorage.getItem('voice-verses-live') || 'null'); const v = m?.data?.verse; const s = m?.data?.slide; return v ? `${v.book} ${v.chapter}:${v.verse}` : s ? `${s.songTitle || s.title} · ${s.sectionLabel ?? ''}` : ''; });
    if (live) seen.add(live);
    const text = await win.evaluate(() => document.body.innerText);
    if (/likely next/.test(text) && !predicted) predicted = (text.match(/Romans \d+:\d+ · likely next/) || [''])[0];
    if (/Singing something new/.test(text)) newSong = true;
    if (live === 'John 3:17' && !shotVerse) { shotVerse = true; await win.screenshot({ path: `${OUT}/tour-2-live-verse.png` }); }
    if (/Refrain/.test(live) && !shotSong) { shotSong = true; await win.screenshot({ path: `${OUT}/tour-3-live-song.png` }); }
    if (!(await win.locator('[data-demo]').count())) break;
  }
  const order = [...seen].join(' → ');
  check('demo: John 3:16 then 3:17 followed', seen.has('John 3:16') && seen.has('John 3:17'), order);
  check('demo: Romans predicted in Next', /Romans/.test(predicted), predicted);
  check('demo: the quoted verse found', seen.has('Romans 5:8'), order);
  check('demo: song followed and cued to Verse 2 and the Refrain', [...seen].some((s) => s.includes('Verse 2')) && [...seen].some((s) => s.includes('Refrain')), order);
  check('demo: new singing offered', newSong);

  // Every page, with content
  const pages = [['#/service-planner', 'tour-4-services'], ['#/media-library', 'tour-6-media'], ['#/templates', 'tour-7-looks'], ['#/display-manager', 'tour-8-screens'], ['#/settings', 'tour-9-settings']];
  for (const [hash, name] of pages) {
    await win.evaluate((h) => (location.hash = h), hash); await win.waitForTimeout(2500);
    await win.screenshot({ path: `${OUT}/${name}.png` });
  }
  await win.evaluate(() => (location.hash = '#/service-planner')); await win.waitForTimeout(1500);
  await win.getByRole('button', { name: 'Edit' }).first().click(); await win.waitForTimeout(2500);
  await win.screenshot({ path: `${OUT}/tour-5-service.png` });
  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
