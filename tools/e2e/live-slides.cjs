// The live screen shows every slide of what is loaded (strip and grid), the switch above Live
// chooses whether picking a slide goes live or waits in Next, Quick edit saves to the service,
// a part's own countdown starts with it, the Bible translation changes from the live screen,
// several services on one day can be switched, and the service can move on by time.
const { OUT, launch, check, done } = require('./lib.cjs');

const liveNow = (win) =>
  win.evaluate(() => {
    const m = JSON.parse(localStorage.getItem('voice-verses-live') || 'null');
    const v = m?.data?.verse;
    const s = m?.data?.slide;
    return v ? { verse: `${v.book} ${v.chapter}:${v.verse}`, text: v.text } : s ? { slide: s.id, label: s.sectionLabel || s.title, content: s.content } : {};
  });
const part = (win, name) => win.locator(`nav[aria-label="Order of service"] button[title*="${name}"]`).first();
const tiles = (win) => win.locator('section[aria-label="Slides"] [role="listitem"]');

(async () => {
  const { app, win, errors } = await launch('live-slides');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1680, height: 1050 }));
  await win.waitForTimeout(4000);
  await win.reload();
  await win.waitForTimeout(3500);

  // Every slide of a song, along the bottom
  await part(win, 'Holy, Holy, Holy').click();
  await win.waitForTimeout(1200);
  const count = await tiles(win).count();
  check('the song’s slides are all shown in the strip', count >= 4, `${count} slides`);
  check('picking waits in Next by default', (await win.locator('[role="radio"][aria-checked="true"]', { hasText: 'Waits in Next' }).count()) === 1);
  await win.screenshot({ path: `${OUT}/live-slides-1-strip.png` });

  // Click: into Next; double-click: on screen
  await tiles(win).nth(1).locator('button').first().click();
  await win.waitForTimeout(500);
  check('a click puts the slide in Next', (await tiles(win).nth(1).locator('[data-state="next"]').count()) === 1);
  await tiles(win).nth(2).locator('button').first().dblclick();
  await win.waitForTimeout(800);
  const third = await liveNow(win);
  check('a double-click shows it now', (await tiles(win).nth(2).locator('[data-state="live"]').count()) === 1, JSON.stringify(third).slice(0, 80));

  // The switch above Live: picking a slide goes live
  await win.getByRole('radio', { name: /Goes live/ }).click();
  await win.waitForTimeout(400);
  await tiles(win).nth(3).locator('button').first().click();
  await win.waitForTimeout(800);
  check('with “Goes live”, a click shows the slide at once', (await tiles(win).nth(3).locator('[data-state="live"]').count()) === 1);
  check('the choice is remembered', (await win.evaluate(() => localStorage.getItem('voice-verses-click-mode'))) === 'live');
  await win.screenshot({ path: `${OUT}/live-slides-2-goes-live.png` });

  // Every slide as a grid
  await win.getByRole('button', { name: /See all slides/ }).click();
  await win.waitForTimeout(800);
  await win.screenshot({ path: `${OUT}/live-slides-3-grid.png` });
  await win.getByRole('button', { name: /Show the words large/ }).click();
  await win.waitForTimeout(400);

  // Quick edit the slide on screen: the screens and the service both change
  await win.getByTitle(/Quick edit: change the words or the look of what is on the screens/).click();
  await win.waitForTimeout(600);
  await win.screenshot({ path: `${OUT}/live-slides-4-quick-edit.png` });
  await win.locator('[role="dialog"] textarea').fill('Words changed on the go\nSecond line');
  await win.getByRole('button', { name: 'Save and update the screens' }).click();
  await win.waitForTimeout(1200);
  const edited = await liveNow(win);
  check('quick edit updates the screens', edited.content === 'Words changed on the go\nSecond line', JSON.stringify(edited).slice(0, 90));
  const saved = await win.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('cornerstone-bible-db');
        r.onsuccess = () => {
          const t = r.result.transaction('services');
          const q = t.objectStore('services').getAll();
          t.oncomplete = () => res(JSON.stringify(q.result).includes('Words changed on the go'));
        };
      }),
  );
  check('quick edit is saved to the service', saved);

  // The Countdown part starts its countdown when it goes on screen
  await part(win, 'Countdown').click();
  await win.waitForTimeout(1200);
  const countdowns = await win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-countdown') || '[]'));
  check('the Countdown part starts its countdown', Array.isArray(countdowns) && countdowns.some((c) => /begin/i.test(c.message)), JSON.stringify(countdowns).slice(0, 120));
  check('the strip says it is running', /running/.test((await win.locator('[data-part-countdown]').textContent()) || ''));
  await win.screenshot({ path: `${OUT}/live-slides-5-countdown.png` });
  await part(win, 'Welcome').click();
  await win.waitForTimeout(1000);
  const after = await win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-countdown') || '[]'));
  check('moving on stops the part’s countdown', !after.length, JSON.stringify(after).slice(0, 80));

  // The Bible translation, from the live screen
  await win.keyboard.press('Control+k');
  await win.waitForTimeout(400);
  await win.keyboard.type('John 3:16');
  await win.keyboard.press('Enter');
  await win.waitForTimeout(1500);
  const kjv = await liveNow(win);
  await win.locator('main [data-version-switcher]').click();
  await win.waitForTimeout(400);
  await win.getByRole('menuitem', { name: /World English Bible/ }).click();
  await win.waitForTimeout(1500);
  const web = await liveNow(win);
  check('changing the translation changes the verse on screen', kjv.verse === 'John 3:16' && web.verse === 'John 3:16' && kjv.text !== web.text, `${(kjv.text || '').slice(0, 40)} → ${(web.text || '').slice(0, 40)}`);
  await win.screenshot({ path: `${OUT}/live-slides-6-version.png` });

  // Two services today, one of them moving on quickly by time
  await win.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('cornerstone-bible-db');
        r.onsuccess = () => {
          const t = r.result.transaction('services', 'readwrite');
          const store = t.objectStore('services');
          const q = store.getAll();
          q.onsuccess = () => {
            const sample = q.result.find((s) => s.name === 'Sample: Sunday Celebration');
            const copy = (name, startTime, n) => {
              const s = JSON.parse(JSON.stringify(sample));
              s.id = `svc-${n}`;
              s.name = name;
              s.startTime = startTime;
              s.sample = false;
              s.sections.forEach((sec) => sec.subsections.forEach((it) => { it.id = `${it.id}-${n}`; it.slides.forEach((sl) => (sl.id = `${sl.id}-${n}`)); }));
              // Welcome lasts 3 seconds, to see it move on
              s.sections[0].subsections[1].countdown = { enabled: false, durationMinutes: 0.05, displayTargets: ['confidence'], alertEnabled: false };
              return s;
            };
            store.put(copy('First Service', '00:01', 1));
            store.put(copy('Second Service', '23:58', 2));
          };
          t.oncomplete = () => res(true);
        };
      }),
  );
  await win.evaluate(() => localStorage.removeItem('voice-verses-last-service'));
  await win.reload();
  await win.waitForTimeout(3500);
  const picker = win.getByRole('radiogroup', { name: "Today's services" });
  check('both of today’s services are listed', (await picker.getByRole('radio').count()) === 2);
  check('the one under way is chosen', /First Service/.test((await picker.locator('[aria-checked="true"]').textContent()) || ''));
  await picker.getByRole('radio', { name: /Second Service/ }).click();
  await win.waitForTimeout(800);
  check('switching shows the other service', /Second Service/.test((await picker.locator('[aria-checked="true"]').textContent()) || ''));
  await win.screenshot({ path: `${OUT}/live-slides-7-two-services.png` });

  await win.getByRole('switch', { name: /Move on by time/ }).click();
  await part(win, 'Welcome').click();
  await win.waitForTimeout(1200);
  check('the part’s time left shows on the timeline', (await win.locator('[data-time-left]').count()) === 1);
  await win.waitForTimeout(4000);
  const moved = await liveNow(win);
  check('when its time is up the next part goes on screen', /Holy/.test(moved.label || '') || /Holy/i.test(moved.content || ''), JSON.stringify(moved).slice(0, 90));

  // The Library's service list, grouped
  await win.getByRole('button', { name: 'Library' }).click();
  await win.waitForTimeout(600);
  await win.getByRole('tab', { name: /Service/ }).click();
  await win.waitForTimeout(400);
  await win.getByTitle('All services').click();
  await win.waitForTimeout(400);
  const list = (await win.locator('[data-service-list]').textContent()) || '';
  check('the Library lists services by Today, Coming up and Samples', /Today/.test(list) && /Samples/.test(list), list.slice(0, 80));
  await win.screenshot({ path: `${OUT}/live-slides-8-library.png` });

  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
