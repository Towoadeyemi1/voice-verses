/**
 * Transcript Normalization Module
 * 
 * Handles conversion of spoken text to formats suitable for verse detection:
 * - Ordinals: "first", "second", "third" → "1", "2", "3"
 * - Roman numerals: "i", "ii", "iii" → "1", "2", "3" (in book name context)
 * - Spoken numbers: "sixteen", "twenty eight" → "16", "28"
 * - Filler words and punctuation removal
 */

// Ordinal word to number mapping
const ORDINALS: Record<string, string> = {
  'first': '1',
  'second': '2',
  'third': '3',
  'fourth': '4',
  'fifth': '5',
  'sixth': '6',
  'seventh': '7',
  'eighth': '8',
  'ninth': '9',
  'tenth': '10',
};

// Spoken number to digit mapping
const SPOKEN_NUMBERS: Record<string, number> = {
  'zero': 0,
  'one': 1,
  'two': 2,
  'three': 3,
  'four': 4,
  'five': 5,
  'six': 6,
  'seven': 7,
  'eight': 8,
  'nine': 9,
  'ten': 10,
  'eleven': 11,
  'twelve': 12,
  'thirteen': 13,
  'fourteen': 14,
  'fifteen': 15,
  'sixteen': 16,
  'seventeen': 17,
  'eighteen': 18,
  'nineteen': 19,
  'twenty': 20,
  'thirty': 30,
  'forty': 40,
  'fifty': 50,
  'sixty': 60,
  'seventy': 70,
  'eighty': 80,
  'ninety': 90,
  'hundred': 100,
};

// Filler words to remove
const FILLER_WORDS = [
  'um', 'uh', 'er', 'ah', 'like', 'you know', 'basically',
  'actually', 'literally', 'so', 'well', 'right', 'okay',
  'please', 'let\'s', 'lets', 'let us', 'turn to', 'go to',
  'read from', 'look at', 'open up', 'open to',
];

// Book name context words that signal a book reference is coming
const BOOK_CONTEXT_WORDS = [
  'book of', 'from', 'in', 'to', 'chapter', 'verse', 'reading',
];

/**
 * Convert spoken numbers like "twenty eight" to "28"
 */
function convertSpokenNumber(text: string): string {
  let result = text.toLowerCase();
  
  // Handle compound numbers like "twenty eight"
  for (const [tens, tensValue] of Object.entries(SPOKEN_NUMBERS)) {
    if (tensValue >= 20 && tensValue <= 90 && tensValue % 10 === 0) {
      for (const [ones, onesValue] of Object.entries(SPOKEN_NUMBERS)) {
        if (onesValue >= 1 && onesValue <= 9) {
          const pattern = new RegExp(`\\b${tens}[\\s-]?${ones}\\b`, 'gi');
          result = result.replace(pattern, String(tensValue + onesValue));
        }
      }
    }
  }
  
  // Handle single numbers
  for (const [word, value] of Object.entries(SPOKEN_NUMBERS)) {
    const pattern = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(pattern, String(value));
  }
  
  return result;
}

/**
 * Convert ordinals to numbers at the start of book names
 * e.g., "first john" → "1 john", "second timothy" → "2 timothy"
 */
function convertOrdinalBookNames(text: string): string {
  let result = text.toLowerCase();
  
  // List of books that can have ordinal prefixes
  const numberedBooks = [
    'john', 'peter', 'timothy', 'thessalonians', 'corinthians',
    'samuel', 'kings', 'chronicles',
  ];
  
  for (const book of numberedBooks) {
    for (const [ordinal, num] of Object.entries(ORDINALS)) {
      const pattern = new RegExp(`\\b${ordinal}\\s+${book}\\b`, 'gi');
      result = result.replace(pattern, `${num} ${book}`);
    }
  }
  
  return result;
}

/**
 * Convert Roman numerals in book name context
 * e.g., "i john" → "1 john", "ii corinthians" → "2 corinthians"
 */
function convertRomanNumeralBooks(text: string): string {
  let result = text.toLowerCase();
  
  const romanMap: Record<string, string> = {
    'i': '1',
    'ii': '2',
    'iii': '3',
  };
  
  const numberedBooks = [
    'john', 'peter', 'timothy', 'thessalonians', 'corinthians',
    'samuel', 'kings', 'chronicles',
  ];
  
  for (const book of numberedBooks) {
    for (const [roman, num] of Object.entries(romanMap)) {
      // Match "i john" or "ii john" etc.
      const pattern = new RegExp(`\\b${roman}\\s+${book}\\b`, 'gi');
      result = result.replace(pattern, `${num} ${book}`);
    }
  }
  
  return result;
}

/**
 * Remove filler words and clean up punctuation
 */
function removeFillersAndPunctuation(text: string): string {
  let result = text.toLowerCase();
  
  // Remove filler words
  for (const filler of FILLER_WORDS) {
    const pattern = new RegExp(`\\b${filler}\\b`, 'gi');
    result = result.replace(pattern, ' ');
  }
  
  // Replace common punctuation with spaces (except colons which are significant)
  result = result.replace(/[.,!?;'"()[\]{}]/g, ' ');
  
  // Normalize whitespace
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

/**
 * Normalize "verse X" or "verses X through Y" patterns
 */
function normalizeVersePatterns(text: string): string {
  let result = text;
  
  // "verse sixteen" → "verse 16"
  result = convertSpokenNumber(result);
  
  // "chapter three verse sixteen" → "chapter 3:16" 
  result = result.replace(
    /chapter\s+(\d+)\s+verse\s+(\d+)/gi,
    '$1:$2'
  );
  
  // "chapter three" → "3" (when followed by numbers or at end)
  result = result.replace(
    /chapter\s+(\d+)/gi,
    '$1'
  );
  
  // "verse sixteen" → ":16" (for context-based parsing)
  result = result.replace(
    /verse\s+(\d+)/gi,
    ':$1'
  );
  
  return result;
}

/**
 * Main normalization function - applies all transformations
 */
export function normalizeTranscript(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let result = text;
  
  // Step 1: Remove filler words and clean punctuation
  result = removeFillersAndPunctuation(result);
  
  // Step 2: Convert ordinal book names (first john → 1 john)
  result = convertOrdinalBookNames(result);
  
  // Step 3: Convert Roman numeral book names (i john → 1 john)
  result = convertRomanNumeralBooks(result);
  
  // Step 4: Convert spoken numbers (sixteen → 16)
  result = convertSpokenNumber(result);
  
  // Step 5: Normalize verse/chapter patterns
  result = normalizeVersePatterns(result);
  
  // Final cleanup
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

/**
 * Check if text looks like it might contain a verse reference
 * Used for quick filtering before more expensive parsing
 */
export function mightContainVerseReference(text: string): boolean {
  const normalized = text.toLowerCase();
  
  // Check for common patterns
  const patterns = [
    /\d+:\d+/,                    // 3:16
    /\d+\s+\d+/,                  // 3 16
    /chapter|verse|psalm/i,       // chapter, verse, psalm
    /john|matthew|genesis|romans|corinthians|peter|timothy|james|luke|mark|acts|revelation/i,
  ];
  
  return patterns.some(p => p.test(normalized));
}
