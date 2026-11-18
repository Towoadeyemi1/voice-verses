// Updates (1.19.9), against a local update server (VOICE_VERSES_UPDATE_FEED):
//  - a newer version is found by itself when the app opens, and the operator is told,
//    even though the answer may come before the window is ready (the 1.19.8 bug);
//  - Settings → Desktop app → Updates shows it; on a Mac that can't update itself, Download
//    fetches this Mac's installer to Downloads, a file that doesn't match the release is
//    refused and deleted, and a good one offers Open the installer;
//  - with nothing newer, it says this is the latest, and Check now looks again.
// The Windows path (download, then Restart to update) is electron-updater's own; its button
// shows for status "ready".
const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { OUT, launch, check, done } = require('./lib.cjs');

const DIR = path.join(OUT, 'updates');
fs.rmSync(DIR, { recursive: true, force: true });
fs.mkdirSync(path.join(DIR, 'downloads'), { recursive: true });
const installer = crypto.randomBytes(300_000);
const sha = (b) => crypto.createHash('sha512').update(b).digest('base64');
const name = `Voice-Verses-mac-${process.arch === 'arm64' ? 'arm64' : 'x64'}.dmg`;
let feed = { version: '9.9.9', sha: sha(Buffer.from('not the same file')) };
const yml = () => `version: ${feed.version}\nfiles:\n  - url: ${name}\n    sha512: ${feed.sha}\n    size: ${installer.length}\npath: ${name}\nsha512: ${feed.sha}\nreleaseDate: '2026-11-18T18:00:00.000Z'\n`;
const server = http.createServer((req, res) => {
  if (/latest.*\.yml/.test(req.url)) return res.writeHead(200, { 'content-type': 'text/yaml' }).end(yml());
  if (req.url.endsWith(name)) return res.writeHead(200, { 'content-length': installer.length }).end(installer);
  res.writeHead(404).end();
});

const openUpdates = async (win) => {
  await win.locator('[data-guide="settings"]').click();
  await win.waitForTimeout(700);
  await win.locator('[data-pane="app"]').click();
  await win.waitForTimeout(700);
};
const status = (win) => win.locator('[data-update-status]').getAttribute('data-update-status');
const until = async (fn, ms = 15000) => {
  for (let t = 0; t < ms; t += 250) {
    if (await fn().catch(() => false)) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
};

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.VOICE_VERSES_UPDATE_FEED = `http://127.0.0.1:${server.address().port}`;
  process.env.VOICE_VERSES_UPDATE_MODE = 'installer';

  // A newer version, on a Mac that installs by hand
  let { app, win, errors } = await launch('updates');
  await app.evaluate(({ app }, dir) => app.setPath('downloads', dir), path.join(DIR, 'downloads'));
  check('a newer version is found when the app opens, and the operator is told', await until(async () => (await win.getByText('Voice Verses 9.9.9 is available').count()) === 1));
  await win.screenshot({ path: `${OUT}/updates-1-told.png` });
  await openUpdates(win);
  check('Settings marks Desktop app with the new version', (await win.locator('[data-update-badge]').innerText()).trim() === '9.9.9');
  check('Settings → Desktop app → Updates shows it', (await status(win)) === 'available' && /9\.9\.9 is out/.test(await win.locator('[data-updates]').innerText()));
  await win.screenshot({ path: `${OUT}/updates-2-available.png` });

  await win.locator('[data-update-action="download"]').click();
  check('a download that doesn’t match the release is refused, and deleted', await until(async () => /didn’t match/.test(await win.locator('[data-updates]').innerText())));
  check('…nothing is left in Downloads', fs.readdirSync(path.join(DIR, 'downloads')).length === 0, fs.readdirSync(path.join(DIR, 'downloads')).join());

  feed = { ...feed, sha: sha(installer) };
  await app.evaluate(() => {}); // the server now serves the right checksum; the app reads it on the next check
  await app.close();
  ({ app, win, errors } = await launch('updates'));
  await app.evaluate(({ app }, dir) => app.setPath('downloads', dir), path.join(DIR, 'downloads'));
  await until(async () => (await win.getByText('Voice Verses 9.9.9 is available').count()) === 1);
  await openUpdates(win);
  await win.locator('[data-update-action="download"]').click();
  check('a good download lands in Downloads, checked', await until(async () => (await status(win)) === 'downloaded'));
  const file = path.join(DIR, 'downloads', name.replace('.dmg', '-9.9.9.dmg'));
  check('…the same file as the release', fs.existsSync(file) && fs.readFileSync(file).equals(installer));
  check('…and offers Open the installer, with the steps', (await win.locator('[data-update-action="open"]').count()) === 1 && /drag Voice Verses to Applications/.test(await win.locator('[data-updates]').innerText()));
  check('…and the operator is told', (await win.getByText('Voice Verses 9.9.9 is downloaded').count()) === 1);
  await win.screenshot({ path: `${OUT}/updates-3-downloaded.png` });
  check('no errors in the window', errors.length === 0, errors.join(' | '));
  await app.close();

  // Nothing newer
  feed = { version: '0.0.1', sha: sha(installer) };
  ({ app, win, errors } = await launch('updates'));
  await openUpdates(win);
  check('with nothing newer, it says this is the latest', await until(async () => (await status(win)) === 'latest'));
  feed = { version: '9.9.10', sha: sha(installer) };
  await win.locator('[data-update-action="check"]').click();
  check('Check now looks again and finds a newer one', await until(async () => (await status(win)) === 'available' && /9\.9\.10/.test(await win.locator('[data-updates]').innerText())));
  await win.screenshot({ path: `${OUT}/updates-4-check-now.png` });
  check('no errors in the window', errors.length === 0, errors.join(' | '));
  await app.close();
  server.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
