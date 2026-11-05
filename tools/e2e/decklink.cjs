// Settings → Screens with a pretend DeckLink card (VOICE_VERSES_DECKLINK_MOCK=1, two SDI ports):
// an output sent to a port is drawn offscreen and every frame reaches the card at the port's size,
// the format can change, each output lists where it goes, test colours show, and Nothing closes the port. The real card is tested on the owner's ProPresenter computer.
process.env.VOICE_VERSES_DECKLINK_MOCK = '1';
const { OUT, launch, showVerse, check, done } = require('./lib.cjs');

(async () => {
  const { app, win, errors } = await launch('decklink');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1500, height: 1100 }));
  const card = () => app.evaluate(() => JSON.parse(JSON.stringify(globalThis.__decklinkMock ?? null)));
  /** Click a screen in the picture of the room, then what it shows */
  const show = async (device, what) => {
    await win.locator(`[data-device="${device}"]`).click();
    await win.waitForTimeout(400);
    await win.locator(`[data-inspector="${device}"]`).getByRole('radio', { name: what, exact: true }).click();
    await win.waitForTimeout(2500);
  };

  await win.evaluate(() => (location.hash = '#/display-manager'));
  await win.waitForTimeout(3000);
  const devices = await win.locator('[data-device]').evaluateAll((els) => els.map((e) => e.dataset.device));
  check('the DeckLink ports are in the picture of the room with the displays', devices.includes('dl:DeckLink Duo (1)') && devices.includes('dl:DeckLink Duo (2)'), devices.join(' | '));

  await show('dl:DeckLink Duo (1)', 'Projector');
  let c = await card();
  check('the projector is sent to the port at full HD', c?.byPort?.[0]?.width === 1920 && c.byPort[0].height === 1080, JSON.stringify(c?.byPort?.[0]));
  const status = (await win.locator('[data-inspector="dl:DeckLink Duo (1)"] [role="status"]').textContent()) || '';
  check('Settings says it is sending', /Sending · 1080i 59.94/.test(status), status);

  const before = c.byPort[0].frames;
  await showVerse(win, { book: 'John', chapter: 3, verse: 16, text: 'For God so loved the world, that he gave his only begotten Son', reference: 'John 3:16' });
  await win.waitForTimeout(2000);
  c = await card();
  check('a new verse sends new frames', c.byPort[0].frames > before, `${before} → ${c.byPort[0].frames}`);
  await win.screenshot({ path: `${OUT}/decklink-settings.png` });

  await win.locator('[data-inspector="dl:DeckLink Duo (1)"]').getByRole('combobox', { name: 'Video format' }).click();
  await win.waitForTimeout(400);
  await win.getByRole('option', { name: '720p 59.94' }).click();
  await win.waitForTimeout(2500);
  c = await card();
  check('changing the format reopens the port at that size', c.byPort[0].width === 1280 && c.byPort[0].height === 720, JSON.stringify(c.byPort[0]));

  await show('dl:DeckLink Duo (2)', 'Lower third');
  c = await card();
  check('the lower third (green) goes to the second port', (c.byPort[1]?.g ?? 0) > 200 && (c.byPort[1]?.r ?? 255) < 60, JSON.stringify(c.byPort[1]));
  const out = (await win.locator('[data-output="lowerThird"]').textContent()) || '';
  check('the lower third lists the port as where it goes', /DeckLink Duo \(2\)/.test(out), out.slice(0, 80));

  await win.locator('[data-device="dl:DeckLink Duo (1)"]').click();
  await win.waitForTimeout(400);
  await win.locator('[data-inspector="dl:DeckLink Duo (1)"]').getByRole('button', { name: 'Show test colours' }).click();
  await win.waitForTimeout(800);
  c = await card();
  const bars = c.byPort[0];
  check('test colours reach the port', Math.abs(bars.r - 110) < 25 && Math.abs(bars.g - 110) < 25 && Math.abs(bars.b - 110) < 25, JSON.stringify(bars));

  await show('dl:DeckLink Duo (1)', 'Nothing');
  await show('dl:DeckLink Duo (2)', 'Nothing');
  c = await card();
  check('Nothing closes the ports', c.closed >= 3, `${c.closed} closed`);
  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
