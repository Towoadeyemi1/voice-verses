// Settings → Screens: assign the projector to a second display; it opens there, full screen, without taking focus.
const { OUT, launch, plugInSecondDisplay, check, done } = require('./lib.cjs');

(async () => {
  const { app, win, errors } = await launch('screens');
  await plugInSecondDisplay(app);
  await win.waitForTimeout(500);
  const displays = await win.evaluate(() => window.voiceVerses.screens.displays());
  check('second display is listed', displays.some((d) => d.label === 'HDMI-SDI'), displays.map((d) => d.label).join(', '));

  const second = displays.find((d) => !d.primary);
  const config = await win.evaluate(() => window.voiceVerses.screens.get());
  await win.evaluate((c) => window.voiceVerses.screens.set(c), { ...config, projection: second.id });
  await win.waitForTimeout(2500);

  const windows = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((w) => ({ url: w.webContents.getURL(), bounds: w.getBounds(), visible: w.isVisible() })));
  const proj = windows.find((w) => w.url.includes('/projection'));
  check('projector window opened', !!proj);
  check('projector is on the second display', proj && proj.bounds.x >= 1440, JSON.stringify(proj?.bounds));
  const focused = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getFocusedWindow()?.webContents.getURL() ?? '');
  check('operator window keeps focus', !focused.includes('/projection'), focused);

  // Esc on an output that covers the main screen turns it off
  await win.evaluate(async () => { const c = await window.voiceVerses.screens.get(); const d = await window.voiceVerses.screens.displays(); return window.voiceVerses.screens.set({ ...c, confidence: d.find((x) => x.primary).id }); });
  await win.waitForTimeout(2000);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('/confidence'))?.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' }));
  await win.waitForTimeout(1500);
  const after = await win.evaluate(() => window.voiceVerses.screens.get());
  check('Esc turned the confidence output off', after.confidence === null, JSON.stringify(after));

  await win.screenshot({ path: `${OUT}/screens-operator.png` });
  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
