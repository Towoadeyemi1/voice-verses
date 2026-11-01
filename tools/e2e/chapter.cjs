// A spoken sermon (fake microphone) that names a chapter without a verse, then reads a verse of it,
// names another ("verse 6"), tells a story in its own words and asks "help me find it".
// Needs `npm run models` and:  python tools/e2e/make-sermon-audio.py <voice.onnx> /tmp/vv-e2e/chapter.wav chapter
//   node tools/e2e/chapter.cjs [path/to/chapter.wav]
const path = require('path');
const { OUT, launch, check, done } = require('./lib.cjs');
const audio = process.argv[2] || path.join(OUT, 'chapter.wav');

(async () => {
  const { app, win, errors } = await launch('chapter', { audio });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1680, height: 1050 }));
  await win.evaluate(() => localStorage.setItem('voice-verses-send-mode', 'auto'));
  await win.reload();
  await win.waitForTimeout(3000);
  await win.getByRole('button', { name: 'Start listening' }).first().click();
  await win.waitForSelector('text=Using', { timeout: 150000 });

  const t0 = Date.now();
  const timeline = [];
  let last = '';
  let calledShot = false;
  let nextWhileCalled = '';
  let liveWhileCalled = '';
  for (let i = 0; i < 110; i++) {
    await win.waitForTimeout(400);
    const state = await win.evaluate(() => {
      const m = JSON.parse(localStorage.getItem('voice-verses-live') || 'null');
      const v = m?.data?.verse;
      return {
        live: v ? `${v.book} ${v.chapter}:${v.verse}` : '',
        title: document.querySelector('main h1')?.textContent ?? '',
        sub: document.querySelector('main h1')?.parentElement?.textContent ?? '',
        next: document.body.innerText.match(/Next\s+(Isaiah \d+:\d+)/)?.[1] ?? '',
        sugg: document.querySelector('[data-suggestion]')?.textContent?.replace(/\s+/g, ' ').slice(0, 90) ?? '',
      };
    });
    const line = `live=${state.live} title=${state.title} sugg=[${state.sugg}]`;
    if (line !== last) {
      timeline.push(`${((Date.now() - t0) / 1000).toFixed(1)}s ${line}`);
      console.log(timeline[timeline.length - 1]);
      last = line;
    }
    if (/which verse/.test(state.sub) && !calledShot) {
      calledShot = true;
      liveWhileCalled = state.live;
      nextWhileCalled = state.next;
      await win.screenshot({ path: `${OUT}/chapter-1-called.png` });
    }
    if (/Luke 19/.test(state.sugg)) break;
  }
  const seen = timeline.join('\n');
  check('a chapter named alone is loaded and waits for the verse', calledShot, seen.split('\n')[0]);
  check('verse 1 is not pushed to the screens', !/Isaiah 53:1\b/.test(liveWhileCalled), liveWhileCalled || 'nothing live');
  check('verse 1 waits in Next instead', nextWhileCalled === 'Isaiah 53:1', nextWhileCalled);
  check('the verse read goes up', /live=Isaiah 53:5/.test(seen));
  check('"verse 6" goes up', /live=Isaiah 53:6/.test(seen));
  check('Isaiah 53:1 never went up', !/live=Isaiah 53:1 /.test(seen));
  check('the story is offered (Zacchaeus, Luke 19)', /Luke 19/.test(seen));

  // Every suggestion, newest first, from the bar
  await win.waitForTimeout(2500);
  await win.locator('[data-suggestion] button[title^="See every suggestion"]').click();
  await win.waitForTimeout(600);
  const listed = await win.locator('[data-suggestion-list] [role="listitem"]').count();
  check('the suggestions open as a list', listed >= 1, `${listed} in the list`);
  await win.screenshot({ path: `${OUT}/chapter-2-suggestions.png` });
  await win.locator('[data-suggestion-list] [role="listitem"]').first().getByRole('button', { name: 'Use' }).click();
  await win.waitForTimeout(800);
  const next = await win.evaluate(() => document.body.innerText.match(/Next\s+([1-3]?\s?[A-Za-z]+ \d+:\d+)/)?.[1] ?? '');
  check('a suggestion from the list goes into Next', /\d+:\d+/.test(next), next);
  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
