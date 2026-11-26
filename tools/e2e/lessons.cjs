// More Training lessons (1.19.14): Screens and outputs, Plan a service from a template, and Teach
// spirit a cue (and Songs and slides, 1.19.17) each play through in Show me, in practice; Show me changes nothing real (no service
// planned; its example cue taken out again); Let me try plans a real service and keeps the cue the
// volunteer taught; every line said has its recording.
const { OUT, launch, answerVoice, check, done } = require('./lib.cjs');

(async () => {
  const { app, win, errors } = await launch('lessons');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1500, height: 1000 }));
  const missing = [];
  win.on('console', (m) => {
    if (/\[voice\] no recording/.test(m.text())) missing.push(m.text());
    if (/\[lesson\]/.test(m.text())) console.log('   ', m.text());
  });
  const card = win.locator('[data-guide-card]');
  const say = () => win.locator('[data-guide-say]').innerText().catch(() => '');
  const until = async (fn, ms) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await fn().catch(() => false)) return true;
      await win.waitForTimeout(250);
    }
    return false;
  };
  const services = () =>
    win.evaluate(
      () =>
        new Promise((res) => {
          const r = indexedDB.open('cornerstone-bible-db');
          r.onsuccess = () => {
            const q = r.result.transaction('services').objectStore('services').getAll();
            q.onsuccess = () => res(q.result.filter((s) => !s.isTemplate).length);
          };
        }),
    );
  const cues = () => win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-spirit') || '{}').cues?.map((c) => c.phrase) ?? []);
  const start = async (id, mode = 'show') => {
    await win.evaluate(() => (location.hash = '#/training'));
    await win.waitForTimeout(1200);
    await win.locator(`[data-lesson="${id}"] [data-lesson-${mode}]`).click();
    await answerVoice(win);
  };
  const finished = (id) => until(async () => (await card.count()) === 0 && !!JSON.parse((await win.evaluate(() => localStorage.getItem('voice-verses-training'))) || '{}').done?.[id], 120000);
  await win.waitForTimeout(2500);

  // Training lists them
  await win.evaluate(() => (location.hash = '#/training'));
  await win.waitForTimeout(1500);
  const listed = await win.locator('[data-lesson]').evaluateAll((els) => els.map((e) => e.dataset.lesson));
  check('Training has the new lessons', ['screens', 'plan', 'teach-cue', 'songs'].every((l) => listed.includes(l)), listed.join(','));

  // Screens and outputs
  await start('screens');
  check('Screens and outputs opens Settings on Screens', await until(async () => (await win.locator('[data-screens-page]').count()) === 1 && /This is your room/.test(await say()), 20000), await say());
  check('…in practice', (await win.locator('[data-practice-band]').count()) === 1);
  await win.waitForTimeout(900);
  // The light is on the room (the guide waits for the page and for any scroll before lighting it)
  const lit = async (sel) =>
    win.evaluate((sel) => {
      const t = document.querySelector(sel)?.getBoundingClientRect();
      const s = document.querySelector('[data-guide-spotlight]')?.getBoundingClientRect();
      return !!t && !!s && Math.abs(t.top - s.top) < 14 && Math.abs(t.left - s.left) < 14;
    }, sel);
  check('…the light is on the room', await lit('[data-guide="room"]'));
  await win.screenshot({ path: `${OUT}/lessons-1-screens.png` });
  check('…and on each output, scrolled into view', await until(async () => /stage monitor shows the preacher/.test(await say()) && (await lit('[data-output="confidence"]')), 60000));
  await win.screenshot({ path: `${OUT}/lessons-1b-stage.png` });
  check('…every output and the ways to connect', await until(async () => /ways to connect/.test(await say()), 90000), await say());
  check('…then Every screen on the live screen', await until(async () => /Every screen shows each output/.test(await say()), 20000));
  check('…and it finishes, ticked off', await finished('screens'));

  // Plan a service from a template: Show me plans nothing real
  const before = await services();
  await start('plan');
  check('Plan a service starts on Services', await until(async () => /This is Services/.test(await say()), 20000), await say());
  check('…shows Use for the day without doing it', await until(async () => /Use for the day/.test(await say()), 30000));
  await win.screenshot({ path: `${OUT}/lessons-2-plan.png` });
  check('…and finishes', await finished('plan'));
  check('Show me planned no service', (await services()) === before, `${before} → ${await services()}`);

  // Let me try plans a real one
  await start('plan', 'try');
  await until(async () => /Use for the day/.test(await say()), 40000);
  await win.locator('[data-ready-order] button').first().click();
  check('Let me try: Use for the day plans a real service', await until(async () => (await services()) === before + 1, 10000), `${before} → ${await services()}`);
  check('…and says so', await until(async () => /The service is planned/.test(await win.locator('[data-guide-card]').innerText().catch(() => '')), 8000));
  await win.keyboard.press('Escape');
  await win.waitForTimeout(800);

  // Teach spirit a cue: Show me's example is taken out again
  const cuesBefore = await cues();
  await start('teach-cue');
  check('Teach spirit a cue opens Cues', await until(async () => (await win.locator('[data-cues-page]').count()) === 1, 20000));
  check('…types an example and teaches it', await until(async () => (await cues()).includes('the ushers will come forward'), 40000), JSON.stringify(await cues()));
  await win.screenshot({ path: `${OUT}/lessons-3-cue.png` });
  check('…and finishes', await finished('teach-cue'));
  check('…its example is taken out again', !(await cues()).includes('the ushers will come forward'));
  const cuesNow = await cues();
  check('…and the cues the church had are all still there', cuesBefore.every((c) => cuesNow.includes(c)));

  // Let me try keeps the volunteer's own cue
  await start('teach-cue', 'try');
  await until(async () => /Open Cues/.test(await say()), 20000);
  await win.locator('[data-pane="cues"]').click();
  await until(async () => /Type words your preacher/.test(await say()), 30000);
  await win.locator('#cue-phrase').fill('please stand for the reading');
  await until(async () => /Then choose what to get ready/.test(await say()), 10000);
  await until(async () => /Press Teach spirit/.test(await say()), 15000);
  await win.locator('[data-teach-cue]').click();
  check('Let me try: the volunteer’s cue is taught', await until(async () => (await cues()).includes('please stand for the reading'), 8000));
  check('…and says so', await until(async () => /spirit knows it now/.test(await card.innerText().catch(() => '')), 8000));
  await win.keyboard.press('Escape');
  await win.waitForTimeout(800);
  check('…and kept after the lesson', (await cues()).includes('please stand for the reading'));

  // Songs and slides: Media, then a song slide by slide on the live screen, Quick edit opened and cancelled
  const room = () => win.evaluate(() => localStorage.getItem('voice-verses-live'));
  const songWords = () =>
    win.evaluate(
      () =>
        new Promise((res) => {
          const r = indexedDB.open('cornerstone-bible-db');
          r.onsuccess = () => {
            const q = r.result.transaction('media').objectStore('media').getAll();
            q.onsuccess = () => res(JSON.stringify(q.result.filter((m) => m.type === 'song').map((m) => [m.id, m.lyrics])));
          };
        }),
    );
  const roomBefore = await room();
  const wordsBefore = await songWords();
  const liveKey = () => win.evaluate(() => document.querySelector('[aria-label="Slides"] [role="listitem"]:has([data-state="live"])')?.getAttribute('data-key') ?? '');
  await start('songs');
  check('Songs and slides starts in Media, at Add files', await until(async () => (await win.locator('[data-add-files]').count()) > 0 && /SongSelect/.test(await say()), 20000), await say());
  await win.screenshot({ path: `${OUT}/lessons-4-media.png` });
  check('…opens the Library on the live screen, at Songs', await until(async () => (await win.locator('[data-library-song]').count()) > 0, 40000));
  check('…a song’s slides come along the bottom', await until(async () => (await win.locator('[aria-label="Slides"] [data-state]').count()) > 0, 30000));
  check('…its first slide goes on Live', await until(async () => !!(await liveKey()), 20000));
  const first = await liveKey();
  check('…then Take moves on a slide', await until(async () => !!(await liveKey()) && (await liveKey()) !== first, 30000), `${first} → ${await liveKey()}`);
  check('…the pencil opens Quick edit', await until(async () => (await win.locator('[data-quick-edit-dialog]').count()) === 1, 30000));
  await win.screenshot({ path: `${OUT}/lessons-4-quick-edit.png` });
  check('…Cancel closes it', await until(async () => (await win.locator('[data-quick-edit-dialog]').count()) === 0 && /See all slides/.test(await say()), 40000), await say());
  check('…and it finishes', await finished('songs'));
  check('…the room never saw it', (await room()) === roomBefore);
  check('…and no song was changed', (await songWords()) === wordsBefore);

  check('every line said has its recording', missing.length === 0, missing.join(' | '));
  check('no errors in the window', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
