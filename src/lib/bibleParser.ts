import kjvData from '@/data/kjv-complete.json';
import { BibleVerse, BibleContext } from '@/types/bible';

interface BibleBook {
  abbrev: string;
  name: string;
  chapters: string[][];
}

const bibleBooks = kjvData as BibleBook[];

export class BibleParser {
  private static context: BibleContext | null = null;

  static parseReference(text: string): BibleVerse | null {
    // Pattern 1: Full reference (e.g., "John chapter 3 verse 16", "John 3:16")
    const fullPattern = /(\w+(?:\s+\w+)?)\s*(?:chapter\s*)?(\d+)[:\s]+(?:verse\s*)?(\d+)/i;
    const fullMatch = text.match(fullPattern);

    if (fullMatch) {
      const [, book, chapter, verse] = fullMatch;
      const normalizedBook = this.normalizeBook(book.trim());
      this.context = { book: normalizedBook, chapter: parseInt(chapter) };
      return this.getVerse(normalizedBook, parseInt(chapter), parseInt(verse));
    }

    // Pattern 2: Verse only (e.g., "verse 17", "17")
    if (this.context) {
      const versePattern = /(?:verse\s*)?(\d+)/i;
      const verseMatch = text.match(versePattern);
      
      if (verseMatch) {
        const verse = parseInt(verseMatch[1]);
        return this.getVerse(this.context.book, this.context.chapter, verse);
      }
    }

    return null;
  }

  static getVerse(bookName: string, chapterNum: number, verseNum: number): BibleVerse | null {
    const book = bibleBooks.find(b => 
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
      'psalm': 'Psalm',
      'psalms': 'Psalm',
      'ps': 'Psalm',
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
    
    // Try to find book by partial match
    const found = bibleBooks.find(b => 
      b.name.toLowerCase().startsWith(book.toLowerCase())
    );
    
    return found ? found.name : book;
  }

  static getCurrentContext(): BibleContext | null {
    return this.context;
  }

  static setContext(context: BibleContext | null): void {
    this.context = context;
  }

  static getAllBooks(): string[] {
    return bibleBooks.map(b => b.name);
  }

  static getBookChapterCount(bookName: string): number {
    const book = bibleBooks.find(b => b.name.toLowerCase() === bookName.toLowerCase());
    return book ? book.chapters.length : 0;
  }
}
