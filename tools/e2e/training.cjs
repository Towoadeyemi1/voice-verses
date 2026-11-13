// Training (1.19.1): every lesson runs on the real live screen, in practice.
//  - Training is a tab on every page, and a button on the live screen's welcome;
//  - Show me "Your first Sunday": the pointer and spotlight move to each control and the guide does every step
//    (Search, type John 3:16, Return, Take, Clear) while the room stays untouched; the lesson is ticked off;
//  - Let me try: the app waits; a wrong click is named and stopped; the right clicks and typing are checked;
//  - "When something goes wrong" opens the booth check light's list;
//  - Watch the demo: narrated, the pointer on what is happening, in practice; End practice stops it.
// The voice is off here (no voices under Xvfb); the pace is the same as reading it.
const { OUT, launch, check, done } = require('./lib.cjs');

const until = async (win, test, ms = 20000) => {
  for (let t = 0; t < ms; t += 200) {
    if (await test().catch(() => false)) return true;
    await win.waitForTimeout(200);
  }
  return false;
};
const say = (win) => win.locator('[data-guide-say]').innerText().catch(() => '');
const room = (win) => win.evaluate(() => localStorage.getItem('voice-verses-live'));
const progress = (win) => win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-training') || '{}'));
const centre = async (win, sel) => {
  const b = await win.locator(sel).first().boundingBox();
  return b && { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

(async () => {
  const { app, win, errors } = await launch('training');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1500, height: 1000 }));
  await win.evaluate(() => localStorage.setItem('voice-verses-guide-voice', 'off'));
  await win.waitForTimeout(2500);

  // Finding Training
  check('the live screen’s welcome has a Training button', (await win.locator('[data-open-training]').count()) === 1);
  await win.locator('[data-open-training]').click();
  await win.waitForTimeout(1200);
  check('Training opens, with the tab in the page bar', /#\/training/.test(await win.evaluate(() => location.hash)) && (await win.locator('nav[aria-label="Pages"] [aria-current="page"]').innerText()).includes('Training'));
  const lessons = await win.locator('[data-lesson]').evaluateAll((els) => els.map((e) => e.dataset.lesson));
  check('…with every lesson by who it is for', ['first-sunday', 'demo', 'booth-check', 'booth-setup'].every((l) => lessons.includes(l)), lessons.join(','));
  await win.screenshot({ path: `${OUT}/training-1-page.png` });

  // Show me: Your first Sunday
  const roomBefore = await room(win);
  await win.locator('[data-lesson="first-sunday"] [data-lesson-show]').click();
  check('Show me goes to the live screen, in practice', await until(win, async () => (await win.locator('[data-guide-card]').count()) === 1 && (await win.locator('[data-practice-band]').count()) === 1, 8000));
  check('…pointing at Live, then Next', await until(win, async () => /Red is Live/.test(await say(win)), 10000));
  await win.screenshot({ path: `${OUT}/training-2-live.png` });
  check('…then Search', await until(win, async () => /click Search/.test(await say(win)), 15000));
  const typedIt = await until(win, async () => /John 3:16/.test(await win.locator('[cmdk-input]').inputValue().catch(() => '')), 15000);
  check('…it opens Search and types John 3:16, a letter at a time', typedIt);
  await win.screenshot({ path: `${OUT}/training-3-typing.png` });
  const took = await until(win, async () => /John 3:16/.test(await win.locator('[data-label-detail="live"]').innerText()), 20000);
  check('…Return and Take put it on Live in practice', took, await win.locator('[data-label-detail="live"]').innerText());
  check('…while the room is untouched', (await room(win)) === roomBefore);
  await win.screenshot({ path: `${OUT}/training-4-take.png` });
  const finished = await until(win, async () => (await win.locator('[data-guide-card]').count()) === 0, 40000);
  const p1 = await progress(win);
  check('…then Clear and Start listening, and the lesson ends ticked off', finished && !!p1.done?.['first-sunday'], JSON.stringify(p1));
  check('…practice ends with it', (await win.locator('[data-practice-band]').count()) === 0);

  // Let me try
  await win.evaluate(() => (location.hash = '#/training'));
  await win.waitForTimeout(1200);
  await win.locator('[data-lesson="first-sunday"] [data-lesson-try]').click();
  check('Let me try waits for you at Search', await until(win, async () => /click Search/.test(await say(win)), 25000));
  check('…saying so', /Waiting for you/.test(await win.locator('[data-guide-card]').innerText()));
  const settings = await centre(win, '[data-guide="settings"]');
  await win.mouse.click(settings.x, settings.y);
  await win.waitForTimeout(400);
  const hint = await win.locator('[data-guide-hint]').innerText().catch(() => '');
  check('…a wrong click is stopped and named', /Nearly\. That’s Settings/.test(hint) && (await win.locator('[data-settings]').count()) === 0, hint);
  await win.screenshot({ path: `${OUT}/training-5-wrong.png` });
  await win.locator('[data-guide="search"]').click();
  check('…the right click is checked and it moves on', await until(win, async () => /Type the verse/.test(await say(win)), 8000));
  await win.locator('[cmdk-input]').fill('John 3:16');
  check('…typing is checked', await until(win, async () => /Press Return/.test(await say(win)), 8000));
  await win.keyboard.press('Enter');
  const next = await until(win, async () => /Take/.test(await say(win)) || /Clear/.test(await say(win)), 8000);
  check('…Return is checked', next);
  if (/Take/.test(await say(win))) await win.locator('[data-guide="take"]').click();
  check('…Take is checked', await until(win, async () => /Clear takes/.test(await say(win)), 8000));
  await win.locator('[data-guide="clear"]').click();
  check('…and Clear', await until(win, async () => /Start listening/.test(await say(win)), 8000));
  await win.screenshot({ path: `${OUT}/training-6-try.png` });
  await win.keyboard.press('Escape');
  await win.waitForTimeout(500);
  check('Esc leaves the lesson and its practice', (await win.locator('[data-guide-card]').count()) === 0 && (await win.locator('[data-practice-band]').count()) === 0);
  check('…and the room was never touched', (await room(win)) === roomBefore);

  // When something goes wrong
  await win.evaluate(() => (location.hash = '#/training'));
  await win.waitForTimeout(1200);
  await win.locator('[data-lesson="booth-check"] [data-lesson-show]').click();
  check('“When something goes wrong” opens the booth check’s list', await until(win, async () => (await win.locator('[data-booth-check-list]').count()) === 1, 20000));
  await win.screenshot({ path: `${OUT}/training-7-booth.png` });
  check('…and finishes', await until(win, async () => (await win.locator('[data-guide-card]').count()) === 0, 30000));

  // Watch the demo: narrated, with the pointer
  await win.evaluate(() => (location.hash = '#/training'));
  await win.waitForTimeout(1200);
  await win.locator('[data-lesson="demo"] [data-lesson-show]').click();
  check('Watch the demo plays it in practice, narrated', await until(win, async () => (await win.locator('[data-guide-narration]').count()) === 1 && (await win.locator('[data-practice-band]').count()) === 1, 10000));
  check('…pointing at what is heard', await until(win, async () => /What Voice Verses hears/.test(await win.locator('[data-guide-narration]').innerText().catch(() => '')), 15000));
  check('…with the pointer on the screen', (await win.locator('.vv-guide .pointer').count()) === 1);
  await win.screenshot({ path: `${OUT}/training-8-demo.png` });
  check('…then Live', await until(win, async () => /straight up on Live/.test(await win.locator('[data-guide-narration]').innerText().catch(() => '')), 20000));
  await win.screenshot({ path: `${OUT}/training-9-demo-live.png` });
  check('…the room untouched', (await room(win)) === roomBefore);
  await win.locator('[data-practice-band] button').click();
  await win.waitForTimeout(800);
  check('End practice stops the demo and its narration', (await win.locator('[data-demo]').count()) === 0 && (await win.locator('[data-guide-narration]').count()) === 0);

  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
