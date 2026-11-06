// Listening must stay light, whatever spirit has learned (1.18.2): a week of heard sentences and
// events is saved, a service is loaded, and a spoken sermon is played. While it plays:
//  - spirit's saved learning is written only a few times (not once per sentence);
//  - the speech engine keeps up, giving live (partial) results while words are spoken;
//  - the window is rarely busy (long tasks).
// Prints the CPU of each kind of process, to compare versions (docs/LESSONS.md, "Listening got slower").
// Needs `npm run models` and /tmp/vv-e2e/sermon.wav (make-sermon-audio.py).
const path = require('path');
const { OUT, launch, check, done } = require('./lib.cjs');
const audio = process.argv[2] || path.join(OUT, 'sermon.wav');

(async () => {
  const { app, win, errors } = await launch('listening-load', { audio });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1680, height: 1050 }));
  await win.waitForTimeout(4000);
  await win.evaluate(() => {
    const now = Date.now();
    const iso = (ms) => new Date(ms).toISOString();
    const heard = Array.from({ length: 3000 }, (_, i) => ({ at: iso(now - (3000 - i) * 60_000), text: `Sentence ${i} of a long sermon about grace and the love of God for every one of us` }));
    const events = Array.from({ length: 3000 }, (_, i) => ({ at: iso(now - (3000 - i) * 60_000), kind: ['ready', 'right', 'manual', 'wrong'][i % 4], serviceId: `s${i % 9}`, type: 'Sunday service', what: 'Offering' }));
    const observations = Array.from({ length: 300 }, (_, i) => ({ id: `obs${i}`, at: iso(now - i * 600_000), part: ['Prayer', 'Offering', 'Notices'][i % 3], sentences: ['Let us go to the Lord together in prayer now'] }));
    localStorage.setItem('voice-verses-spirit', JSON.stringify({ level: 'next', cues: [], observations, dismissed: [], events, heard, moves: {}, timings: [], updatedAt: iso(now) }));
    localStorage.setItem('voice-verses-features', JSON.stringify({ momentAutopilot: true, sermonPoints: true }));
  });
  await win.reload();
  await win.waitForTimeout(3500);
  await win.evaluate(() => {
    window.__ev = [];
    window.__long = [];
    window.__spiritWrites = 0;
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'voice-verses-spirit') window.__spiritWrites++;
      return set.call(this, k, v);
    };
    window.voiceVerses.speech.onEvent((e) => window.__ev.push({ type: e.type }));
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ type: 'longtask' });
  });
  await win.getByRole('button', { name: 'Start listening' }).first().click();
  await win.waitForSelector('text=Using', { timeout: 150000 });
  const cpu = [];
  for (let s = 0; s < 60; s += 5) {
    await win.waitForTimeout(5000);
    cpu.push(await app.evaluate(({ app }) => app.getAppMetrics().map((p) => ({ type: p.type, cpu: p.cpu.percentCPUUsage }))));
  }
  const r = await win.evaluate(() => ({ ev: window.__ev, long: window.__long, writes: window.__spiritWrites }));
  const avg = (type) => (cpu.map((m) => m.filter((p) => !type || p.type === type).reduce((a, p) => a + p.cpu, 0)).reduce((a, b) => a + b, 0) / cpu.length).toFixed(1);
  const finals = r.ev.filter((e) => e.type === 'final').length;
  const partials = r.ev.filter((e) => e.type === 'partial').length;
  const longMs = Math.round(r.long.reduce((a, b) => a + b, 0));
  console.log(`CPU: window ${avg('Tab')}%, graphics ${avg('GPU')}%, all ${avg()}% · ${finals} sentences, ${partials} live results · long tasks ${r.long.length} (${longMs} ms) · spirit saved ${r.writes} times`);
  check('the sermon was heard', finals >= 15, `${finals} sentences`);
  check('spirit’s learning is saved a few times, not once per sentence', r.writes <= 5, `${r.writes} writes for ${finals} sentences`);
  check('live results keep coming while words are spoken', partials >= 2 * finals, `${partials} live results for ${finals} sentences`);
  check('the window is rarely busy', longMs < 2500, `${r.long.length} long tasks, ${longMs} ms`);
  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
