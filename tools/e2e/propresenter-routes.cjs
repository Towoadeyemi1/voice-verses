// ProPresenter's three ways (1.19.3), in Settings → ProPresenter:
//  - the chooser: a slide with linked text, a slide with Voice Verses' picture (NDI), a message (the default);
//  - linked text: Write a test verse / Clear it write and empty the files; a verse taken on the live screen is
//    written with its reference, and Clear (Esc) empties it; song words go too only when switched on;
//  - nothing is written in practice (Training), nor with sending off, nor on the message route;
//  - the NDI way says what this computer needs; the booth check checks the way chosen.
const fs = require('fs');
const path = require('path');
const { OUT, launch, check, done } = require('./lib.cjs');

const DOCS = path.join(OUT, 'pp-routes-docs');
const FOLDER = path.join(DOCS, 'Voice Verses', 'ProPresenter');
const read = (name) => {
  try {
    return fs.readFileSync(path.join(FOLDER, name), 'utf8');
  } catch {
    return null;
  }
};
const until = async (win, test, ms = 15000) => {
  for (let t = 0; t < ms; t += 250) {
    if (await test().catch(() => false)) return true;
    await win.waitForTimeout(250);
  }
  return false;
};

(async () => {
  fs.rmSync(DOCS, { recursive: true, force: true });
  const { app, win, errors } = await launch('pp-routes');
  await app.evaluate(({ app }, dir) => app.setPath('documents', dir), DOCS);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1500, height: 1000 }));
  await win.evaluate(() => localStorage.setItem('voice-verses-guide-voice', 'off'));
  await win.waitForTimeout(2500);

  const openPane = async () => {
    await win.locator('[data-guide="settings"]').click();
    await win.waitForTimeout(800);
    await win.locator('[data-pane="propresenter"]').click();
    await win.waitForTimeout(1200);
  };
  const closeSettings = async () => {
    await win.keyboard.press('Escape');
    await win.waitForTimeout(600);
  };
  const take = async (ref) => {
    await win.locator('[data-guide="search"]').click();
    await win.locator('[cmdk-input]').fill(ref);
    await win.waitForTimeout(400);
    await win.keyboard.press('Enter');
    await win.waitForTimeout(1200);
    await win.locator('[data-guide="take"]').click();
    await win.waitForTimeout(1200);
  };

  // The chooser
  await openPane();
  const routes = await win.locator('[data-pp-route]').evaluateAll((els) => els.map((e) => `${e.dataset.ppRoute}:${e.getAttribute('aria-checked')}`));
  check('three ways, the message chosen as before', routes.join(',') === 'linked:false,ndi:false,message:true', routes.join(','));
  check('…and the message’s own settings show', (await win.locator('[data-propresenter-status]').count()) === 1);

  // Linked text
  await win.locator('[data-pp-route="linked"]').click();
  await win.waitForTimeout(600);
  check('a slide with linked text shows its folder and steps', (await win.locator('[data-pp-linked]').count()) === 1 && (await win.locator('[data-propresenter-status]').count()) === 0);
  const folder = (await win.locator('[data-pp-folder]').innerText()).trim();
  check('…the folder is in Documents', folder === FOLDER, folder);
  await win.screenshot({ path: `${OUT}/pp-routes-1-linked.png` });
  await win.locator('[data-pp-linked-test]').click();
  await win.waitForTimeout(800);
  check('Write a test verse writes the files, even with sending off', /For God so loved/.test(read('verse.txt') ?? '') && read('reference.txt') === 'John 3:16 KJV' && /\nJohn 3:16 KJV$/.test(read('verse-and-reference.txt') ?? ''), JSON.stringify(read('reference.txt')));
  await win.getByRole('button', { name: 'Clear it' }).click();
  await win.waitForTimeout(800);
  check('Clear it empties them', read('verse.txt') === '' && read('reference.txt') === '');
  await closeSettings();

  await take('John 3:16');
  check('with sending off, a verse taken is not written', read('verse.txt') === '');

  await openPane();
  await win.locator('#pp-linked-on').click();
  await win.waitForTimeout(400);
  await closeSettings();
  await take('Romans 8:28');
  const written = await until(win, async () => /all things work together/.test(read('verse.txt') ?? ''), 5000);
  check('with sending on, the verse taken is written with its reference', written && read('reference.txt') === 'Romans 8:28 KJV', JSON.stringify(read('reference.txt')));
  await win.keyboard.press('Escape');
  check('Clear (Esc) empties the files', await until(win, async () => read('verse.txt') === '', 5000), JSON.stringify(read('verse.txt')));

  // Songs: only when switched on
  const holy = win.locator('nav[aria-label="Order of service"] button[title*="Holy, Holy, Holy"]').first();
  await holy.click();
  await win.waitForTimeout(1200);
  await win.locator('[data-guide="take"]').click();
  await win.waitForTimeout(1000);
  check('song words are not written unless switched on', read('verse.txt') === '');
  await openPane();
  await win.locator('#pp-linked-songs').click();
  await win.waitForTimeout(300);
  await closeSettings();
  await win.locator('[data-guide="take"]').click();
  await win.waitForTimeout(1000);
  check('with Also song words, the song slide is written with the song and section', /holy/i.test(read('verse.txt') ?? '') && /^Holy, Holy, Holy/.test(read('reference.txt') ?? ''), JSON.stringify(read('reference.txt')));
  await win.locator('[data-guide="clear"]').click();
  await win.waitForTimeout(800);
  check('…and cleared with Clear', read('verse.txt') === '');

  // Practice never writes: the Training lesson takes John 3:16
  await win.evaluate(() => (location.hash = '#/training'));
  await win.waitForTimeout(1200);
  await win.locator('[data-lesson="first-sunday"] [data-lesson-show]').click();
  await until(win, async () => /John 3:16/.test(await win.locator('[data-label-detail="live"]').innerText()), 40000);
  check('a Training lesson in practice writes nothing for ProPresenter', read('verse.txt') === '', JSON.stringify(read('verse.txt')));
  await win.locator('[data-guide-leave]').click();
  await win.waitForTimeout(800);

  // NDI
  await openPane();
  await win.locator('[data-pp-route="ndi"]').click();
  await win.waitForTimeout(800);
  const ndiText = (await win.locator('[data-pp-ndi]').innerText()) || '';
  check('a slide with Voice Verses’ picture says what this computer needs (no NDI Runtime here)', /NDI Runtime|Voice Verses Projector|Off/.test(ndiText), ndiText.slice(0, 120));
  await win.screenshot({ path: `${OUT}/pp-routes-2-ndi.png` });
  await win.locator('[data-settings-booth]').click();
  await win.waitForTimeout(2500);
  const pp = await win.locator('[data-check="propresenter"]').getAttribute('data-state').catch(() => null);
  check('the booth check checks the NDI way', pp === 'warn', String(pp));

  // Back to the message: nothing written
  await win.locator('[data-pane="propresenter"]').click();
  await win.waitForTimeout(600);
  await win.locator('[data-pp-route="message"]').click();
  await win.waitForTimeout(400);
  await closeSettings();
  await take('Psalm 23:1');
  check('the message way writes no files', read('verse.txt') === '');

  check('no page errors', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
