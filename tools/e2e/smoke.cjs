// Outputs, screen shapes and settings, with no speech. ~30 s.
const { OUT, launch, setBounds, showVerse, stageSize, check, done } = require('./lib.cjs');
const JOHN_3_16 = { book: 'John', chapter: 3, verse: 16, text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' };

(async () => {
  const { app, win, errors } = await launch('smoke');
  await showVerse(win, JOHN_3_16);

  // The projector draws the live verse on a 16:9 stage by default
  await setBounds(app, 1920, 1080);
  await win.evaluate(() => (location.hash = '#/projection'));
  await win.waitForTimeout(1500);
  const text = await win.evaluate(() => document.body.innerText);
  check('projector shows the live verse', text.includes('For God so loved the world'));
  // (The test window has a title bar, so "Match the screen" sees a slightly wider shape; pick 16:9 outright)
  await win.evaluate(() => { localStorage.setItem('voice-verses-screen-shapes', JSON.stringify({ projection: { id: '16:9' } })); window.dispatchEvent(new Event('voice-verses-screen-shapes-changed')); });
  await win.waitForTimeout(400);
  check('projector stage is 16:9', (await stageSize(win)) === '1920px x 1080px', await stageSize(win));

  // A 32:9 projector spreads the design; "middle" keeps it in the middle
  await win.evaluate(() => { localStorage.setItem('voice-verses-screen-shapes', JSON.stringify({ projection: { id: '32:9', layout: 'spread' } })); window.dispatchEvent(new Event('voice-verses-screen-shapes-changed')); });
  await win.waitForTimeout(600);
  check('32:9 stage is 3840 wide', (await stageSize(win)) === '3840px x 1080px', await stageSize(win));
  await win.screenshot({ path: `${OUT}/smoke-projector-32x9.png` });

  // "Match the screen" follows the window
  await win.evaluate(() => { localStorage.setItem('voice-verses-screen-shapes', '{}'); window.dispatchEvent(new Event('voice-verses-screen-shapes-changed')); });
  await setBounds(app, 3440, 1440);
  await win.waitForTimeout(1200);
  const wide = parseInt(await stageSize(win), 10);
  check('match the screen widens the stage', wide > 2300, `${wide}px`);

  // Lower third and confidence render
  await setBounds(app, 1600, 1000);
  await win.evaluate(() => (location.hash = '#/lower-third')); await win.waitForTimeout(1000);
  check('lower third shows the verse', (await win.evaluate(() => document.body.innerText)).includes('For God so loved'));
  await win.evaluate(() => (location.hash = '#/confidence')); await win.waitForTimeout(1000);
  check('confidence monitor shows the verse', (await win.evaluate(() => document.body.innerText)).includes('For God so loved'));

  // Display manager: shape pickers save
  await win.evaluate(() => (location.hash = '#/display-manager')); await win.waitForTimeout(1500);
  await win.locator('#shape-projection').click(); await win.waitForTimeout(300);
  await win.getByRole('option', { name: /21:9/ }).click(); await win.waitForTimeout(300);
  const saved = await win.evaluate(() => localStorage.getItem('voice-verses-screen-shapes'));
  check('shape picker saves 21:9', saved?.includes('"21:9"'), saved);
  await win.screenshot({ path: `${OUT}/smoke-display-manager.png`, fullPage: true });

  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
