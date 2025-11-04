import bibleData from '@/data/bible.json';
import { BibleVerse, BibleContext } from '@/types/bible';

export class BibleParser {
  private static context: BibleContext | null = null;

  static parseReference(text: string): BibleVerse | null {
    // Pattern 1: Full reference (e.g., "John chapter 3 verse 16", "John 3:16")
    const fullPattern = /(\w+)\s*(?:chapter\s*)?(\d+)[:\s]+(?:verse\s*)?(\d+)/i;
    const fullMatch = text.match(fullPattern);

    if (fullMatch) {
      const [, book, chapter, verse] = fullMatch;
      this.context = { book: this.normalizeBook(book), chapter: parseInt(chapter) };
      return this.getVerse(this.context.book, parseInt(chapter), parseInt(verse));
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

  static getVerse(book: string, chapter: number, verse: number): BibleVerse | null {
    const normalizedBook = this.normalizeBook(book);
    const bibleDataTyped = bibleData as Record<string, Record<string, Record<string, string>>>;
    
    const bookData = bibleDataTyped[normalizedBook];
    if (!bookData) return null;

    const chapterData = bookData[chapter.toString()];
    if (!chapterData) return null;

    const verseText = chapterData[verse.toString()];
    if (!verseText) return null;

    return {
      book: normalizedBook,
      chapter,
      verse,
      text: verseText,
    };
  }

  static normalizeBook(book: string): string {
    const bookMap: Record<string, string> = {
      'john': 'John',
      'psalm': 'Psalm',
      'psalms': 'Psalm',
      'romans': 'Romans',
      'philippians': 'Philippians',
      'proverbs': 'Proverbs',
    };
    return bookMap[book.toLowerCase()] || book;
  }

  static getCurrentContext(): BibleContext | null {
    return this.context;
  }

  static setContext(context: BibleContext | null): void {
    this.context = context;
  }
}
