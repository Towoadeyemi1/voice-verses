// A Bible file (1.19.15): a whole Bible as a .zip of USFM files (KJV text, as eBible.org shares
// Bibles; about 4 MB, more than the old localStorage place could hold) is added in Settings → Bible,
// named from its metadata, shown on the screens by its short name, and still there after a restart.
const fs = require('fs');
const path = require('path');
const { strToU8, zipSync } = require('fflate');
const { OUT, ROOT, launch, check, done } = require('./lib.cjs');

const CODES = 'GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split(' ');
const MARK = ' (from the test file)';

(async () => {
  // The file: every book of the built-in KJV as USFM, with its added words as \add, and DBL metadata
  const kjv = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/kjv-complete.json'), 'utf8').replace(/^﻿/, ''));
  const files = { 'metadata.xml': strToU8('<?xml version="1.0"?><DBLMetadata><identification><name>Test Bible from KJV text</name><abbreviationLocal>TKJV</abbreviationLocal></identification></DBLMetadata>') };
  kjv.forEach((book, i) => {
    let usfm = `\\id ${CODES[i]} Test Bible\n\\h ${book.name}\n`;
    book.chapters.forEach((ch, c) => {
      usfm += `\\c ${c + 1}\n\\p\n`;
      ch.forEach((text, v) => {
        let t = text.replace(/\{[^}]*:[^}]*\}/g, '').replace(/\{([^}]*)\}/g, '\\add $1\\add*').trim();
        if (i === 42 && c === 2 && v === 15) t += MARK;
        usfm += `\\v ${v + 1} ${t}\n`;
      });
    });
    files[`${String(i + 1).padStart(2, '0')}-${CODES[i]}.usfm`] = strToU8(usfm);
  });
  const zipFile = path.join(OUT, 'test-bible_usfm.zip');
  fs.writeFileSync(zipFile, zipSync(files));

  let { app, win, errors } = await launch('bible-file');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1500, height: 1000 }));
  await win.waitForTimeout(2000);
  await win.evaluate(() => (location.hash = '#/settings'));
  await win.waitForTimeout(1500);
  await win.locator('[data-pane="bible"]').click();
  await win.waitForTimeout(800);
  await win.locator('[data-version="custom"]').click();
  await win.waitForTimeout(600);
  await win.locator('[data-bible-file]').setInputFiles(zipFile);
  const toast = win.getByText('Test Bible from KJV text added');
  check('the Bible file is read and added, by its own name', await toast.waitFor({ timeout: 30000 }).then(() => true).catch(() => false));
  const toastText = await win.locator('[data-sonner-toast]').filter({ hasText: 'added' }).innerText().catch(() => '');
  check('…with its verses counted and its short name', /31,1\d\d verses, shown as TKJV/.test(toastText), toastText);
  check('…and its card says so', /TKJV/.test(await win.locator('[data-version="custom"]').innerText()));
  await win.screenshot({ path: `${OUT}/bible-file-1-settings.png` });
  const stored = await win.evaluate(() => ({ legacy: localStorage.getItem('cornerstone-custom-bible'), info: localStorage.getItem('cornerstone-custom-bible-info') }));
  check('…kept in the database, not in localStorage', !stored.legacy && /TKJV/.test(stored.info ?? ''), JSON.stringify(stored).slice(0, 120));

  const showJohn316 = async () => {
    await win.evaluate(() => (location.hash = '#/'));
    await win.waitForTimeout(2500);
    await win.locator('[data-guide="search"]').click();
    await win.locator('[cmdk-input]').fill('John 3:16');
    await win.waitForTimeout(800);
    await win.keyboard.press('Enter');
    await win.waitForTimeout(800);
    if (!/John 3:16/.test(await win.locator('[data-label-detail="live"]').innerText().catch(() => ''))) await win.locator('[data-guide="take"]').click();
    await win.waitForTimeout(1200);
    return win.evaluate(() => {
      const live = document.querySelector('[data-guide="live"]')?.textContent ?? '';
      return { live, label: document.querySelector('[data-label-detail="live"]')?.textContent ?? '' };
    });
  };
  let shown = await showJohn316();
  check('John 3:16 comes from the added Bible', shown.live.includes('(from the test file)'), shown.live.slice(0, 160));
  check('…labelled with its short name', /TKJV/.test(shown.live + shown.label), `${shown.label} | ${shown.live.slice(-40)}`);
  await win.screenshot({ path: `${OUT}/bible-file-2-live.png` });

  // After a restart (same profile)
  await app.close();
  const { _electron: electron } = require('playwright');
  app = await electron.launch({ executablePath: require(path.join(ROOT, 'node_modules/electron')), args: ['--no-sandbox', `--user-data-dir=${path.join(OUT, 'profile-bible-file')}`, ROOT], env: { ...process.env, ELECTRON_LOAD_DIST: '1' } });
  win = await app.firstWindow();
  errors = [];
  win.on('pageerror', (e) => errors.push(e.message));
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1500, height: 1000 }));
  await win.waitForTimeout(3000);
  shown = await showJohn316();
  check('after a restart, it is still the Bible on the screens', shown.live.includes('(from the test file)') && /TKJV/.test(shown.live + shown.label), shown.live.slice(0, 120));
  const switcher = await win.locator('button', { hasText: 'TKJV' }).count();
  check('…and the translation switch on the live screen names it', switcher >= 1);

  check('no errors in the window', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
