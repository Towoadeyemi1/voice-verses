// spirit for the whole service (1.18.0), in the real app with the sample Sunday service:
//  - "What spirit will do next" under the order of service, with the type of service;
//  - the Countdown part's countdown reaching zero gets Welcome ready in Next; Take counts it right;
//  - the last slide of a song gets the next song ready; "Not this" → "Wrong part" is remembered;
//  - Pause (P): nothing is got ready; Resume;
//  - a move that has earned Hands-free goes live by itself after its 3-second countdown;
//  - Settings → What spirit does shows each move's record; How it went when listening stops.
// Uses any short recording for the microphone (default: /tmp/vv-e2e/moments.wav).
const path = require('path');
const { OUT, launch, check, done } = require('./lib.cjs');
const audio = process.argv[2] || path.join(OUT, 'moments.wav');

const part = (win, name) => win.locator(`nav[aria-label="Order of service"] button[title*="${name}"]`).first();
const tiles = (win) => win.locator('section[aria-label="Slides"] [role="listitem"]');
const spirit = (win) => win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-spirit') || '{}'));
const nextLabel = (win) => win.evaluate(() => document.querySelector('[data-label-detail="next"]')?.textContent ?? '');
const liveTitle = (win) => win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-live') || 'null')?.data?.slide?.title ?? '');
const until = async (win, test, ms = 15000) => {
  for (let t = 0; t < ms; t += 250) {
    if (await test()) return true;
    await win.waitForTimeout(250);
  }
  return false;
};

(async () => {
  const { app, win, errors } = await launch('spirit-moves', { audio });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1680, height: 1050 }));
  await win.waitForTimeout(4000);
  // The sample Sunday service, with a 6-second countdown before it
  await win.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('cornerstone-bible-db');
        r.onsuccess = () => {
          const t = r.result.transaction('services', 'readwrite');
          const store = t.objectStore('services');
          const q = store.getAll();
          q.onsuccess = () => {
            const s = q.result.find((x) => x.name === 'Sample: Sunday Celebration');
            s.sections[0].subsections[0].countdown.durationMinutes = 0.1;
            store.put(s);
          };
          t.oncomplete = () => res(true);
        };
      }),
  );
  await win.evaluate(() => {
    localStorage.removeItem('voice-verses-spirit');
    localStorage.setItem('voice-verses-click-mode', 'live');
  });
  await win.reload();
  await win.waitForTimeout(3500);

  const strip = win.locator('[data-spirit-strip]');
  check('spirit’s strip shows under the order of service, with the type of service', /spirit · Sunday service/.test((await strip.textContent()) || ''), (await strip.textContent())?.slice(0, 120));

  // 1. The countdown into the welcome
  await part(win, 'Countdown').click();
  await win.waitForTimeout(800);
  const expecting = (await strip.textContent()) || '';
  check('the strip says what comes when the countdown ends', /Welcome\s*when the countdown ends\s*Ready in Next/.test(expecting), expecting.slice(0, 160));
  await win.screenshot({ path: `${OUT}/spirit-moves-1-strip.png` });
  const ready = await until(win, async () => /Welcome/.test(await nextLabel(win)) && /countdown ended/.test(await nextLabel(win)));
  check('when the countdown ends, Welcome is ready in Next', ready, await nextLabel(win));
  await win.screenshot({ path: `${OUT}/spirit-moves-2-countdown.png` });
  await win.getByRole('button', { name: /^Take/ }).click();
  await win.waitForTimeout(800);
  let st = await spirit(win);
  check('Take counts the move right', (st.moves?.['countdown-end']?.record ?? []).join(',') === 'right', JSON.stringify(st.moves));
  check('…and the event knows its service and type', st.events.some((e) => e.move === 'countdown-end' && e.kind === 'right' && e.type === 'Sunday service' && e.serviceId));

  // 2. The next song, and "Not this"
  await part(win, 'Holy, Holy, Holy').click();
  await win.waitForTimeout(1000);
  const n = await tiles(win).count();
  await tiles(win).nth(n - 1).locator('button').first().click();
  await win.waitForTimeout(1000);
  check('the last slide of a song gets the next song ready', /Blessed Assurance/.test(await nextLabel(win)) && /last slide/.test(await nextLabel(win)), await nextLabel(win));
  await win.screenshot({ path: `${OUT}/spirit-moves-3-next-song.png` });
  await win.locator('[data-not-this]').click();
  await win.waitForTimeout(300);
  await win.getByRole('button', { name: 'Wrong part' }).click();
  await win.waitForTimeout(600);
  st = await spirit(win);
  check('"Not this" → "Wrong part" is remembered against the move', (st.moves?.['next-song']?.record ?? []).join(',') === 'wrong', JSON.stringify(st.moves?.['next-song']));
  check('…and Next no longer holds the song', !/Blessed Assurance/.test(await nextLabel(win)), await nextLabel(win));

  // 3. Pause
  await win.locator('body').click({ position: { x: 5, y: 1000 } });
  await win.keyboard.press('p');
  await win.waitForTimeout(500);
  check('P pauses spirit', /spirit is paused/.test((await strip.textContent()) || ''));
  await win.screenshot({ path: `${OUT}/spirit-moves-4-paused.png` });
  await tiles(win).nth(n - 2).locator('button').first().click();
  await win.waitForTimeout(500);
  await tiles(win).nth(n - 1).locator('button').first().click();
  await win.waitForTimeout(1000);
  check('while paused, nothing is got ready', !/last slide/.test(await nextLabel(win)), await nextLabel(win));
  await win.locator('[data-spirit-pause]').click();
  await win.waitForTimeout(400);
  check('Resume', !/spirit is paused/.test((await strip.textContent()) || ''));

  // 4. Hands-free: the countdown move has earned it
  await win.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('voice-verses-spirit'));
    s.level = 'handsfree';
    s.moves['countdown-end'] = { level: 'handsfree', record: Array(10).fill('right'), streak: 10, updatedAt: new Date().toISOString() };
    localStorage.setItem('voice-verses-spirit', JSON.stringify(s));
    window.dispatchEvent(new Event('voice-verses-spirit-changed'));
  });
  await win.waitForTimeout(500);
  await part(win, 'Countdown').click();
  const wentLive = await until(win, async () => (await liveTitle(win)) === 'Welcome home', 16000);
  check('a move that has earned Hands-free goes live by itself', wentLive, `live: ${await liveTitle(win)}`);
  st = await spirit(win);
  check('…and counts as right', st.moves['countdown-end'].streak === 11, JSON.stringify(st.moves['countdown-end']));

  // 5. Settings → What spirit does
  await win.getByRole('button', { name: 'Settings' }).first().click();
  await win.waitForTimeout(800);
  await win.locator('[data-pane="moves"]').click();
  await win.waitForTimeout(800);
  const rows = await win.locator('[data-move]').evaluateAll((els) => els.map((e) => e.dataset.move));
  check('What spirit does lists every move', rows.length === 7 && rows.includes('countdown-end') && rows.includes('next-song'), rows.join(','));
  const nextSongRow = (await win.locator('[data-move="next-song"]').textContent()) || '';
  check('…with Hands-free for the next song still to come', /Hands-free soon/.test(nextSongRow), nextSongRow.slice(0, 120));
  await win.screenshot({ path: `${OUT}/spirit-moves-5-settings.png` });
  await win.keyboard.press('Escape');
  await win.waitForTimeout(600);

  // 6. How it went, when listening stops
  await win.getByRole('button', { name: 'Start listening' }).first().click();
  await win.waitForSelector('text=Using', { timeout: 150000 }).catch(() => {});
  await win.waitForTimeout(1500);
  await win.getByRole('button', { name: 'Stop listening' }).first().click();
  await win.waitForTimeout(1200);
  const how = win.locator('[data-how-it-went]');
  check('How it went opens when listening stops', (await how.count()) === 1);
  const text = (await how.textContent()) || '';
  check('…with spirit’s score and the correction', /of 6 moves/.test(text) && /Wrong part|wrong part/i.test(text), text.slice(0, 220));
  await win.screenshot({ path: `${OUT}/spirit-moves-6-how-it-went.png` });
  await how.getByRole('button', { name: 'Just this once' }).first().click();
  await win.waitForTimeout(500);
  st = await spirit(win);
  check('"Just this once" undoes the correction', st.events.some((e) => e.move === 'next-song' && e.kind === 'wrong' && e.forgiven) && (st.moves['next-song'].record ?? []).length === 0, JSON.stringify(st.moves['next-song']));

  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
