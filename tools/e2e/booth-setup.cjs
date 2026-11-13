// Set up your booth (1.19.0), on a brand-new computer:
//  - it opens by itself the first time (and never again once finished, or for a church already using Voice Verses);
//  - the microphone with sound is found and confirmed; the projector goes on the second screen;
//  - "We don't use ProPresenter" never switches sending on; the church's services are kept and come first in Services;
//  - Try the demo plays in practice: this screen shows the verse, the projector window and the room don't, spirit learns nothing;
//  - End practice brings this screen back to what the room shows; Settings → Booth check opens it again.
// Uses any short recording for the microphone (default: /tmp/vv-e2e/moments.wav).
const path = require('path');
const { OUT, launch, plugInSecondDisplay, check, done } = require('./lib.cjs');
const audio = process.argv[2] || path.join(OUT, 'moments.wav');

const until = async (win, test, ms = 15000) => {
  for (let t = 0; t < ms; t += 250) {
    if (await test()) return true;
    await win.waitForTimeout(250);
  }
  return false;
};
const part = (win, p) => win.locator(`[data-setup-part="${p}"]`);
const body = (page) => page.evaluate(() => document.body.innerText);

(async () => {
  const { app, win, errors } = await launch('booth-setup', { audio, firstRun: true });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1440, height: 1000 }));
  await plugInSecondDisplay(app);
  await win.waitForTimeout(1500);

  const sheet = win.locator('[data-booth-setup]');
  check('opens by itself on a new computer', (await sheet.count()) === 1 && /Welcome\. Here is what Voice Verses found\./.test(await sheet.innerText()));
  check('…the first card to check is the microphone', (await part(win, 'sound').getAttribute('data-state')) === 'now');
  await win.screenshot({ path: `${OUT}/booth-setup-1-open.png` });

  // 1 · Sound
  const heard = await until(win, async () => (await part(win, 'sound').locator('[data-sound-found]').count()) > 0, 20000);
  const soundText = await part(win, 'sound').innerText();
  check('the inputs are listened to and one is found', heard && /Found .+ Sound is coming in|No sound on any input yet/.test(soundText), soundText.slice(0, 160));
  await win.screenshot({ path: `${OUT}/booth-setup-2-sound.png` });
  await part(win, 'sound').locator('[data-setup-confirm]').click();
  await win.waitForTimeout(400);
  const speech = await win.evaluate(() => JSON.parse(localStorage.getItem('cornerstone-settings') || '{}'));
  check('Looks right confirms it, and the next card is up', (await part(win, 'sound').getAttribute('data-state')) === 'done' && (await part(win, 'screens').getAttribute('data-state')) === 'now', JSON.stringify(speech).slice(0, 120));

  // 2 · Screens: a new booth with a second screen puts the projector on it
  const tile = part(win, 'screens').locator('[data-screen-output="projection"]');
  const suggested = await until(win, async () => /suggested/.test(await tile.innerText()), 8000);
  check('the projector is suggested on the second screen', suggested && /^2/.test((await tile.innerText()).trim()), (await tile.innerText()).replace(/\s+/g, ' '));
  await part(win, 'screens').locator('[data-setup-confirm]').click();
  await win.waitForTimeout(1500);
  const config = await win.evaluate(() => window.voiceVerses.screens.get());
  check('…and Looks right puts it there', config.projection === 4242, JSON.stringify(config));

  // 3 · ProPresenter: none on this network
  const looked = await until(win, async () => (await part(win, 'propresenter').locator('[data-propresenter-found]').count()) > 0, 30000);
  check('ProPresenter is looked for', looked, (await part(win, 'propresenter').innerText()).slice(0, 140));
  await part(win, 'propresenter').locator('[data-setup-no-propresenter]').click();
  await win.waitForTimeout(300);
  const pp = await win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-propresenter') || '{}'));
  check('“We don’t use ProPresenter” confirms it and never switches sending on', (await part(win, 'propresenter').getAttribute('data-state')) === 'done' && !pp.enabled);

  // 4 · Services
  await part(win, 'services').locator('[data-church-type="Friday Night Prayers"]').click();
  await part(win, 'services').locator('[data-setup-confirm]').click();
  await win.waitForTimeout(300);
  const types = await win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-church-types') || '[]'));
  check('the church’s services are kept', types.join('|') === 'Sunday service|Friday Night Prayers', types.join('|'));
  check('all four confirmed', /4 of 4 confirmed/i.test(await sheet.innerText()) && (await win.locator('[data-setup-demo]').isEnabled()));
  await win.screenshot({ path: `${OUT}/booth-setup-3-confirmed.png` });

  // 5 · Try it, in practice
  const roomBefore = await win.evaluate(() => localStorage.getItem('voice-verses-live'));
  await win.locator('[data-setup-demo]').click();
  await win.waitForTimeout(600);
  check('Try the demo closes the sheet and starts practice', (await sheet.count()) === 0 && (await win.locator('[data-practice-band]').count()) === 1);
  const shown = await until(win, async () => /For God so loved the world/.test(await body(win)), 15000);
  check('…the verse is found and shown on this screen', shown);
  await win.screenshot({ path: `${OUT}/booth-setup-4-practice.png` });
  const roomDuring = await win.evaluate(() => localStorage.getItem('voice-verses-live'));
  check('…but the room is untouched', roomDuring === roomBefore, String(roomDuring).slice(0, 100));
  const projection = app.windows().find((p) => p.url().includes('/projection'));
  check('…and the projector window never shows it', !!projection && !/For God so loved/.test(await body(projection)), projection ? 'projection open' : 'no projection window');
  const spirit = await win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-spirit') || '{}'));
  check('…and spirit learns nothing from it', !(spirit.heard ?? []).length && !(spirit.events ?? []).length, JSON.stringify({ heard: spirit.heard?.length, events: spirit.events?.length }));

  await win.locator('[data-practice-band] button').click();
  await win.waitForTimeout(800);
  const after = await body(win);
  check('End practice stops it and brings this screen back to the room', (await win.locator('[data-practice-band]').count()) === 0 && (await win.locator('[data-demo]').count()) === 0 && !/For God so loved/.test(after), after.slice(0, 120));

  // Once finished, it doesn't open by itself again
  await win.reload();
  await win.waitForTimeout(3500);
  check('it doesn’t open by itself again', (await sheet.count()) === 0);

  // Settings → Booth check opens it any time
  await win.getByRole('button', { name: 'Settings' }).first().click();
  await win.waitForTimeout(800);
  await win.locator('[data-settings-booth]').click();
  await win.waitForTimeout(600);
  await win.locator('[data-open-booth-setup]').click();
  await win.waitForTimeout(800);
  check('Settings → Booth check → Set up your booth opens it', (await sheet.count()) === 1 && (await win.locator('[data-settings]').count()) === 0);
  check('…with what was confirmed', /4 of 4 confirmed/i.test(await sheet.innerText()));
  await win.locator('[data-setup-done]').click();
  await win.waitForTimeout(500);
  check('Done closes it', (await sheet.count()) === 0);

  // The church's services first in Services
  await win.evaluate(() => (location.hash = '#/service-planner'));
  await win.waitForTimeout(2000);
  const order = await win.locator('[data-ready-order]').evaluateAll((els) => els.slice(0, 2).map((e) => e.dataset.readyOrder));
  check('Services shows the church’s own types first', order.join('|') === 'Sunday service|Friday Night Prayers', order.join('|'));

  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
