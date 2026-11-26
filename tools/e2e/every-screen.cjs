// Every screen on Live (1.19.12, approved mock-up docs/design/all-screens.html): the switch beside
// Live shows the projector only, or every output that is on, live, each with where it goes; a
// small one clicked becomes the big one; an output on no screen says so, with Choose where it goes;
// the choice is kept; everything fits a laptop window and a wide one. KJV only.
const { OUT, launch, plugInSecondDisplay, check, done } = require('./lib.cjs');

/** John 3:16 on the screens the way a volunteer does it: Search, type it, Return, Take */
async function putUp(win) {
  await win.locator('[data-guide="search"]').click();
  await win.locator('[cmdk-input]').fill('John 3:16');
  await win.waitForTimeout(600);
  await win.keyboard.press('Enter');
  await win.waitForTimeout(600);
  if (!/John 3:16/.test(await win.locator('[data-label-detail="live"]').innerText().catch(() => ''))) await win.locator('[data-guide="take"]').click();
  await win.waitForTimeout(800);
}

(async () => {
  const { app, win, errors } = await launch('every-screen');
  const size = (w, h) => app.evaluate(({ BrowserWindow }, b) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, ...b }), { width: w, height: h });
  // A wide window first (the pretend second display below holds the window to its size): every output
  // shared on the network, so every one is on; like a multiview, the big one beside the others
  await size(2560, 1440);
  await win.evaluate(() => {
    localStorage.setItem('voice-verses-network', JSON.stringify({ enabled: true, port: 47100 }));
    localStorage.setItem('voice-verses-live-view', 'all');
  });
  await win.reload();
  await win.waitForTimeout(3500);
  await putUp(win);
  const layout = await win.evaluate(() => {
    const big = document.querySelector('[data-live-tile][data-big="true"]').getBoundingClientRect();
    const small = [...document.querySelectorAll('[data-live-tile]:not([data-big])')].map((e) => e.getBoundingClientRect());
    return { beside: small.every((r) => r.left > big.right - 2), stacked: small.length === 2 && small[1].top > small[0].bottom - 2, bigW: Math.round(big.width), w: window.innerWidth };
  });
  check('a wide window: the big one with the others stacked beside it', layout.beside && layout.stacked, JSON.stringify(layout));
  const fits = async () =>
    win.evaluate(() => {
      const next = document.querySelector('[data-guide="next"]').getBoundingClientRect();
      const take = document.querySelector('[data-guide="take"]').getBoundingClientRect();
      return { ok: next.bottom <= window.innerHeight + 1 && take.bottom < next.top, bottom: Math.round(next.bottom), h: window.innerHeight };
    });
  let f = await fits();
  check('…and it all fits (2560 × 1440)', f.ok, JSON.stringify(f));
  check('…the stream lower third shows the verse', /For God so loved/.test(await win.locator('[data-live-tile="lowerThird"]').innerText()));
  await win.screenshot({ path: `${OUT}/every-screen-3-wide.png` });
  await win.evaluate(() => {
    localStorage.removeItem('voice-verses-network');
    localStorage.setItem('voice-verses-live-view', 'one');
  });
  await win.reload();
  await win.waitForTimeout(3000);

  await size(1440, 900);
  await plugInSecondDisplay(app);
  await win.evaluate(async () => window.voiceVerses.screens.set({ projection: 4242, lowerThird: null, confidence: null }));
  await win.waitForTimeout(2500);
  await putUp(win);

  const sw = win.locator('[data-live-view]');
  check('a switch beside Live: One screen | Every screen', (await sw.getByRole('radio', { name: 'One screen' }).count()) === 1 && (await sw.getByRole('radio', { name: /^Every screen/ }).count()) === 1);
  check('…One screen to start, as before', (await sw.getAttribute('data-live-view')) === 'one' && (await win.locator('[data-every-screen]').count()) === 0);
  await win.waitForTimeout(5500); // the outputs are checked every 5 seconds
  check('…counting the screens that are on', /\(1\)/.test(await sw.getByRole('radio', { name: /^Every screen/ }).getAttribute('aria-label')));

  await sw.getByRole('radio', { name: /^Every screen/ }).click();
  await win.waitForTimeout(800);
  const wall = win.locator('[data-every-screen]');
  check('Every screen shows each output', (await wall.locator('[data-live-tile]').count()) === 3);
  check('…the projector big, live, with where it goes', (await wall.locator('[data-live-tile="projection"][data-big="true"][data-on="true"]').count()) === 1 && /HDMI-SDI/.test(await wall.locator('[data-live-tile="projection"]').innerText()));
  check('…showing what the room sees', /For God so loved the world/.test(await wall.locator('[data-live-tile="projection"]').innerText()));
  const off = wall.locator('[data-live-tile="confidence"]');
  check('an output on no screen says so', (await off.getAttribute('data-on')) === 'false' && /Not on any screen yet/.test(await off.innerText()));
  await win.screenshot({ path: `${OUT}/every-screen-1-laptop-one-on.png` });
  await off.getByRole('button', { name: 'Choose where it goes' }).click();
  await win.waitForTimeout(1200);
  check('…Choose where it goes opens Settings → Screens', (await win.locator('[role="dialog"] [data-screens-page]').count()) === 1);
  await win.keyboard.press('Escape');
  await win.waitForTimeout(600);

  // Every output on (the screens shared on the network too)
  await win.evaluate(async () => {
    await window.voiceVerses.screens.set({ projection: 4242, lowerThird: null, confidence: null });
    localStorage.setItem('voice-verses-network', JSON.stringify({ enabled: true, port: 47100 }));
    window.dispatchEvent(new Event('settings-updated'));
  });
  await win.waitForTimeout(1500);
  check('with every output on, every one is live', (await wall.locator('[data-on="true"]').count()) === 3, await wall.locator('[data-live-tile]').evaluateAll((els) => els.map((e) => `${e.dataset.liveTile}:${e.dataset.on}`).join(' ')));
  check('…each small one says where it goes', /Browser/.test(await wall.locator('[data-live-tile="lowerThird"]').innerText()));

  // Everything fits a laptop window: the bottom of Next is on screen
  f = await fits();
  check('…everything fits a laptop window (1440 × 900)', f.ok, JSON.stringify(f));
  await win.screenshot({ path: `${OUT}/every-screen-2-laptop.png` });

  // A small one clicked becomes the big one
  await wall.locator('[data-live-tile="confidence"]').click();
  await win.waitForTimeout(500);
  check('a small one clicked becomes the big one', (await wall.locator('[data-live-tile="confidence"][data-big="true"]').count()) === 1);
  check('…Next and Take are still there', (await win.locator('[data-guide="take"]').count()) === 1 && (await win.locator('[data-label-detail="next"]').count()) === 1);


  // Kept for next time
  await win.reload();
  await win.waitForTimeout(3000);
  check('the choice is kept: Every screen, the stage monitor big', (await win.locator('[data-live-view]').getAttribute('data-live-view')) === 'all' && (await win.locator('[data-live-tile="confidence"][data-big="true"]').count()) === 1);
  await win.locator('[data-live-tile="projection"]').click();
  await win.waitForTimeout(400);
  check('…and the projector back', (await win.locator('[data-live-tile="projection"][data-big="true"]').count()) === 1);

  // Back to One screen
  await win.locator('[data-live-view]').getByRole('radio', { name: 'One screen' }).click();
  await win.waitForTimeout(500);
  check('One screen goes back to Live and Next as before', (await win.locator('[data-every-screen]').count()) === 0 && (await win.locator('[data-guide="live"]').count()) === 1);
  await win.waitForTimeout(800);
  await win.screenshot({ path: `${OUT}/every-screen-4-one.png` });

  check('no errors in the window', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
