import { BibleVerse, BibleContext } from '@/types/bible';
import { BibleVersionType } from '@/types/bibleVersion';
import { convertBibleSuperSearchToStandard } from './bibleConverter';
import { apiBibleFor, isApiBibleVersion, onlineChapter, reportScriptureShown } from './onlineBibles';

interface BibleBook {
  abbrev: string;
  name: string;
  chapters: string[][];
}

type OfflineVersion = 'kjv' | 'asv' | 'web';

// Each translation is ~5 MB, so load only the one in use, on first need
const loaders: Record<OfflineVersion, () => Promise<BibleBook[]>> = {
  kjv: async () => (await import('@/data/kjv-complete.json')).default as BibleBook[],
  asv: async () => convertBibleSuperSearchToStandard((await import('@/data/asv-complete.json')).default as any),
  web: async () => convertBibleSuperSearchToStandard((await import('@/data/web-complete.json')).default as any),
};

const loadedBibles = new Map<OfflineVersion, Promise<BibleBook[]>>();

const loadOfflineBible = (version: OfflineVersion): Promise<BibleBook[]> => {
  let bible = loadedBibles.get(version);
  if (!bible) {
    bible = loaders[version]();
    // Allow a retry if the chunk failed to download
    bible.catch(() => loadedBibles.delete(version));
    loadedBibles.set(version, bible);
  }
  return bible;
};

let currentVersion: BibleVersionType = 'kjv';
let customBibleData: BibleBook[] | null = null;

const getBibleData = async (version: BibleVersionType = currentVersion): Promise<BibleBook[]> => {
  if (version === 'custom' && customBibleData) {
    return customBibleData;
  }

  switch (version) {
    case 'asv':
    case 'web':
      return loadOfflineBible(version);
    default:
      // KJV, and the offline fallback for API-based versions
      return loadOfflineBible('kjv');
  }
};

export class BibleParser {
  private static context: BibleContext | null = null;

  static async parseReference(text: string): Promise<BibleVerse | null> {
    // Clean up the input
    const cleanText = text.trim();
    
    // Pattern 1: Full reference with various formats
    // Matches: "John 3:16", "john3:16", "John 3 16", "john3,16", "1 John 3:16", "1john3:16"
    const fullPattern = /^(\d?\s*\w+(?:\s+\w+)?)\s*[:\s,]+(\d+)\s*[:\s,]+(\d+)$/i;
    const fullMatch = cleanText.match(fullPattern);

    if (fullMatch) {
      const [, book, chapter, verse] = fullMatch;
      const normalizedBook = this.normalizeBook(book.trim());
      this.context = { book: normalizedBook, chapter: parseInt(chapter) };
      return await this.getVerse(normalizedBook, parseInt(chapter), parseInt(verse));
    }

    // Pattern 2: Compact format without separators (e.g., "john316", "psalm231")
    const compactPattern = /^(\d?\s*\w+)(\d{1,3})(\d{1,3})$/i;
    const compactMatch = cleanText.match(compactPattern);
    
    if (compactMatch) {
      const [, book, chapter, verse] = compactMatch;
      const normalizedBook = this.normalizeBook(book.trim());
      // Try to parse - if chapter is too large, it might be invalid
      const chapterNum = parseInt(chapter);
      const verseNum = parseInt(verse);
      
      if (chapterNum > 0 && chapterNum <= 150 && verseNum > 0) {
        this.context = { book: normalizedBook, chapter: chapterNum };
        return await this.getVerse(normalizedBook, chapterNum, verseNum);
      }
    }

    // Pattern 3: Chapter only format (e.g., "john 3" - sets context but doesn't return verse)
    const chapterOnlyPattern = /^(\d?\s*\w+(?:\s+\w+)?)\s+(\d+)$/i;
    const chapterMatch = cleanText.match(chapterOnlyPattern);
    
    if (chapterMatch) {
      const [, book, chapter] = chapterMatch;
      const normalizedBook = this.normalizeBook(book.trim());
      this.context = { book: normalizedBook, chapter: parseInt(chapter) };
      // Return first verse of chapter
      return await this.getVerse(normalizedBook, parseInt(chapter), 1);
    }

    // Pattern 4: Verse only (e.g., "verse 17", "17") - uses context
    if (this.context) {
      const versePattern = /^(?:verse\s*)?(\d+)$/i;
      const verseMatch = cleanText.match(versePattern);
      
      if (verseMatch) {
        const verse = parseInt(verseMatch[1]);
        return await this.getVerse(this.context.book, this.context.chapter, verse);
      }
    }

    return null;
  }

  static async getVerse(bookName: string, chapterNum: number, verseNum: number): Promise<BibleVerse | null> {
    // Translations read from the internet (ESV, NLT, API.Bible: NKJV and others)
    if (BibleParser.isOnline(currentVersion)) {
      return this.getOnlineVerse(bookName, chapterNum, verseNum);
    }

    // Handle offline versions
    const books = await getBibleData();
    const book = books.find(b => 
      b.name.toLowerCase() === bookName.toLowerCase() || 
      b.abbrev.toLowerCase() === bookName.toLowerCase()
    );
    
    if (!book) {
      console.warn(`Book not found: ${bookName}`);
      return null;
    }

    const chapter = book.chapters[chapterNum - 1]; // Chapters are 0-indexed in array
    if (!chapter) {
      console.warn(`Chapter ${chapterNum} not found in ${book.name}`);
      return null;
    }

    const verseText = chapter[verseNum - 1]; // Verses are 0-indexed in array
    if (!verseText) {
      console.warn(`Verse ${verseNum} not found in ${book.name} ${chapterNum}`);
      return null;
    }

    return {
      book: book.name,
      chapter: chapterNum,
      verse: verseNum,
      text: verseText,
    };
  }

  /** ESV, NLT and API.Bible translations are read from the internet. */
  static isOnline(version: string = currentVersion): boolean {
    return version === 'esv' || version === 'nlt' || isApiBibleVersion(version);
  }

  /** The book's place among the 66 (0-based) and its usual name, from the KJV's list. */
  private static async bookIndex(bookName: string): Promise<{ index: number; name: string } | null> {
    const books = await loadOfflineBible('kjv');
    const index = books.findIndex((b) => b.name.toLowerCase() === bookName.toLowerCase() || b.abbrev.toLowerCase() === bookName.toLowerCase());
    return index < 0 ? null : { index, name: books[index].name };
  }

  private static async getOnlineVerse(bookName: string, chapterNum: number, verseNum: number): Promise<BibleVerse | null> {
    const book = await this.bookIndex(bookName);
    if (!book) return null;
    try {
      const chapter = await onlineChapter(currentVersion, book.name, book.index, chapterNum);
      const text = chapter.verses.get(verseNum);
      if (text) return { book: book.name, chapter: chapterNum, verse: verseNum, text };
      // Verse numbering differs between translations (or it is not in this one)
      if (chapter.verses.size) return null;
      return this.fallbackToOffline(book.name, chapterNum, verseNum, `${this.getVersionLabel()} has no text for this chapter`);
    } catch (error) {
      return this.fallbackToOffline(book.name, chapterNum, verseNum, error instanceof Error ? error.message : 'Network error');
    }
  }

  /** A verse went on screen (licensed online text is reported to its publisher's fair-use tracking). */
  static async reportShown(verse: { book: string; chapter: number }): Promise<void> {
    if (!isApiBibleVersion(currentVersion)) return;
    const book = await this.bookIndex(verse.book);
    if (book) reportScriptureShown(currentVersion, book.index, verse.chapter);
  }

  /** The translation's short name for screens: KJV, NKJV, NLT… */
  static getVersionLabel(version: string = this.getVersion()): string {
    if (isApiBibleVersion(version)) return apiBibleFor(version)?.abbreviation ?? 'Bible';
    if (version === 'custom') return 'Custom';
    return version.toUpperCase();
  }

  private static async fallbackToOffline(bookName: string, chapterNum: number, verseNum: number, reason: string): Promise<BibleVerse | null> {
    console.warn(`Falling back to KJV: ${reason}`);
    
    const books = await getBibleData('kjv');
    const book = books.find(b => 
      b.name.toLowerCase() === bookName.toLowerCase() || 
      b.abbrev.toLowerCase() === bookName.toLowerCase()
    );
    
    if (!book) {
      console.error(`Book not found in KJV: ${bookName}`);
      return null;
    }

    const chapter = book.chapters[chapterNum - 1];
    if (!chapter) {
      console.error(`Chapter ${chapterNum} not found in ${book.name}`);
      return null;
    }

    const verseText = chapter[verseNum - 1];
    if (!verseText) {
      console.error(`Verse ${verseNum} not found in ${book.name} ${chapterNum}`);
      return null;
    }

    // Show a notification about the fallback
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('bible-api-fallback', { 
        detail: { reason, verse: `${bookName} ${chapterNum}:${verseNum}` } 
      });
      window.dispatchEvent(event);
    }

    return {
      book: book.name,
      chapter: chapterNum,
      verse: verseNum,
      text: verseText,
    };
  }

  static normalizeBook(book: string): string {
    const bookMap: Record<string, string> = {
      'genesis': 'Genesis',
      'gen': 'Genesis',
      'gn': 'Genesis',
      'exodus': 'Exodus',
      'ex': 'Exodus',
      'leviticus': 'Leviticus',
      'lev': 'Leviticus',
      'numbers': 'Numbers',
      'num': 'Numbers',
      'deuteronomy': 'Deuteronomy',
      'deut': 'Deuteronomy',
      'joshua': 'Joshua',
      'josh': 'Joshua',
      'judges': 'Judges',
      'judg': 'Judges',
      'ruth': 'Ruth',
      '1 samuel': '1 Samuel',
      '1samuel': '1 Samuel',
      '1sam': '1 Samuel',
      '2 samuel': '2 Samuel',
      '2samuel': '2 Samuel',
      '2sam': '2 Samuel',
      '1 kings': '1 Kings',
      '1kings': '1 Kings',
      '2 kings': '2 Kings',
      '2kings': '2 Kings',
      '1 chronicles': '1 Chronicles',
      '1chronicles': '1 Chronicles',
      '1chron': '1 Chronicles',
      '2 chronicles': '2 Chronicles',
      '2chronicles': '2 Chronicles',
      '2chron': '2 Chronicles',
      'ezra': 'Ezra',
      'nehemiah': 'Nehemiah',
      'neh': 'Nehemiah',
      'esther': 'Esther',
      'est': 'Esther',
      'job': 'Job',
      'psalm': 'Psalms',
      'psalms': 'Psalms',
      'ps': 'Psalms',
      'proverbs': 'Proverbs',
      'prov': 'Proverbs',
      'ecclesiastes': 'Ecclesiastes',
      'eccl': 'Ecclesiastes',
      'song of solomon': 'Song of Solomon',
      'song': 'Song of Solomon',
      'isaiah': 'Isaiah',
      'isa': 'Isaiah',
      'jeremiah': 'Jeremiah',
      'jer': 'Jeremiah',
      'lamentations': 'Lamentations',
      'lam': 'Lamentations',
      'ezekiel': 'Ezekiel',
      'ezek': 'Ezekiel',
      'daniel': 'Daniel',
      'dan': 'Daniel',
      'hosea': 'Hosea',
      'hos': 'Hosea',
      'joel': 'Joel',
      'amos': 'Amos',
      'obadiah': 'Obadiah',
      'obad': 'Obadiah',
      'jonah': 'Jonah',
      'micah': 'Micah',
      'mic': 'Micah',
      'nahum': 'Nahum',
      'habakkuk': 'Habakkuk',
      'hab': 'Habakkuk',
      'zephaniah': 'Zephaniah',
      'zeph': 'Zephaniah',
      'haggai': 'Haggai',
      'hag': 'Haggai',
      'zechariah': 'Zechariah',
      'zech': 'Zechariah',
      'malachi': 'Malachi',
      'mal': 'Malachi',
      'matthew': 'Matthew',
      'matt': 'Matthew',
      'mt': 'Matthew',
      'mark': 'Mark',
      'mk': 'Mark',
      'luke': 'Luke',
      'lk': 'Luke',
      'john': 'John',
      'jn': 'John',
      'acts': 'Acts',
      'romans': 'Romans',
      'rom': 'Romans',
      '1 corinthians': '1 Corinthians',
      '1corinthians': '1 Corinthians',
      '1cor': '1 Corinthians',
      '2 corinthians': '2 Corinthians',
      '2corinthians': '2 Corinthians',
      '2cor': '2 Corinthians',
      'galatians': 'Galatians',
      'gal': 'Galatians',
      'ephesians': 'Ephesians',
      'eph': 'Ephesians',
      'philippians': 'Philippians',
      'phil': 'Philippians',
      'colossians': 'Colossians',
      'col': 'Colossians',
      '1 thessalonians': '1 Thessalonians',
      '1thessalonians': '1 Thessalonians',
      '1thess': '1 Thessalonians',
      '2 thessalonians': '2 Thessalonians',
      '2thessalonians': '2 Thessalonians',
      '2thess': '2 Thessalonians',
      '1 timothy': '1 Timothy',
      '1timothy': '1 Timothy',
      '1tim': '1 Timothy',
      '2 timothy': '2 Timothy',
      '2timothy': '2 Timothy',
      '2tim': '2 Timothy',
      'titus': 'Titus',
      'philemon': 'Philemon',
      'hebrews': 'Hebrews',
      'heb': 'Hebrews',
      'james': 'James',
      'jas': 'James',
      '1 peter': '1 Peter',
      '1peter': '1 Peter',
      '1pet': '1 Peter',
      '2 peter': '2 Peter',
      '2peter': '2 Peter',
      '2pet': '2 Peter',
      '1 john': '1 John',
      '1john': '1 John',
      '2 john': '2 John',
      '2john': '2 John',
      '3 john': '3 John',
      '3john': '3 John',
      'jude': 'Jude',
      'revelation': 'Revelation',
      'rev': 'Revelation',
    };
    
    const normalized = bookMap[book.toLowerCase()];
    if (normalized) return normalized;
    
    // Try to find book by partial match against canonical names (in canon order)
    const found = Object.values(bookMap).find(name =>
      name.toLowerCase().startsWith(book.toLowerCase())
    );
    
    return found ?? book;
  }

  static getCurrentContext(): BibleContext | null {
    return this.context;
  }

  static setContext(context: BibleContext | null): void {
    this.context = context;
  }

  static async getAllBooks(): Promise<string[]> {
    const books = await getBibleData();
    return books.map(b => b.name);
  }

  /** How many verses a chapter has (from the KJV, which every translation here follows). */
  static async getChapterLength(bookName: string, chapterNum: number): Promise<number> {
    const books = await loadOfflineBible('kjv');
    const book = books.find((b) => b.name.toLowerCase() === bookName.toLowerCase());
    return book?.chapters[chapterNum - 1]?.length ?? 0;
  }

  static async getBookChapterCount(bookName: string): Promise<number> {
    const books = await getBibleData();
    const book = books.find(b => b.name.toLowerCase() === bookName.toLowerCase());
    return book ? book.chapters.length : 0;
  }

  static setVersion(version: BibleVersionType): void {
    currentVersion = version;
    localStorage.setItem('cornerstone-bible-version', version);
    this.preload();
  }

  /** Start downloading the selected translation so the first lookup is instant. */
  static preload(): void {
    getBibleData().catch(error => console.error('Failed to load Bible data:', error));
  }

  /** A free translation's full text (KJV, ASV or WEB), for searching by its words. */
  static async getOfflineBooks(version: OfflineVersion): Promise<BibleBook[]> {
    return loadOfflineBible(version);
  }

  static getVersion(): BibleVersionType {
    const saved = localStorage.getItem('cornerstone-bible-version');
    currentVersion = (saved as BibleVersionType) || 'kjv';
    return currentVersion;
  }

  static setCustomBible(data: BibleBook[]): void {
    customBibleData = data;
    localStorage.setItem('cornerstone-custom-bible', JSON.stringify(data));
  }

  static loadCustomBible(): void {
    const saved = localStorage.getItem('cornerstone-custom-bible');
    if (saved) {
      customBibleData = JSON.parse(saved);
    }
  }

  static initializeVersion(): void {
    this.getVersion();
    this.loadCustomBible();
    this.loadApiKeys();
    this.preload();
  }

  static setApiKey(version: 'esv' | 'nlt', apiKey: string): void {
    localStorage.setItem(version === 'esv' ? 'cornerstone-esv-api-key' : 'cornerstone-nlt-api-key', apiKey);
  }

  static getApiKey(version: 'esv' | 'nlt'): string | null {
    return localStorage.getItem(version === 'esv' ? 'cornerstone-esv-api-key' : 'cornerstone-nlt-api-key');
  }

  /** Keys are read from storage when needed (kept for callers from before). */
  static loadApiKeys(): void {}

  // Get multiple verses from a range or full chapter
  static async getVerses(bookName: string, chapterNum: number, startVerse?: number, endVerse?: number): Promise<BibleVerse[]> {
    const books = await getBibleData();
    const book = books.find(b => 
      b.name.toLowerCase() === bookName.toLowerCase() || 
      b.abbrev.toLowerCase() === bookName.toLowerCase()
    );
    
    if (!book) {
      console.warn(`Book not found: ${bookName}`);
      return [];
    }

    const chapter = book.chapters[chapterNum - 1];
    if (!chapter) {
      console.warn(`Chapter ${chapterNum} not found in ${book.name}`);
      return [];
    }

    const verses: BibleVerse[] = [];
    const start = startVerse || 1;
    const end = endVerse || chapter.length;

    for (let verseNum = start; verseNum <= end; verseNum++) {
      const verseText = chapter[verseNum - 1];
      if (verseText) {
        verses.push({
          book: book.name,
          chapter: chapterNum,
          verse: verseNum,
          text: verseText,
        });
      }
    }

    return verses;
  }

  // Parse scripture range (e.g., "John 3:1-16" or "John 3")
  static async parseReferenceRange(text: string): Promise<BibleVerse[]> {
    const cleanText = text.trim();
    
    // Pattern for range: "John 3:1-16"
    const rangePattern = /^(\d?\s*\w+(?:\s+\w+)?)\s*[:\s,]+(\d+)\s*[:\s,]+(\d+)\s*-\s*(\d+)$/i;
    const rangeMatch = cleanText.match(rangePattern);
    
    if (rangeMatch) {
      const [, book, chapter, startVerse, endVerse] = rangeMatch;
      const normalizedBook = this.normalizeBook(book.trim());
      this.context = { book: normalizedBook, chapter: parseInt(chapter) };
      return await this.getVerses(normalizedBook, parseInt(chapter), parseInt(startVerse), parseInt(endVerse));
    }

    // Pattern for full chapter: "John 3"
    const chapterPattern = /^(\d?\s*\w+(?:\s+\w+)?)\s+(\d+)$/i;
    const chapterMatch = cleanText.match(chapterPattern);
    
    if (chapterMatch) {
      const [, book, chapter] = chapterMatch;
      const normalizedBook = this.normalizeBook(book.trim());
      this.context = { book: normalizedBook, chapter: parseInt(chapter) };
      return await this.getVerses(normalizedBook, parseInt(chapter));
    }

    // Single verse - return as array
    const verse = await this.parseReference(text);
    return verse ? [verse] : [];
  }

  static async exportCurrentVersion(): Promise<{ version: BibleVersionType; data: BibleBook[] } | null> {
    if (currentVersion === 'esv' || currentVersion === 'nlt') {
      console.error('Cannot export API-based versions');
      return null;
    }

    if (currentVersion === 'custom' && customBibleData) {
      return {
        version: 'custom',
        data: customBibleData,
      };
    }

    return {
      version: currentVersion,
      data: await getBibleData(),
    };
  }
}
