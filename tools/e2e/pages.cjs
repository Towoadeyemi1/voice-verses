// A screenshot tour of every page (pass a tag: before/after). Look at the pictures it saves.
const { launch, setBounds, seedMedia, OUT } = require('./lib.cjs');
const tag = process.argv[2] || 'before';
(async () => {
  const { app, win, errors } = await launch('pages');
  await seedMedia(win, [
    { id: 'song-grace', type: 'song', name: 'Amazing Grace', author: 'John Newton', lyrics: "Verse 1\nAmazing grace how sweet the sound\nThat saved a wretch like me\n\nVerse 2\n'Twas grace that taught my heart to fear\nAnd grace my fears relieved" },
    { id: 'song-holy', type: 'song', name: 'Holy, Holy, Holy', author: 'Reginald Heber', lyrics: 'Verse 1\nHoly holy holy Lord God Almighty\nEarly in the morning our song shall rise to Thee' },
  ]);
  await setBounds(app, 1600, 1000);
  await win.evaluate(() => (location.hash = '#/service-planner')); await win.waitForTimeout(1800);
  await win.getByRole('button', { name: /^Sunday Service/ }).click(); await win.waitForTimeout(2500);
  await win.screenshot({ path: `${OUT}/${tag}-builder.png` });
  const builder = win.url().split('#')[1];
  for (const [name, hash] of [['planner', '/service-planner'], ['media', '/media-library'], ['templates', '/templates'], ['screens', '/display-manager'], ['presenter', '/presenter'], ['install', '/install']]) {
    await win.evaluate((h) => (location.hash = '#' + h), hash); await win.waitForTimeout(1800);
    await win.screenshot({ path: `${OUT}/${tag}-${name}.png` });
  }
  await win.evaluate(() => (location.hash = '#/settings')); await win.waitForTimeout(1500);
  await win.screenshot({ path: `${OUT}/${tag}-settings.png` });
  await win.getByRole('button', { name: 'Listening' }).click(); await win.waitForTimeout(800);
  await win.screenshot({ path: `${OUT}/${tag}-settings-listening.png` });
  await win.evaluate((b) => (location.hash = '#' + b), builder); await win.waitForTimeout(1500);
  await win.locator('input[value="Opening song"]').click(); await win.waitForTimeout(300);
  await win.getByRole('button', { name: 'Scripture', exact: true }).first().click(); await win.waitForTimeout(800);
  await win.screenshot({ path: `${OUT}/${tag}-builder-add.png` });
  console.log('errors', JSON.stringify(errors), builder);
  await app.close();
})().catch((e) => { console.error(e); process.exit(1); });
