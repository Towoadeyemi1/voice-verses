interface BibleSuperSearchVerse {
  book_name: string;
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

interface BibleSuperSearchFormat {
  metadata: {
    name: string;
    shortname: string;
  };
  verses: BibleSuperSearchVerse[];
}

interface BibleBook {
  abbrev: string;
  name: string;
  chapters: string[][];
}

/**
 * Converts BibleSuperSearch format (ASV, WEB) to the format used by KJV
 */
export function convertBibleSuperSearchToStandard(data: BibleSuperSearchFormat): BibleBook[] {
  const books: Map<string, BibleBook> = new Map();

  data.verses.forEach((verse) => {
    const bookName = verse.book_name;
    
    if (!books.has(bookName)) {
      books.set(bookName, {
        abbrev: bookName.toLowerCase().substring(0, 3),
        name: bookName,
        chapters: [],
      });
    }

    const book = books.get(bookName)!;
    
    // Ensure we have enough chapters (chapters are 1-indexed, but array is 0-indexed)
    while (book.chapters.length < verse.chapter) {
      book.chapters.push([]);
    }

    // Ensure we have enough verse slots (verses are 1-indexed, but array is 0-indexed)
    const chapterArray = book.chapters[verse.chapter - 1];
    while (chapterArray.length < verse.verse) {
      chapterArray.push('');
    }

    // Set the verse text
    chapterArray[verse.verse - 1] = verse.text;
  });

  return Array.from(books.values());
}
