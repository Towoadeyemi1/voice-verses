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
  raw: string;           // Original matched text
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Extract all verse references from text
 */
export function extractReferences(text: string): ExtractedReference[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const normalized = normalizeTranscript(text);
  const references: ExtractedReference[] = [];
  
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
    
    if (book) {
      references.push({
        book,
        chapter: parseInt(match[2], 10),
        startVerse: parseInt(match[3], 10),
        endVerse: match[4] ? parseInt(match[4], 10) : undefined,
        raw: match[0],
        confidence: 'high',
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
    
    if (book) {
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
        });
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
    
    if (book) {
      // Avoid duplicates
      const isDuplicate = references.some(
        r => r.book === book && r.chapter === parseInt(match[2], 10)
      );
      
      if (!isDuplicate) {
        references.push({
          book,
          chapter: parseInt(match[2], 10),
          startVerse: 1,  // Default to verse 1 for chapter references
          raw: match[0],
          confidence: 'low',
        });
      }
    }
  }
  
  return references;
}

/**
 * Extract the most likely single reference from text
 * Prefers high confidence matches
 */
export function extractBestReference(text: string): ExtractedReference | null {
  const references = extractReferences(text);
  
  if (references.length === 0) {
    return null;
  }
  
  // Sort by confidence (high > medium > low) and return first
  const sorted = references.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });
  
  return sorted[0];
}

/**
 * Check if a reference is the "next verse" command
 */
export function isNextVerseCommand(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return /\b(next|next verse|next one|continue|go on)\b/i.test(normalized);
}

/**
 * Check if a reference is the "previous verse" command
 */
export function isPreviousVerseCommand(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return /\b(previous|prev|back|go back|last verse)\b/i.test(normalized);
}
