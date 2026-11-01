// Starter templates: looks gallery, themes, colour teams, orders of service, countdown quick starts.
const { launch, setBounds, check, done, OUT } = require('./lib.cjs');
(async () => {
  const { app, win, errors } = await launch('starters');
  await setBounds(app, 1600, 1100);
  await win.evaluate(() => (location.hash = '#/templates')); await win.waitForTimeout(2000);
  await win.getByRole('button', { name: 'Starter looks' }).click(); await win.waitForTimeout(1200);
  await win.screenshot({ path: `${OUT}/starters-scripture.png` });
  await win.getByRole('tab', { name: /Lower thirds/ }).click(); await win.waitForTimeout(800);
  await win.screenshot({ path: `${OUT}/starters-lower.png` });
  await win.getByRole('button', { name: 'Use on stream' }).nth(3).click(); await win.waitForTimeout(500);
  let a = await win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-template-assignments') || '{}'));
  check('lower third uses the news strip', a.stream?.scripture === 'starter-lt-news', JSON.stringify(a.stream));
  await win.getByRole('tab', { name: /Songs/ }).click(); await win.waitForTimeout(800);
  await win.screenshot({ path: `${OUT}/starters-songs.png` });
  await win.keyboard.press('Escape'); await win.waitForTimeout(400);
  // A ready-made theme
  await win.getByRole('tab', { name: 'Colour teams and themes' }).click(); await win.waitForTimeout(600);
  await win.getByRole('button', { name: 'Use the Modern theme' }).click(); await win.waitForTimeout(600);
  a = await win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-template-assignments') || '{}'));
  const team = await win.evaluate(() => localStorage.getItem('voice-verses-color-team'));
  check('Modern theme: looks and team', a.projection?.scripture === 'starter-scripture-modern' && team?.includes('team-ocean'), `${a.projection?.scripture} ${team}`);
  await win.getByRole('button', { name: /Christmas/ }).first().click(); await win.waitForTimeout(400);
  const teams = await win.evaluate(() => localStorage.getItem('voice-verses-color-teams') || '');
  check('Christmas colour team added', teams.includes('team-christmas'));
  await win.screenshot({ path: `${OUT}/starters-themes.png`, fullPage: true });
  // Orders of service
  await win.evaluate(() => (location.hash = '#/service-planner')); await win.waitForTimeout(2000);
  await win.screenshot({ path: `${OUT}/starters-services.png`, fullPage: true });
  await win.getByRole('button', { name: /^Sunday Service/ }).click(); await win.waitForTimeout(2000);
  check('Sunday Service opened in the builder', win.url().includes('service-builder'), win.url());
  const parts = await win.evaluate(() => new Promise((res) => { const r = indexedDB.open('cornerstone-bible-db'); r.onsuccess = () => { const q = r.result.transaction('services').objectStore('services').getAll(); q.onsuccess = () => res(q.result.map((s) => `${s.name}:${s.sections.length}`)); }; }));
  check('service has its 10 parts', parts.some((p) => p === 'Sunday Service:10'), JSON.stringify(parts));
  // Countdown quick start
  await win.evaluate(() => (location.hash = '#/')); await win.waitForTimeout(1500);
  await win.getByRole('button', { name: /Countdown/ }).first().click(); await win.waitForTimeout(500);
  await win.getByRole('button', { name: 'Sermon timer (stage only)' }).click(); await win.waitForTimeout(300);
  const setup = await win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-countdown-setup') || '{}'));
  check('sermon timer preset', setup.minutes === 35 && setup.projector === 'off', JSON.stringify(setup));
  await win.screenshot({ path: `${OUT}/starters-countdown.png` });
  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close(); done();
})().catch((e) => { console.error(e); process.exit(1); });
