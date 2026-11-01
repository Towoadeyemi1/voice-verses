// Moving backgrounds and slide transitions: the projector, the designer, the backgrounds gallery.
const { OUT, launch, setBounds, showVerse: remember, check, done } = require('./lib.cjs');

// Sends a verse the way the operator's window does (to an output that is already open)
const showVerse = async (win, v) => {
  await remember(win, v);
  await win.evaluate((v) => new BroadcastChannel('cornerstone-bible-sync').postMessage({ type: 'VERSE_UPDATE', data: { verse: v } }), v);
};

const verse = (n, text) => ({ book: 'John', chapter: 3, verse: n, text, reference: `John 3:${n}` });
// What is animating on the page right now, by animation name
const running = (page) =>
  page.evaluate(() => document.getAnimations().map((a) => `${a.animationName}:${a.playState}`));

(async () => {
  const { app, win, errors } = await launch('transitions');
  await setBounds(app, 1600, 900);

  // ---- The projector: built-in scripture look on a moving glow, dissolving between verses
  await win.evaluate(() => (location.hash = '#/projection'));
  await win.waitForTimeout(1500);
  await showVerse(win, verse(16, 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'));
  await win.waitForTimeout(1500);
  check('built-in scripture look has a moving background', (await win.locator('[data-motion="glow"]').count()) === 1);
  const anims = await running(win);
  check('the background is moving', anims.some((a) => a.startsWith('vv-breathe:running')), anims.join(', '));
  await win.screenshot({ path: `${OUT}/transitions-glow.png` });

  // Mark the background, then change verse: it must stay the same (no restart), and only the words dissolve
  await win.evaluate(() => (document.querySelector('[data-motion]').__mark = 'same'));
  await showVerse(win, verse(17, 'For God sent not his Son into the world to condemn the world; but that the world through him might be saved.'));
  await win.waitForTimeout(120);
  const mid = await running(win);
  check('old words fade out while new ones fade in', mid.includes('vv-out-fade:running') && mid.includes('vv-in-fade:running'), mid.filter((a) => !a.startsWith('vv-breathe')).join(', '));
  await win.screenshot({ path: `${OUT}/transitions-dissolve-mid.png` });
  await win.waitForTimeout(1000);
  check('the background carried on underneath', await win.evaluate(() => document.querySelector('[data-motion]').__mark === 'same'));
  const words = await win.evaluate(() => document.body.innerText);
  check('only the new verse is left', words.includes('condemn') && !words.includes('begotten'), words.slice(0, 120));

  // ---- The designer: choose a moving background and a transition for the scripture look
  await win.evaluate(() => (location.hash = '#/templates'));
  await win.waitForTimeout(1800);
  const thumbs = await running(win);
  check('small look thumbnails stand still', thumbs.some((a) => a.endsWith(':paused')), `${thumbs.filter((a) => a.endsWith(':paused')).length} paused`);
  await win.getByRole('button', { name: /^Transition:/ }).click();
  await win.getByRole('radio', { name: 'Push' }).click();
  await win.waitForTimeout(300);
  await win.getByRole('button', { name: 'Play it on the preview' }).click();
  await win.waitForTimeout(150);
  check('the designer plays the transition', (await running(win)).includes('vv-in-push:running'));
  await win.waitForTimeout(800);
  await win.getByRole('button', { name: 'Background', exact: true }).click();
  await win.getByRole('radio', { name: 'Moving' }).click();
  await win.getByRole('radio', { name: 'Stars' }).click();
  await win.waitForTimeout(600);
  await win.screenshot({ path: `${OUT}/transitions-designer.png` });
  let saved = await win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-templates') || '[]').find((t) => t.id === 'scripture-full'));
  check('look saved with stars and push', saved?.background?.motion?.style === 'stars' && saved?.transition?.kind === 'push', JSON.stringify({ bg: saved?.background, t: saved?.transition }));

  // ---- The projector uses them
  await win.evaluate(() => (location.hash = '#/projection'));
  await win.waitForTimeout(1500);
  check('projector shows the stars', (await win.locator('[data-motion="stars"]').count()) === 1);
  await showVerse(win, verse(18, 'He that believeth on him is not condemned.'));
  await win.waitForTimeout(150);
  const pushed = await running(win);
  check('verses now push across', pushed.includes('vv-in-push:running') && pushed.includes('vv-out-push:running'), pushed.filter((a) => a.includes('push')).join(', '));
  await win.waitForTimeout(1200);
  await win.screenshot({ path: `${OUT}/transitions-stars.png` });

  // ---- The backgrounds gallery puts one behind everything on the projector
  await win.evaluate(() => (location.hash = '#/templates'));
  await win.waitForTimeout(1500);
  await win.getByRole('button', { name: 'Backgrounds' }).click();
  await win.waitForTimeout(800);
  await win.screenshot({ path: `${OUT}/transitions-gallery.png` });
  await win.getByRole('radio', { name: /^Waves/ }).click();
  await win.getByRole('button', { name: 'Use Waves' }).click();
  await win.waitForTimeout(500);
  const all = await win.evaluate(() => {
    const a = JSON.parse(localStorage.getItem('voice-verses-template-assignments') || 'null') ?? { projection: { scripture: 'scripture-full', lyrics: 'lyrics-center', announcement: 'announcement', countdown: 'countdown' } };
    const t = JSON.parse(localStorage.getItem('voice-verses-templates') || '[]');
    return Object.values(a.projection).map((id) => t.find((x) => x.id === id)?.background?.motion?.style);
  });
  check('every projector look now has waves', all.length === 4 && all.every((s) => s === 'waves'), all.join(', '));

  // ---- Every style draws without errors on the projector
  for (const style of ['aurora', 'flow', 'bokeh', 'rays', 'waves', 'stars', 'glow', 'horizon', 'texture']) {
    await win.evaluate((style) => {
      const t = JSON.parse(localStorage.getItem('voice-verses-templates'));
      const s = t.find((x) => x.id === 'scripture-full');
      s.background.motion.style = style;
      s.transition = { kind: 'cut', duration: 0.5 };
      localStorage.setItem('voice-verses-templates', JSON.stringify(t));
      location.hash = '#/projection';
    }, style);
    await win.waitForTimeout(1200);
    const ok = (await win.locator(`[data-motion="${style}"]`).count()) === 1;
    if (!ok) check(`${style} drawn`, false);
    await win.screenshot({ path: `${OUT}/bg-${style}.png` });
    await win.evaluate(() => (location.hash = '#/templates'));
    await win.waitForTimeout(400);
  }
  check('all nine backgrounds drawn', true);

  // Cut: nothing leaves, nothing arrives
  await win.evaluate(() => (location.hash = '#/projection'));
  await win.waitForTimeout(1200);
  await showVerse(win, verse(19, 'And this is the condemnation, that light is come into the world.'));
  await win.waitForTimeout(100);
  const cut = await running(win);
  check('a cut changes at once', !cut.some((a) => /vv-(in|out)-/.test(a)), cut.filter((a) => /vv-(in|out)-/.test(a)).join(', '));

  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
