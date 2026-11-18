// Add from a file (1.19.7): in the service editor, a PDF (made here with the browser's print to
// PDF), a PowerPoint and Word sermon notes are reviewed and added to a section: PDF pages as
// pictures (one left out), the PowerPoint as words with its speaker notes, the notes' scriptures
// (a chapter alone left unticked) and points; an old .ppt is refused with what to do; and the
// notes reach the stage monitor when a slide from the part goes live.
// KJV and public-domain words only.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { strToU8, zipSync } = require('fflate');
const { OUT, launch, check, done } = require('./lib.cjs');

const DIR = path.join(OUT, 'add-from-file');
fs.mkdirSync(DIR, { recursive: true });

const rel = (id, type, target) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`;
const rels = (...r) => `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${r.join('')}</Relationships>`;
const shape = (ph, paragraphs) =>
  `<p:sp><p:nvSpPr><p:cNvPr id="2" name="x"/><p:cNvSpPr/><p:nvPr>${ph ? `<p:ph type="${ph}"/>` : ''}</p:nvPr></p:nvSpPr><p:txBody>${paragraphs.map((t) => `<a:p><a:r><a:t>${t}</a:t></a:r></a:p>`).join('')}</p:txBody></p:sp>`;
const slide = (inner) => `<?xml version="1.0"?><p:sld xmlns:a="a" xmlns:p="p" xmlns:r="r"><p:cSld><p:spTree>${inner}</p:spTree></p:cSld></p:sld>`;
const para = (text, style) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;

(async () => {
  // The files
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(
    '<style>@page{margin:0}html,body{margin:0}section{height:720px;overflow:hidden;box-sizing:border-box}</style>' +
    ['Amazing Grace|A sermon on grace', 'Grace finds us|For God so loved the world: John 3:16', 'Grace keeps us|Titus 2:11'].map((p, i) => `<section style="display:grid;place-items:center;background:${['#3b2a6b', '#1f3a5f', '#0f2f2a'][i]};color:#fff;font:64px Georgia;text-align:center;${i < 2 ? 'page-break-after:always' : ''}"><div>${p.replace('|', '<br><small style="font-size:32px">')}</small></div></section>`).join(''),
  );
  fs.writeFileSync(path.join(DIR, 'grace-sermon.pdf'), await page.pdf({ width: '1280px', height: '720px', printBackground: true }));
  await browser.close();
  fs.writeFileSync(
    path.join(DIR, 'grace-slides.pptx'),
    zipSync({
      'ppt/presentation.xml': strToU8(`<?xml version="1.0"?><p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId id="256" r:id="rId1"/><p:sldId id="257" r:id="rId2"/></p:sldIdLst></p:presentation>`),
      'ppt/_rels/presentation.xml.rels': strToU8(rels(rel('rId1', 'slide', 'slides/slide1.xml'), rel('rId2', 'slide', 'slides/slide2.xml'))),
      'ppt/slides/slide1.xml': strToU8(slide(shape('ctrTitle', ['Amazing Grace']) + shape('subTitle', ['How sweet the sound']))),
      'ppt/slides/slide2.xml': strToU8(slide(shape('title', ['Grace finds us']) + shape(null, ['Romans 5:8']))),
      'ppt/slides/_rels/slide2.xml.rels': strToU8(rels(rel('rId9', 'notesSlide', '../notesSlides/notesSlide1.xml'))),
      'ppt/notesSlides/notesSlide1.xml': strToU8(slide(shape('body', ['Pause here and ask the question.']))),
    }),
  );
  fs.writeFileSync(
    path.join(DIR, 'sermon-notes.docx'),
    zipSync({
      'word/document.xml': strToU8(
        `<?xml version="1.0"?><w:document xmlns:w="w"><w:body>${[
          para('Grace that keeps', 'Title'),
          para('Text: Ephesians 2:8-9 and Titus 2:11.'),
          para('Grace finds us where we are', 'Heading1'),
          para('Like Noah in Genesis 6, we were found by grace. Romans 5:8 shows it.'),
          para('Grace changes how we live', 'Heading1'),
          para('Grace keeps us to the end', 'Heading1'),
        ].join('')}</w:body></w:document>`,
      ),
    }),
  );
  fs.writeFileSync(path.join(DIR, 'old-slides.ppt'), Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));

  const { app, win, errors } = await launch('add-from-file');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1500, height: 1000 }));
  await win.evaluate(() => localStorage.setItem('voice-verses-guide-voice', 'off'));
  await win.waitForTimeout(3000);
  const id = await win.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('cornerstone-bible-db');
        r.onsuccess = () => {
          const q = r.result.transaction('services').objectStore('services').getAll();
          q.onsuccess = () => res(q.result.find((s) => s.name === 'Sample: Sunday Celebration')?.id);
        };
      }),
  );
  await win.evaluate((id) => (location.hash = `#/service-builder/${id}`), id);
  await win.waitForTimeout(2500);
  let target = '';
  const dialog = win.locator('[data-add-from-file]');
  const add = async (file) => {
    await win.locator('[data-add-from-file-input]').setInputFiles(path.join(DIR, file));
    await dialog.waitFor({ timeout: 10000 });
    await win.locator('[data-add-confirm]:not([disabled]), [data-add-error]').first().waitFor({ timeout: 30000 });
    await win.waitForTimeout(400);
    // The section it goes into: the one holding the part chosen in the editor
    target = /Add to (.+?) · /.exec(await dialog.innerText())?.[1] ?? '';
  };

  // A PDF: pages as pictures
  await add('grace-sermon.pdf');
  check('the PDF’s pages are found', /3 pages found/.test(await dialog.innerText()), (await dialog.innerText()).slice(0, 120));
  check('…drawn as pictures', (await dialog.locator('[data-add-page] img').count()) === 3);
  await dialog.locator('[data-add-page="1"]').click();
  const summary = await dialog.locator('[data-add-summary]').innerText();
  check('untick a page; the scriptures on them go in too', /2 of 3 pages/.test(summary) && /John 3:16/.test(summary) && /Titus 2:11/.test(summary), summary);
  await win.screenshot({ path: `${OUT}/add-from-file-1-pdf.png` });
  await dialog.locator('[data-add-confirm]').click();
  await win.waitForTimeout(800);
  check('added to the section, with a message', !!target && (await win.getByText(`Added to ${target}`).count()) >= 1, target);

  // A PowerPoint: as words, with speaker notes
  await add('grace-slides.pptx');
  check('a PowerPoint can’t be “exactly as made”: words, and how to get an exact copy', (await dialog.locator('[data-add-as="pictures"]').isDisabled()) && /save it as a PDF first/.test(await dialog.innerText()));
  check('…its speaker notes can go to the stage', (await dialog.getByText('Notes to the stage monitor').count()) === 1);
  await win.screenshot({ path: `${OUT}/add-from-file-2-pptx.png` });
  await dialog.locator('[data-add-confirm]').click();
  await win.waitForTimeout(800);

  // Word notes
  await add('sermon-notes.docx');
  const verses = await dialog.locator('[data-add-verse]').evaluateAll((els) => els.map((e) => `${e.dataset.addVerse}:${e.getAttribute('aria-checked')}`));
  check('the notes’ scriptures, a chapter alone unticked', verses.join('|') === 'Ephesians 2:8-9:true|Titus 2:11:true|Genesis 6:false|Romans 5:8:true', verses.join('|'));
  check('…three points', (await dialog.locator('[data-add-point]').count()) === 3);
  await win.screenshot({ path: `${OUT}/add-from-file-3-notes.png` });
  await dialog.locator('[data-add-confirm]').click();
  await win.waitForTimeout(800);

  // An old .ppt
  await add('old-slides.ppt');
  check('an old .ppt says to save it again', /Save it again as PDF/.test(await dialog.locator('[data-add-error]').innerText()));
  await win.keyboard.press('Escape');
  await win.waitForTimeout(400);

  // Saved into the service
  await win.getByRole('button', { name: /^Save$/ }).first().click();
  await win.waitForTimeout(1200);
  const saved = await win.evaluate(
    (id) =>
      new Promise((res) => {
        const r = indexedDB.open('cornerstone-bible-db');
        r.onsuccess = () => {
          const q = r.result.transaction('services').objectStore('services').get(id);
          q.onsuccess = () => res(q.result);
        };
      }),
    id,
  );
  const section = saved.sections.find((sec) => sec.name === target);
  const parts = section.subsections.map((p) => `${p.name}:${p.slides.map((s) => s.type[0]).join('')}`);
  check(
    'the section holds them: PDF pictures, its scriptures, the slides as words, the notes’ scriptures and points',
    parts.slice(-6).join('|') === 'grace-sermon:ii|Scripture:ss|grace-slides:aa|Scripture:s|Scripture:ssss|Points:aaa',
    parts.join('|'),
  );
  const pdfPart = section.subsections.find((p) => p.name === 'grace-sermon');
  check('…the PDF pages are pictures of the pages', pdfPart.slides.every((s) => s.imageUrl.startsWith('data:image/jpeg')) && pdfPart.slides.length === 2);
  check('…the PowerPoint keeps its speaker notes', section.subsections.find((p) => p.name === 'grace-slides').slides[1].slideNotes === 'Pause here and ask the question.');
  const notesPart = section.subsections.filter((p) => p.name === 'Scripture').at(-1);
  check('…and the sermon notes are the stage notes of their first part', /Grace that keeps/.test(notesPart.presenterNotes ?? ''));

  // The stage sees the notes when a slide goes live
  await win.evaluate(() => (location.hash = '#/'));
  await win.waitForTimeout(3000);
  const notes = await win.evaluate(async (sectionName) => {
    const part = [...document.querySelectorAll('nav[aria-label="Order of service"] button')].find((b) => /grace-slides/.test(b.title || b.textContent));
    return { found: !!part, section: sectionName };
  }, section.name);
  if (notes.found) {
    await win.locator('nav[aria-label="Order of service"] button[title*="grace-slides"]').first().click();
    await win.waitForTimeout(800);
    await win.locator('section[aria-label="Slides"] [role="listitem"]').nth(1).locator('button').first().dblclick();
    await win.waitForTimeout(800);
    const live = await win.evaluate(() => JSON.parse(localStorage.getItem('voice-verses-live') || 'null'));
    check('the slide’s notes go to the stage monitor with it', live?.data?.notes === 'Pause here and ask the question.', JSON.stringify(live?.data?.notes));
  } else check('the part is on the live screen', false, 'grace-slides not found in the order of service');

  check('no errors in the window', errors.length === 0, errors.join(' | '));
  await app.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
