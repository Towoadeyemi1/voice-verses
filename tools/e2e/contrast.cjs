// Every word readable (1.19.19): every piece of text on every screen meets WCAG AA (4.5:1, or 3:1
// for large text and lone symbols), measured on the real pixels behind it by the foundation's
// checker (tools/checks/check-contrast.cjs), at laptop (1440 × 900) and wide (2560 × 1440)
// window sizes. The app has one theme (dark) until light mode ships; add it here when it does.
//
//   xvfb-run -a node tools/e2e/contrast.cjs            fails on any text below the mark
//   xvfb-run -a node tools/e2e/contrast.cjs --report   lists every failing piece of text
const { OUT, launch, setBounds, seedMedia, answerVoice, check, done } = require('./lib.cjs');
const { auditContrast } = require('../checks/check-contrast.cjs');

const report = process.argv.includes('--report');
/** ONLY=<regex>: measure only the screens whose name matches (to work on one quickly) */
const only = process.env.ONLY ? new RegExp(process.env.ONLY, 'i') : null;
/** SIZES=1440: only that width */
const SIZES = [
  [1440, 900],
  [2560, 1440],
].filter(([w]) => !process.env.SIZES || process.env.SIZES.split(',').includes(String(w)));

(async () => {
  const { app, win, errors } = await launch('contrast');
  await seedMedia(win, [
    { id: 'song-grace', type: 'song', name: 'Amazing Grace', author: 'John Newton', lyrics: "Verse 1\nAmazing grace how sweet the sound\nThat saved a wretch like me\n\nVerse 2\n'Twas grace that taught my heart to fear\nAnd grace my fears relieved" },
  ]);
  await win.waitForTimeout(2000);
  const go = async (hash, wait = 1600) => {
    await win.evaluate((h) => (location.hash = '#' + h), hash);
    await win.waitForTimeout(wait);
  };
  const press = async (key, wait = 600) => {
    await win.keyboard.press(key);
    await win.waitForTimeout(wait);
  };
  const totals = { screens: 0, pieces: 0, failing: 0 };

  /** Measures what is on the window now, and prints the result for this screen */
  const measure = async (name, size) => {
    if (only && !only.test(name)) return;
    const res = await auditContrast(win);
    const fails = res.filter((r) => !r.pass).sort((a, b) => a.ratio - b.ratio);
    totals.screens++;
    totals.pieces += res.length;
    totals.failing += fails.length;
    check(`${name} at ${size}: every word readable`, fails.length === 0, `${res.length - fails.length} of ${res.length} pass`);
    if (report) for (const f of fails) console.log(`      ✗ ${f.ratio.toFixed(2)} < ${f.need}  ${f.tag}${f.cls ? '.' + f.cls.split(' ')[0] : ''}  "${f.text}"`);
    if (fails.length || process.env.SHOTS) await win.screenshot({ path: `${OUT}/contrast-${process.env.SHOTS ?? ''}${name.replace(/\W+/g, '-')}-${size}.png` });
  };

  for (const [w, h] of SIZES) {
    const size = `${w}×${h}`;
    await setBounds(app, w, h);
    await win.waitForTimeout(800);

    // The live screen: before the service, with a verse on Live, with a song's slides, the palette
    await go('/', 2500);
    await measure('live screen, before anything is on', size);
    await press('Control+k');
    await win.keyboard.type('John 3:16');
    await win.waitForTimeout(600);
    await measure('the command palette', size);
    await press('Enter');
    await win.locator('[data-guide="take"]').click();
    await win.waitForTimeout(1200);
    await measure('live screen, a verse on Live', size);
    const lib = win.locator('[data-guide="library"]');
    if (await lib.isVisible()) await lib.click();
    await win.waitForTimeout(500);
    await win.locator('[data-library-tab="songs"]').filter({ visible: true }).first().dispatchEvent('mousedown');
    await win.waitForTimeout(500);
    await measure('the library, songs', size);
    await win.locator('[data-library-song]').filter({ visible: true }).first().click();
    await win.waitForTimeout(800);
    await win.locator('[data-guide="take"]').click();
    await win.waitForTimeout(1200);
    await measure('live screen, a song on Live', size);
    await win.locator('[aria-label="Slides"] [data-quick-edit]').first().click();
    await win.waitForTimeout(800);
    await measure('Quick edit (a dialog)', size);
    await win.locator('[data-quick-cancel]').click();
    await win.waitForTimeout(500);
    const all = win.locator('[data-live-view] button').filter({ hasText: 'Every screen' });
    if (await all.count()) {
      await all.first().click();
      await win.waitForTimeout(1000);
      await measure('live screen, every screen', size);
      await win.locator('[data-live-view] button').filter({ hasText: 'One screen' }).first().click();
    }
    await press('Escape');

    // The other pages
    for (const [name, hash] of [
      ['Services', '/service-planner'],
      ['Media', '/media-library'],
      ['Looks', '/templates'],
      ['Screens', '/display-manager'],
      ['Order of service', '/presenter'],
      ['Training', '/training'],
    ])
      await go(hash).then(() => measure(name, size));

    // A service being planned
    await go('/service-planner');
    const use = win.locator('[data-ready-order] button').filter({ hasText: /^Use for/ }).first();
    if (await use.count()) {
      await use.click();
      await win.waitForTimeout(2200);
      await measure('a service being planned', size);
    }

    // Every page of Settings
    await go('/settings');
    const panes = await win.locator('[data-pane]').evaluateAll((els) => els.map((e) => e.dataset.pane));
    for (const pane of panes) {
      await win.locator(`[data-pane="${pane}"]`).click();
      await win.waitForTimeout(700);
      await measure(`Settings → ${pane}`, size);
    }

    // A lesson: the guide's card and the practice band
    await go('/training');
    await win.locator('[data-lesson="first-sunday"] [data-lesson-show]').click();
    await answerVoice(win);
    await win.waitForTimeout(2500);
    await measure('a lesson (the guide and practice)', size);
    await press('Escape', 1200);
  }

  console.log(`\n${totals.screens} screens, ${totals.pieces} pieces of text, ${totals.failing} below the mark`);
  check('no errors in the window', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
