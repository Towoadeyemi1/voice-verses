// NDI® output through the NDI Runtime: the projector and the lower third are sent as NDI sources,
// a receiver (another process) finds them and gets full-HD frames of what is on screen, the lower
// third arrives see-through, Settings shows them sending, and switching off stops the source.
// Needs the NDI library for tests: VOICE_VERSES_NDI_LIB=/path/to/libndi.so.6 (never committed).
// Without it, checks that Settings offers the free NDI Runtime instead.
// NDI® is a registered trademark of Vizrt NDI AB.
const { execFileSync } = require('child_process');
const path = require('path');
const { OUT, launch, showVerse, check, done } = require('./lib.cjs');

/** A frame from a source, received in a separate process (NDI calls block) */
const receive = (match) => {
  const code = `const { receiver } = require(${JSON.stringify(path.join(__dirname, 'ndi-receiver.cjs'))}); const f = receiver().frame(${JSON.stringify(match)}, 10000); console.log(JSON.stringify(f && { ...f, bytes: undefined })); process.exit(0);`;
  try {
    return JSON.parse(execFileSync(process.execPath, ['-e', code], { encoding: 'utf8', timeout: 20000 }).trim().split('\n').pop());
  } catch (e) {
    return { error: String(e.message).slice(0, 200) };
  }
};

(async () => {
  const { app, win, errors } = await launch('ndi');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1600, height: 1000 }));
  await win.waitForTimeout(2500);
  const available = await win.evaluate(() => window.voiceVerses.ndi.availability());

  if (!process.env.VOICE_VERSES_NDI_LIB) {
    check('without the NDI Runtime, NDI says it needs it', !available.available && available.reason === 'runtime', JSON.stringify(available));
    await win.evaluate(() => (location.hash = '#/display-manager'));
    await win.waitForTimeout(2500);
    const tile = (await win.locator('[data-way="ndi"]').textContent()) || '';
    check('Settings offers the free NDI Runtime', /NDI Runtime/.test(tile), tile.slice(0, 120));
    check('no page errors', errors.length === 0, errors.join(' | '));
    await app.close();
    return done();
  }

  check('the NDI Runtime is found', available.available, JSON.stringify(available));
  await showVerse(win, { book: 'John', chapter: 3, verse: 16, text: 'For God so loved the world, that he gave his only begotten Son', reference: 'John 3:16' });
  await win.evaluate(() => (location.hash = '#/display-manager'));
  await win.waitForTimeout(2500);

  // Switch NDI on for the projector and the lower third, as an operator would
  await win.locator('[data-device="ndi"]').click();
  await win.waitForTimeout(400);
  await win.locator('[data-inspector="ndi"]').getByRole('switch', { name: /Projector/ }).click();
  await win.locator('[data-inspector="ndi"]').getByRole('switch', { name: /Lower third/ }).click();
  await win.waitForTimeout(3000);

  const projector = receive('Voice Verses Projector');
  check('a receiver finds the projector and gets full HD', projector?.width === 1920 && projector.height === 1080 && projector.fourcc === 'BGRX', JSON.stringify(projector));
  check('the projector frame has the look (not black)', projector && projector.r + projector.g + projector.b > 15, JSON.stringify(projector));
  const lower = receive('Voice Verses Lower third');
  check('the lower third arrives see-through (BGRA, mostly clear)', lower?.fourcc === 'BGRA' && lower.a < 128, JSON.stringify(lower));
  check('…with no key green in it', lower && !(lower.g > 150 && lower.r < 60), JSON.stringify(lower));

  await win.waitForTimeout(1500);
  const status = (await win.locator('[data-inspector="ndi"]').textContent()) || '';
  check('Settings says they are sending', /Sending/.test(status), status.slice(0, 160));
  await win.screenshot({ path: `${OUT}/ndi-settings.png` });

  await win.locator('[data-inspector="ndi"]').getByRole('switch', { name: /Projector/ }).click();
  await win.waitForTimeout(1500);
  const st = await win.evaluate(() => window.voiceVerses.ndi.status());
  check('switching off stops the source', st.projection.state === 'off' && st.lowerThird.state === 'sending', JSON.stringify(st));

  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
