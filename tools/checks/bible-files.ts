// CI check (1.19.15): Bible files in every format Voice Verses reads come out as the same 66 books,
// with footnotes left out and the translators' added words kept as {word}. KJV text only.
import { strToU8, zipSync } from 'fflate';
import { readBibleFile, type ReadBible } from '@/lib/bibleFiles';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '✅' : '❌'} ${label}${!ok && detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};
const J316 = 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.';
const G11 = 'In the beginning God created the heaven and the earth.';
const PS231 = 'The LORD {is} my shepherd; I shall not want.';
const read = (name: string, text: string | Uint8Array) => readBibleFile(name, typeof text === 'string' ? strToU8(text) : text);
const v = (b: ReadBible, book: number, c: number, n: number) => b.books[book].chapters[c - 1]?.[n - 1];
const same = (label: string, b: ReadBible) => {
  check(`${label}: John 3:16`, v(b, 42, 3, 16) === J316, v(b, 42, 3, 16));
  check(`${label}: Genesis 1:1`, v(b, 0, 1, 1) === G11, v(b, 0, 1, 1));
  check(`${label}: Psalm 23:1 keeps the added word as {is}`, v(b, 18, 23, 1) === PS231, v(b, 18, 23, 1));
  check(`${label}: 66 books in order`, b.books.length === 66 && b.books[42].name === 'John' && b.books[42].abbrev === 'jo');
};

// OSIS, verses as containers, with a note and a title
const osis = read(
  'kjv.osis.xml',
  `<?xml version="1.0" encoding="UTF-8"?><osis xmlns="http://www.bibletechnologies.net/2003/OSIS/namespace"><osisText osisIDWork="KJV"><header><work osisWork="KJV"><title>King James Version</title></work></header>
  <div type="book" osisID="Gen"><chapter osisID="Gen.1"><title type="chapter">Chapter 1</title><verse osisID="Gen.1.1">In the beginning God created the heaven and the earth.<note type="study">Heb. the heavens</note></verse></chapter></div>
  <div type="book" osisID="Ps"><chapter osisID="Ps.23"><verse osisID="Ps.23.1">The <divineName>LORD</divineName> <transChange type="added">is</transChange> my shepherd; I shall not want.</verse></chapter></div>
  <div type="book" osisID="John"><chapter osisID="John.3"><verse osisID="John.3.16">For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.</verse></chapter></div>
  <div type="book" osisID="Tob"><chapter osisID="Tob.1"><verse osisID="Tob.1.1">The book of the words of Tobit.</verse></chapter></div>
  </osisText></osis>`,
);
same('OSIS', osis);
check('OSIS: the name from the file', osis.name === 'King James Version' && osis.abbreviation === 'KJV', `${osis.name} / ${osis.abbreviation}`);
check('OSIS: the Apocrypha is left out and named', osis.leftOut.includes('Tob'));
check('OSIS: books it lacks are named', osis.missing.includes('Exodus') && !osis.missing.includes('John'));

// OSIS, verses as milestones (sID/eID), a verse across a paragraph
const milestones = read(
  'kjv-ms.xml',
  `<osis><osisText><div type="book" osisID="Gen"><chapter sID="Gen.1"/><p><verse sID="Gen.1.1" osisID="Gen.1.1"/>In the beginning God created</p><p>the heaven and the earth.<verse eID="Gen.1.1"/></p><chapter eID="Gen.1"/></div>
  <div type="book" osisID="Ps"><chapter sID="Ps.23"/><verse sID="Ps.23.1" osisID="Ps.23.1"/>The LORD <transChange type="added">is</transChange> my shepherd; I shall not want.<verse eID="Ps.23.1"/></div>
  <div type="book" osisID="John"><chapter sID="John.3"/><verse sID="John.3.16" osisID="John.3.16"/>For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.<verse eID="John.3.16"/></div></osisText></osis>`,
);
same('OSIS milestones', milestones);

// USFX
const usfx = read(
  'kjv_usfx.xml',
  `<?xml version="1.0"?><usfx><book id="GEN"><h>Genesis</h><c id="1"/><p><v id="1"/>In the beginning God created the heaven and the earth.<f caller="+">Heb. the heavens</f><ve/></p></book>
  <book id="PSA"><c id="23"/><q><v id="1"/>The LORD <add>is</add> my shepherd; I shall not want.<ve/></q></book>
  <book id="JHN"><c id="3"/><p><v id="16"/>For God so loved the world, that he gave his only begotten Son, <x caller="-">Rom 5:8</x>that whosoever believeth in him should not perish, but have everlasting life.<ve/></p></book></usfx>`,
);
same('USFX', usfx);

// Zefania
const zef = read(
  'kjv-zefania.xml',
  `<?xml version="1.0"?><XMLBIBLE biblename="King James Version"><INFORMATION><title>King James Version</title><identifier>KJV</identifier></INFORMATION>
  <BIBLEBOOK bnumber="1" bname="Genesis"><CHAPTER cnumber="1"><VERS vnumber="1">In the beginning God created the heaven and the earth.<NOTE>Heb. the heavens</NOTE></VERS></CHAPTER></BIBLEBOOK>
  <BIBLEBOOK bnumber="19" bname="Psalms"><CHAPTER cnumber="23"><VERS vnumber="1">The LORD {is} my shepherd; I shall not want.</VERS></CHAPTER></BIBLEBOOK>
  <BIBLEBOOK bnumber="43" bname="John"><CHAPTER cnumber="3"><VERS vnumber="16">For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.</VERS></CHAPTER></BIBLEBOOK></XMLBIBLE>`,
);
same('Zefania', zef);
check('Zefania: the name and short name from the file', zef.name === 'King James Version' && zef.abbreviation === 'KJV');

// USFM, several books in one file, with word markup, notes and headings
const usfmText = `\\id GEN King James Version\n\\h Genesis\n\\mt1 The First Book of Moses\n\\c 1\n\\s1 The Creation\n\\p\n\\v 1 In the \\w beginning|strong="H7225"\\w* God created the heaven and the earth.\\f + \\fr 1:1 \\ft Heb. the heavens\\f*\n\\id PSA\n\\c 23\n\\d A Psalm of David.\n\\q1\n\\v 1 The \\nd LORD\\nd* \\add is\\add* my shepherd; I shall not want.\n\\id JHN\n\\c 3\n\\p\n\\v 16 ¶ For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.\\x - \\xo 3:16 \\xt Rom 5:8\\x*\n`;
same('USFM', read('kjv.usfm', usfmText));

// A .zip of USFM files with Digital Bible Library metadata (as eBible.org shares them)
const zip = zipSync({
  'metadata.xml': strToU8('<?xml version="1.0"?><DBLMetadata><identification><name>King James Version</name><abbreviationLocal>KJV</abbreviationLocal></identification></DBLMetadata>'),
  ...Object.fromEntries(usfmText.split(/(?=\\id )/).filter(Boolean).map((t, i) => [`0${i}-book.usfm`, strToU8(t)])),
});
const zipped = read('eng-kjv_usfm.zip', zip);
same('USFM .zip', zipped);
check('USFM .zip: the name from its metadata', zipped.name === 'King James Version' && zipped.abbreviation === 'KJV', `${zipped.name} / ${zipped.abbreviation}`);

// JSON: the built-in shape, and BibleSuperSearch's
const books = Array.from({ length: 66 }, (_, i) => ({ abbrev: '', name: '', chapters: [] as string[][] }));
books[0] = { abbrev: 'gn', name: 'Genesis', chapters: [[G11]] };
books[18] = { abbrev: 'ps', name: 'Psalms', chapters: Array.from({ length: 23 }, (_, i) => (i === 22 ? [PS231] : [])) };
books[42] = { abbrev: 'jo', name: 'John', chapters: [[], [], Array.from({ length: 16 }, (_, i) => (i === 15 ? J316 : ''))] };
same('JSON (built-in)', read('mine.json', JSON.stringify(books)));
same('JSON (BibleSuperSearch)', read('kjv.json', JSON.stringify({ metadata: { name: 'King James Version', shortname: 'KJV' }, verses: [{ book: 1, chapter: 1, verse: 1, text: G11 }, { book: 19, chapter: 23, verse: 1, text: PS231 }, { book: 43, chapter: 3, verse: 16, text: J316 }] })));

// UTF-16 with a byte-order mark
const u16 = new Uint8Array([0xff, 0xfe, ...Array.from(usfmText).flatMap((ch) => [ch.charCodeAt(0) & 255, ch.charCodeAt(0) >> 8])]);
same('USFM in UTF-16', read('kjv16.usfm', u16));

// Not a Bible: says so plainly
let message = '';
try {
  read('notes.txt', 'Grace that keeps. Ephesians 2:8.');
} catch (e) {
  message = (e as Error).message;
}
check('A file that isn’t a Bible says which formats it reads', /OSIS, USFX and Zefania XML, USFM, and JSON/.test(message), message);

console.log(failures ? `\n❌ ${failures} Bible file check(s) failed` : '\n✅ Every Bible file format reads the same');
process.exit(failures ? 1 : 0);
