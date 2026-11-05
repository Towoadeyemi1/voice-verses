// Moment autopilot and sermon points on cue, with a spoken sermon (fake microphone): "let us pray"
// puts the service's Prayer part in Next, "point number two …" and "my third point. …" become
// point slides in Next; nothing goes on screen by itself. With both switched off, nothing moves.
// Needs `npm run models` and:  python tools/e2e/make-sermon-audio.py <voice.onnx> /tmp/vv-e2e/moments.wav moments
//   node tools/e2e/moments.cjs [path/to/moments.wav]
const path = require('path');
const { OUT, launch, check, done } = require('./lib.cjs');
const audio = process.argv[2] || path.join(OUT, 'moments.wav');

/** Listens to the whole recording; returns every Next label seen and what was live at the end. */
async function listen(name, features) {
  const { app, win, errors } = await launch(name, { audio });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1680, height: 1050 }));
  await win.evaluate((f) => {
    localStorage.setItem('voice-verses-features', JSON.stringify(f));
    localStorage.setItem('voice-verses-send-mode', 'auto');
  }, features);
  await win.reload();
  await win.waitForTimeout(3000);
  await win.getByRole('button', { name: 'Start listening' }).first().click();
  await win.waitForSelector('text=Using', { timeout: 150000 });
  const t0 = Date.now();
  const seen = [];
  for (let i = 0; i < 80; i++) {
    await win.waitForTimeout(400);
    const next = await win.evaluate(() => document.querySelector('[data-label-detail="next"]')?.textContent ?? '');
    if (next && next !== seen[seen.length - 1]?.next) {
      seen.push({ at: ((Date.now() - t0) / 1000).toFixed(1), next });
      console.log(`${seen[seen.length - 1].at}s Next: ${next}`);
      if (/Prayer(: [^·]+)? · spirit heard/.test(next)) await win.screenshot({ path: `${OUT}/${name}-prayer.png` });
      if (/Point 3/.test(next)) {
        await win.screenshot({ path: `${OUT}/${name}-point.png` });
        break;
      }
    }
  }
  const live = await win.evaluate(() => {
    const m = JSON.parse(localStorage.getItem('voice-verses-live') || 'null');
    return m?.data?.slide?.title || (m?.data?.verse ? 'a verse' : '');
  });
  const nextSlide = await win.evaluate(() => document.querySelector('[data-next]')?.textContent ?? '');
  await app.close();
  return { seen, live, errors, nextSlide };
}

(async () => {
  const on = await listen('moments-on', { momentAutopilot: true, sermonPoints: true });
  const labels = on.seen.map((s) => s.next).join(' | ');
  check('"let us pray" puts the Prayer part in Next', /Prayer(: [^·]+)? · spirit heard “[^”]*(pray|bow)[^”]*”/i.test(labels), labels.slice(0, 200));
  check('"point number two …" becomes Point 2 in Next', /Point 2 · spirit heard point 2/.test(labels), labels.slice(0, 260));
  check('"my third point." then its words become Point 3', /Point 3 · spirit heard/.test(labels));
  check('nothing went on screen by itself', !/Point|Prayer/.test(on.live), `live: ${on.live || 'nothing'}`);
  check('no page errors', on.errors.length === 0, on.errors.join(' | '));

  const off = await listen('moments-off', { momentAutopilot: false, sermonPoints: false });
  check('switched off: nothing moves', !off.seen.some((s) => /spirit heard/.test(s.next)), off.seen.map((s) => s.next).join(' | ').slice(0, 160));
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
