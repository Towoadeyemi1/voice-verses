/**
 * Reference Extraction Module
 * 
 * Extracts Bible verse references from normalized transcript text.
 * Works with the output of transcriptNormalization.ts
 */

import { normalizeTranscript } from './transcriptNormalization';

// Book name aliases - maps various forms to canonical names
export const BOOK_ALIASES: Record<string, string> = {
  // Old Testament
  'genesis': 'Genesis',
  'gen': 'Genesis',
  'gn': 'Genesis',
  'exodus': 'Exodus',
  'ex': 'Exodus',
  'exod': 'Exodus',
  'leviticus': 'Leviticus',
  'lev': 'Leviticus',
  'numbers': 'Numbers',
  'num': 'Numbers',
  'deuteronomy': 'Deuteronomy',
  'deut': 'Deuteronomy',
  'dt': 'Deuteronomy',
  'joshua': 'Joshua',
  'josh': 'Joshua',
  'judges': 'Judges',
  'judg': 'Judges',
  'ruth': 'Ruth',
  
  // Samuel/Kings/Chronicles
  '1 samuel': '1 Samuel',
  '1samuel': '1 Samuel',
  '1sam': '1 Samuel',
  '2 samuel': '2 Samuel',
  '2samuel': '2 Samuel',
  '2sam': '2 Samuel',
  '1 kings': '1 Kings',
  '1kings': '1 Kings',
  '1kgs': '1 Kings',
  '2 kings': '2 Kings',
  '2kings': '2 Kings',
  '2kgs': '2 Kings',
  '1 chronicles': '1 Chronicles',
  '1chronicles': '1 Chronicles',
  '1chron': '1 Chronicles',
  '2 chronicles': '2 Chronicles',
  '2chronicles': '2 Chronicles',
  '2chron': '2 Chronicles',
  
  // Poetry/Wisdom
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
  'pro': 'Proverbs',
  'ecclesiastes': 'Ecclesiastes',
  'eccl': 'Ecclesiastes',
  'ecc': 'Ecclesiastes',
  'song of solomon': 'Song of Solomon',
  'song of songs': 'Song of Solomon',
  'song': 'Song of Solomon',
  'sos': 'Song of Solomon',
  
  // Major Prophets
  'isaiah': 'Isaiah',
  'isa': 'Isaiah',
  'jeremiah': 'Jeremiah',
  'jer': 'Jeremiah',
  'lamentations': 'Lamentations',
  'lam': 'Lamentations',
  'ezekiel': 'Ezekiel',
  'ezek': 'Ezekiel',
  'eze': 'Ezekiel',
  'daniel': 'Daniel',
  'dan': 'Daniel',
  
  // Minor Prophets
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
  'nah': 'Nahum',
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
  
  // New Testament - Gospels & Acts
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
  
  // Pauline Epistles
  'romans': 'Romans',
  'rom': 'Romans',
  'ro': 'Romans',
  '1 corinthians': '1 Corinthians',
  '1corinthians': '1 Corinthians',
  '1cor': '1 Corinthians',
  '1co': '1 Corinthians',
  '2 corinthians': '2 Corinthians',
  '2corinthians': '2 Corinthians',
  '2cor': '2 Corinthians',
  '2co': '2 Corinthians',
  'galatians': 'Galatians',
  'gal': 'Galatians',
  'ephesians': 'Ephesians',
  'eph': 'Ephesians',
  'philippians': 'Philippians',
  'phil': 'Philippians',
  'php': 'Philippians',
  'colossians': 'Colossians',
  'col': 'Colossians',
  '1 thessalonians': '1 Thessalonians',
  '1thessalonians': '1 Thessalonians',
  '1thess': '1 Thessalonians',
  '1th': '1 Thessalonians',
  '2 thessalonians': '2 Thessalonians',
  '2thessalonians': '2 Thessalonians',
  '2thess': '2 Thessalonians',
  '2th': '2 Thessalonians',
  '1 timothy': '1 Timothy',
  '1timothy': '1 Timothy',
  '1tim': '1 Timothy',
  '2 timothy': '2 Timothy',
  '2timothy': '2 Timothy',
  '2tim': '2 Timothy',
  'titus': 'Titus',
  'philemon': 'Philemon',
  'phm': 'Philemon',
  
  // General Epistles
  'hebrews': 'Hebrews',
  'heb': 'Hebrews',
  'james': 'James',
  'jas': 'James',
  'jam': 'James',
  '1 peter': '1 Peter',
  '1peter': '1 Peter',
  '1pet': '1 Peter',
  '1pt': '1 Peter',
  '2 peter': '2 Peter',
  '2peter': '2 Peter',
  '2pet': '2 Peter',
  '2pt': '2 Peter',
  '1 john': '1 John',
  '1john': '1 John',
  '1jn': '1 John',
  '2 john': '2 John',
  '2john': '2 John',
  '2jn': '2 John',
  '3 john': '3 John',
  '3john': '3 John',
  '3jn': '3 John',
  'jude': 'Jude',
  'revelation': 'Revelation',
  'rev': 'Revelation',
  'revelations': 'Revelation',
};

// Generate regex pattern from book aliases
const bookNames = Object.keys(BOOK_ALIASES).sort((a, b) => b.length - a.length); // Longest first
const bookPattern = bookNames.join('|').replace(/\s/g, '\\s');

export interface ExtractedReference {
  book: string;          // Canonical book name
  chapter: number;
  startVerse: number;
  endVerse?: number;     // For ranges
  wholeChapter?: boolean; // "John 5": the whole chapter, from verse 1
  fromVerse?: boolean; // "John 5 from verse 8": the verse to start at was said
  raw: string;           // Original matched text
  confidence: 'high' | 'medium' | 'low';
  index?: number;        // Position in the normalized text, for spoken order
}

// Books with a single chapter: "Jude verse 3" / "Obadiah 17" mean chapter 1
const SINGLE_CHAPTER_BOOKS = new Set(['Obadiah', 'Philemon', '2 John', '3 John', 'Jude']);

/**
 * Extract all verse references from text
 */
export function extractReferences(text: string): ExtractedReference[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const normalized = normalizeTranscript(text);
  const references: ExtractedReference[] = [];

  // Pattern 0: single-chapter book + verse, e.g. "obadiah :17", "jude 3"
  const singleChapterPattern = new RegExp(`\\b(${bookPattern})\\s*:?(\\d+)(?:-(\\d+))?\\b(?!\\s*:)`, 'gi');
  let single;
  while ((single = singleChapterPattern.exec(normalized)) !== null) {
    const book = BOOK_ALIASES[single[1].toLowerCase()];
    if (book && SINGLE_CHAPTER_BOOKS.has(book)) {
      references.push({
        book,
        chapter: 1,
        startVerse: parseInt(single[2], 10),
        endVerse: single[3] ? parseInt(single[3], 10) : undefined,
        raw: single[0],
        confidence: 'high',
        index: single.index,
      });
    }
  }
  
  // Pattern 1: Book + Chapter:Verse (or Chapter:Verse-Verse for ranges)
  // e.g., "john 3:16", "1 corinthians 13:4-7"
  const colonPattern = new RegExp(
    `\\b(${bookPattern})\\s*(\\d+):(\\d+)(?:-(\\d+))?\\b`,
    'gi'
  );
  
  let match;
  while ((match = colonPattern.exec(normalized)) !== null) {
    const bookAlias = match[1].toLowerCase();
    const book = BOOK_ALIASES[bookAlias] || BOOK_ALIASES[bookAlias.replace(/\s+/g, ' ')];
    
    if (book && !SINGLE_CHAPTER_BOOKS.has(book)) {
      references.push({
        book,
        chapter: parseInt(match[2], 10),
        startVerse: parseInt(match[3], 10),
        endVerse: match[4] ? parseInt(match[4], 10) : undefined,
        raw: match[0],
        confidence: 'high',
        index: match.index,
      });
    }
  }
  
  // Pattern 2: Book + Chapter Verse (space separated)
  // e.g., "john 3 16"
  const spacePattern = new RegExp(
    `\\b(${bookPattern})\\s+(\\d+)\\s+(\\d+)(?:\\s+(?:to|through|-)\\s+(\\d+))?\\b`,
    'gi'
  );
  
  while ((match = spacePattern.exec(normalized)) !== null) {
    const bookAlias = match[1].toLowerCase();
    const book = BOOK_ALIASES[bookAlias] || BOOK_ALIASES[bookAlias.replace(/\s+/g, ' ')];
    
    if (book && !SINGLE_CHAPTER_BOOKS.has(book)) {
      // Avoid duplicates
      const isDuplicate = references.some(
        r => r.book === book && 
             r.chapter === parseInt(match[2], 10) && 
             r.startVerse === parseInt(match[3], 10)
      );
      
      if (!isDuplicate) {
        references.push({
          book,
          chapter: parseInt(match[2], 10),
          startVerse: parseInt(match[3], 10),
          endVerse: match[4] ? parseInt(match[4], 10) : undefined,
          raw: match[0],
          confidence: 'medium',
          index: match.index,
        });
      }
    }
  }
  
  // Pattern 2b: Book + ConcatenatedNumber (speech engine glued chapter+verse together)
  // e.g., "john 316" → chapter 3, verse 16
  // Handles 3-4 digit numbers where first 1-2 digits are chapter. Two digits
  // ("psalm 23") are far more often a chapter, handled by Pattern 3.
  const concatenatedPattern = new RegExp(
    `\\b(${bookPattern})\\s+(\\d{3,4})\\b(?!\\s*[:\\d])`,
    'gi'
  );
  
  while ((match = concatenatedPattern.exec(normalized)) !== null) {
    const bookAlias = match[1].toLowerCase();
    const book = BOOK_ALIASES[bookAlias] || BOOK_ALIASES[bookAlias.replace(/\s+/g, ' ')];
    
    if (book && !SINGLE_CHAPTER_BOOKS.has(book)) {
      const numStr = match[2];
      let chapter: number | null = null;
      let verse: number | null = null;
      
      // Try to split the number intelligently
      // For 2 digits: 1+1 split (e.g., "11" → chapter 1, verse 1)
      // For 3 digits: try 1+2 first (e.g., "316" → 3:16), fallback to 2+1 (e.g., "121" → 12:1)
      // For 4 digits: try 1+3 (e.g., "1119" → 1:119), 2+2 (e.g., "1234" → 12:34), 3+1 (e.g., "1191" → 119:1)
      
      if (numStr.length === 2) {
        chapter = parseInt(numStr[0], 10);
        verse = parseInt(numStr[1], 10);
      } else if (numStr.length === 3) {
        // Prefer 1+2 split (most common: "316" = 3:16)
        chapter = parseInt(numStr[0], 10);
        verse = parseInt(numStr.slice(1), 10);
      } else if (numStr.length === 4) {
        // Try 2+2 split first (e.g., "1234" = 12:34)
        chapter = parseInt(numStr.slice(0, 2), 10);
        verse = parseInt(numStr.slice(2), 10);
      }
      
      if (chapter && verse && chapter > 0 && verse > 0) {
        // Avoid duplicates
        const isDuplicate = references.some(
          r => r.book === book && r.chapter === chapter && r.startVerse === verse
        );
        
        if (!isDuplicate) {
          references.push({
            book,
            chapter,
            startVerse: verse,
            raw: match[0],
            confidence: 'medium', // Lower confidence since we're guessing the split
            index: match.index,
          });
        }
      }
    }
  }
  
  // Pattern 3: Book + Chapter only (for chapter references like "Psalm 23")
  // e.g., "psalm 23", "john 3"
  const chapterOnlyPattern = new RegExp(
    `\\b(${bookPattern})\\s+(\\d+)\\b(?!\\s*[:\\d])`,
    'gi'
  );
  
  while ((match = chapterOnlyPattern.exec(normalized)) !== null) {
    const bookAlias = match[1].toLowerCase();
    const book = BOOK_ALIASES[bookAlias] || BOOK_ALIASES[bookAlias.replace(/\s+/g, ' ')];
    
    if (book && !SINGLE_CHAPTER_BOOKS.has(book)) {
      // Avoid duplicates
      const isDuplicate = references.some(
        r => r.book === book && r.chapter === parseInt(match[2], 10)
      );
      
      if (!isDuplicate) {
        // "John 5 from verse 8": the chapter from that verse on
        const from = /^\s*,?\s*(?:starting\s+)?(?:from|at)\s+(?:verses?\s+|:\s*)(\d+)\b/i.exec(normalized.slice(match.index + match[0].length));
        references.push({
          book,
          chapter: parseInt(match[2], 10),
          startVerse: from ? parseInt(from[1], 10) : 1,  // Default to verse 1 for chapter references
          wholeChapter: true,
          fromVerse: !!from,
          raw: match[0],
          confidence: 'low',
          index: match.index,
        });
      }
    }
  }
  
  return references;
}

/**
 * Extract the reference to show for a piece of speech: the most recently
 * spoken one, ignoring chapter-only mentions when a full reference is present.
 */
export function extractBestReference(text: string): ExtractedReference | null {
  const references = extractReferences(text);
  if (references.length === 0) {
    return null;
  }

  const specific = references.filter(r => r.confidence !== 'low');
  const candidates = specific.length > 0 ? specific : references;
  return candidates.reduce((latest, r) => ((r.index ?? 0) > (latest.index ?? 0) ? r : latest));
}

/**
 * Check if a reference is the "next verse" command
 */
export function isNextVerseCommand(text: string): boolean {
  // Explicit phrases only: "next" or "continue" alone are common in ordinary speech
  return /\b(next verse|following verse|the verse after)\b/i.test(text);
}

/**
 * Check if a reference is the "previous verse" command
 */
export function isPreviousVerseCommand(text: string): boolean {
  // Explicit phrases only: "back" is common in ordinary speech ("come back to that")
  return /\b(previous verse|verse before|go back a verse)\b/i.test(text);
}
