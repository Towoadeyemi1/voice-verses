/**
 * Hints of where the preacher is going next, said before the reference:
 * a book named on its own ("Paul says the same thing in Romans", "over in
 * Isaiah", "the book of Acts") or a writer ("as David wrote", "Jesus said").
 * Predictive Next uses them to have the likely verse waiting in Next.
 *
 * A hint never puts anything on screen by itself.
 */
import { normalizeTranscript } from './transcriptNormalization';

export const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
  '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah',
  'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah',
  'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
  'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
  'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];

const PAUL = ['Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon'];
const GOSPELS = ['Matthew', 'Mark', 'Luke', 'John'];

/** Writers and speakers, and the books their words are in. */
const WRITERS: [RegExp, string[]][] = [
  [/\b(?:apostle paul|paul)\b/, PAUL],
  [/\b(?:apostle peter|peter)\b/, ['1 Peter', '2 Peter']],
  [/\b(?:king david|david|the psalmist)\b/, ['Psalms']],
  [/\b(?:solomon|the wise man|the preacher in ecclesiastes)\b/, ['Proverbs', 'Ecclesiastes', 'Song of Solomon']],
  [/\bmoses\b/, ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy']],
  [/\b(?:jesus|christ|our lord|the lord jesus)\b/, GOSPELS],
  [/\b(?:the writer of hebrews|the author of hebrews)\b/, ['Hebrews']],
  [/\bjames\b/, ['James']],
  [/\bluke\b/, ['Luke', 'Acts']],
  [/\b(?:the apostle john|john the beloved|john)\b/, ['John', '1 John', '2 John', '3 John', 'Revelation']],
];

/** Book names that are also ordinary words or people: they count only in "the book of …", "turn to …", "the gospel of …". */
const AMBIGUOUS = new Set(['Job', 'Numbers', 'Acts', 'Mark', 'John', 'James', 'Jude', 'Judges', 'Revelation', 'Ruth', 'Amos', 'Daniel', 'Jonah', 'Joel', 'Luke', 'Matthew', 'Titus', 'Esther', 'Ezra', 'Lamentations']);

const spoken = (book: string): string[] => {
  const lower = book.toLowerCase();
  if (book === 'Psalms') return ['psalms', 'psalm'];
  if (book === 'Song of Solomon') return ['song of solomon', 'song of songs'];
  if (book === 'Revelation') return ['revelation', 'revelations'];
  return [lower];
};

const NAMES = BIBLE_BOOKS.flatMap((book) => spoken(book).map((name) => ({ name, book }))).sort((a, b) => b.name.length - a.name.length);
const NAME_PATTERN = NAMES.map((n) => n.name.replace(/\s/g, '\\s')).join('|');
const BOOK_OF = new RegExp(`\\b(?:book of|gospel of|epistle to the|letter to the|epistle of|letter of|turn (?:with me )?to|turn over to|over (?:to|in)|back (?:to|in)|open (?:up )?to|go to)\\s+(?:the\\s+)?(${NAME_PATTERN})\\b(?!\\s*\\d)`);
const IN_BOOK = new RegExp(`\\b(?:in|from|says in|said in|writes in|wrote in)\\s+(${NAME_PATTERN})\\b(?!\\s*\\d)`);
const BOOK_SAYS = new RegExp(`\\b(${NAME_PATTERN})\\s+(?:says|said|tells us|reminds us|puts it|declares)\\b`);
const WRITER_SAYS = /\b(?:says|said|writes|wrote|tells us|told us|puts it|reminds us|declares|declared|prayed|taught|put it this way)\b/;

export interface ScriptureHint {
  /** Books the next verse is likely in, most likely first */
  books: string[];
  /** What was heard, to show the operator */
  heard: string;
}

/** The hint in a sentence, if there is one. A full reference ("Romans 8:28") is not a hint: it is shown as it is. */
export function scriptureHint(text: string): ScriptureHint | null {
  const said = normalizeTranscript(text).toLowerCase();
  if (!said) return null;
  const bookOf = (name: string) => NAMES.find((n) => n.name === name.replace(/\s+/g, ' '))?.book;

  // A book named with a phrase that only means the book: always a hint
  const strong = BOOK_OF.exec(said);
  if (strong) {
    const book = bookOf(strong[1]);
    if (book) return { books: [book], heard: strong[0] };
  }
  // "in Isaiah", "Proverbs says": only for names that can't be anything else
  for (const pattern of [IN_BOOK, BOOK_SAYS]) {
    const m = pattern.exec(said);
    const book = m && bookOf(m[1]);
    if (m && book && !AMBIGUOUS.has(book)) return { books: [book], heard: m[0] };
  }
  // A writer saying something: "Paul says", "as David wrote", "Paul says the same thing in Romans"
  if (WRITER_SAYS.test(said)) {
    for (const [who, books] of WRITERS) {
      const m = who.exec(said);
      if (!m) continue;
      const named = books.find((b) => spoken(b).some((name) => new RegExp(`\\b${name.replace(/\s/g, '\\s')}\\b(?!\\s*\\d)`).test(said.slice(m.index + m[0].length))));
      return named ? { books: [named], heard: said.slice(m.index) } : { books, heard: m[0] };
    }
  }
  return null;
}
