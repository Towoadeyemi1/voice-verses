/**
 * Checks Add from a file (1.19.7) in Node: written references, a PowerPoint and a Word file
 * built here (KJV and public-domain words only), text notes, points and notes, and the parts
 * they become. PDF pages are drawn by pdf.js in the app: tools/e2e/add-from-file.cjs. CI CHECK 13:
 *   npx esbuild tools/checks/import-check.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/import-check.cjs && node /tmp/import-check.cjs
 */
const store = new Map<string, string>();
(globalThis as unknown as Record<string, unknown>).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) };
(globalThis as unknown as Record<string, unknown>).window = globalThis;
import { strToU8, zipSync } from 'fflate';
import { findWrittenReferences } from '@/lib/importers/references';
import { FileReadError, readDocx, readPptx, readTextNotes } from '@/lib/importers/office';
import { partsFrom, pointsAndNotes, scripturesIn, type Found } from '@/lib/importers';

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
};

// A 1×1 PNG
const PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
const rel = (id: string, type: string, target: string) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`;
const rels = (...r: string[]) => `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${r.join('')}</Relationships>`;
const shape = (ph: string | null, paragraphs: string[]) =>
  `<p:sp><p:nvSpPr><p:cNvPr id="2" name="x"/><p:cNvSpPr/><p:nvPr>${ph ? `<p:ph type="${ph}"/>` : ''}</p:nvPr></p:nvSpPr><p:txBody>${paragraphs.map((t) => `<a:p><a:r><a:rPr lang="en-GB"/><a:t>${t}</a:t></a:r></a:p>`).join('')}</p:txBody></p:sp>`;
const slide = (inner: string, hidden = false) => `<?xml version="1.0"?><p:sld xmlns:a="a" xmlns:p="p" xmlns:r="r"${hidden ? ' show="0"' : ''}><p:cSld><p:spTree>${inner}</p:spTree></p:cSld></p:sld>`;

function makePptx(): Uint8Array {
  return zipSync({
    'ppt/presentation.xml': strToU8(`<?xml version="1.0"?><p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId id="256" r:id="rId3"/><p:sldId id="257" r:id="rId2"/><p:sldId id="258" r:id="rId4"/><p:sldId id="259" r:id="rId5"/></p:sldIdLst></p:presentation>`),
    'ppt/_rels/presentation.xml.rels': strToU8(rels(rel('rId2', 'slide', 'slides/slide2.xml'), rel('rId3', 'slide', 'slides/slide1.xml'), rel('rId4', 'slide', 'slides/slide3.xml'), rel('rId5', 'slide', 'slides/slide4.xml'))),
    'ppt/slides/slide1.xml': strToU8(slide(shape('ctrTitle', ['Amazing Grace']) + shape('subTitle', ['A sermon on grace']) + shape('sldNum', ['1']))),
    'ppt/slides/slide2.xml': strToU8(slide(shape('title', ['Grace finds us']) + shape(null, ['Read John 3:16 &amp; Romans 5:8', 'We were lost']) + `<p:pic><p:blipFill><a:blip r:embed="rId9"/></p:blipFill></p:pic>`)),
    'ppt/slides/_rels/slide2.xml.rels': strToU8(rels(rel('rId9', 'image', '../media/image1.png'), rel('rId10', 'notesSlide', '../notesSlides/notesSlide1.xml'))),
    'ppt/notesSlides/notesSlide1.xml': strToU8(slide(shape('sldImg', []) + shape('body', ['Pause here and ask the question.']) + shape('sldNum', ['2']))),
    'ppt/media/image1.png': PNG,
    'ppt/slides/slide3.xml': strToU8(slide(shape('title', ['Hidden slide']), true)),
    'ppt/slides/slide4.xml': strToU8(slide(`<p:pic><p:blipFill><a:blip r:embed="rId1"/></p:blipFill></p:pic>`)),
    'ppt/slides/_rels/slide4.xml.rels': strToU8(rels(rel('rId1', 'image', '../media/image1.png'))),
  });
}

const para = (text: string, style?: string, numbered = false) =>
  `<w:p>${style || numbered ? `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${numbered ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : ''}</w:pPr>` : ''}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;

function makeDocx(): Uint8Array {
  const body = [
    para('Grace that keeps', 'Title'),
    para('Text: Ephesians 2:8-9 and Titus 2:11.'),
    para('Grace finds us where we are', 'Heading1'),
    para('Like Noah in Genesis 6, we were found by grace. Romans 5:8 shows it.'),
    para('Grace changes how we live', 'Heading1'),
    para('2 Cor 12:9'),
    para('Grace keeps us to the end', '', true),
    para('Close with Jude 24 and prayer.'),
  ].join('');
  return zipSync({ 'word/document.xml': strToU8(`<?xml version="1.0"?><w:document xmlns:w="w"><w:body>${body}</w:body></w:document>`) });
}

(async () => {
  // References as written
  const refs = findWrittenReferences('Then 1 Cor 13:4–7, Eph. 2:8-9, Ps 23:1-3, Romans 8:28, 31; II Timothy 3:16; like Noah in Genesis 6; Jude 3; mark 5 points; In 2020 we met.').map((r) => r.reference + (r.chapterOnly ? '*' : ''));
  check('written references, abbreviated and in lists', refs.join('|') === '1 Corinthians 13:4-7|Ephesians 2:8-9|Psalms 23:1-3|Romans 8:28|Romans 8:31|2 Timothy 3:16|Genesis 6*|Jude 1:3', refs.join('|'));

  // PowerPoint
  const pages = readPptx(makePptx());
  check('PowerPoint: slides in the presentation’s order, hidden ones left out', pages.length === 3 && pages[0].title === 'Amazing Grace' && pages[1].title === 'Grace finds us', pages.map((p) => p.title).join('|'));
  check('…words without the slide number', pages[0].text === 'A sermon on grace' && pages[1].text === 'Read John 3:16 & Romans 5:8\nWe were lost', JSON.stringify(pages[0].text));
  check('…its picture and speaker notes', pages[1].picture?.startsWith('data:image/png;base64,') === true && pages[1].notes === 'Pause here and ask the question.');
  check('…a slide that is only a picture', !pages[2].title && !pages[2].text && !!pages[2].picture);
  let refused = '';
  try {
    readPptx(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]));
  } catch (e) {
    refused = e instanceof FileReadError ? e.message : 'other';
  }
  check('an old .ppt is refused, saying what to do', /save it again as \.pptx/i.test(refused), refused);

  const presentation: Found = { kind: 'presentation', from: 'pptx', name: 'Grace sermon', pages, scriptures: (await scripturesIn(pages.map((p) => `${p.title}\n${p.text}`).join('\n'))).filter((s) => !s.chapterOnly) };
  check('scriptures written on the slides are found', presentation.scriptures.map((s) => s.reference).join('|') === 'John 3:16|Romans 5:8');
  const asWords = await partsFrom(presentation, { pages: [0, 1, 2], as: 'words', notesToStage: true });
  const deck = asWords[0];
  check('as words: titled slides in the church’s look, a picture alone stays a picture', deck.name === 'Grace sermon' && deck.slides.map((s) => s.type).join() === 'announcement,announcement,image' && deck.slides[1].type === 'announcement' && deck.slides[1].content.startsWith('Grace finds us\nRead John 3:16'));
  check('…speaker notes kept for the stage', deck.slides[1].slideNotes === 'Pause here and ask the question.');
  check('…and the scriptures as a part of their own', asWords[1]?.name === 'Scripture' && asWords[1].slides.map((s) => s.title).join() === 'John 3:16,Romans 5:8');
  const without = await partsFrom(presentation, { pages: [1], as: 'words', notesToStage: false });
  check('untick pages and notes: only what was chosen', without[0].slides.length === 1 && !without[0].slides[0].slideNotes);

  // Word
  const doc = readDocx(makeDocx());
  check('Word: paragraphs with the title, headings and numbering', doc.paragraphs.length === 8 && doc.paragraphs[0].title && doc.paragraphs[2].heading && doc.paragraphs[6].numbered);
  const { points, notes } = pointsAndNotes(doc);
  check('points: headings and numbered lines, not the title', points.join('|') === 'Grace finds us where we are|Grace changes how we live|Grace keeps us to the end', points.join('|'));
  check('…the notes are the whole text', notes.startsWith('Grace that keeps\nText: Ephesians 2:8-9') && notes.includes('Close with Jude 24'));
  const found = await scripturesIn(notes);
  check('scriptures in the notes, with their words; a chapter alone unticked', found.map((s) => `${s.reference}${s.chosen ? '' : '*'}`).join('|') === 'Ephesians 2:8-9|Titus 2:11|Genesis 6*|Romans 5:8|2 Corinthians 12:9|Jude 1:24', found.map((s) => `${s.reference}${s.chosen ? '' : '*'}`).join('|'));
  check('…each with its first words', /For by grace are ye saved/.test(found[0].preview));
  const sermon: Found = { kind: 'notes', name: 'Sermon notes', scriptures: found, points, notes };
  const parts = await partsFrom(sermon, { scriptures: found.filter((s) => s.chosen).map((s) => s.reference), points, notesToStage: true });
  check('notes become Scripture (a slide a verse) and Points', parts.map((p) => p.name).join() === 'Scripture,Points' && parts[0].slides.length === 6 && parts[1].slides.length === 3 && parts[1].slides[0].type === 'announcement');
  check('…and the notes go to the stage with the first', parts[0].presenterNotes === notes && !parts[1].presenterNotes);

  // Text and Markdown
  const md = pointsAndNotes(readTextNotes('# The good shepherd\n\nRead Psalm 23:1-3.\n\n## The Lord leads\nSome words.\n1. He restores\n2) Ps 23:4\nPoint 3: He prepares a table'));
  check('Markdown and numbered text: points, a reference-only line left out', md.points.join('|') === 'The Lord leads|He restores|He prepares a table', md.points.join('|'));

  if (failed) {
    console.error(`\n${failed} import check(s) failed`);
    process.exit(1);
  }
  console.log('\n✅ Add from a file checks passed');
})();
