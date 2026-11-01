/**
 * Verse Detection Controller
 * 
 * CENTRAL POINT for all verse detection. This prevents duplicate triggers
 * and ensures consistent behavior across all speech engines.
 * 
 * Responsibilities:
 * 1. Accept transcript events from any provider
 * 2. Run normalization and reference extraction
 * 3. Convert references to actual verses via BibleParser
 * 4. Apply dedupe/debounce rules
 * 5. Emit final onVerseDetected events
 */

import { BibleVerse } from '@/types/bible';
import { words } from './scriptureMatcher';
import { LibrarySong, LyricsMatcher, SongMatch } from './lyricsMatcher';
import { cueTarget, parseWorshipCue, WorshipCue } from './worshipCues';
import { scriptureHint, ScriptureHint } from './scriptureHints';
import { lastWordIndex, readingPosition, readingTokens, ReadingToken } from './readingTracker';
import { loadScriptureIndex, scriptureIndex } from './scriptureIndex';
import { BibleParser } from '@/lib/bibleParser';
import { normalizeTranscript, mightContainVerseReference } from './transcriptNormalization';
import { 
  extractBestReference, 
  extractReferences,
  isNextVerseCommand, 
  isPreviousVerseCommand,
  ExtractedReference 
} from './referenceExtraction';
import { DetectionInfo, SpeechEngineType } from './ISpeechProvider';
import { VerseAssistant } from '@/ai/verseAssistant';

export interface VerseDetectionOptions {
  onVerseDetected: (verse: BibleVerse, info: DetectionInfo) => void;
  onTranscriptUpdate?: (text: string) => void;
  onSuggestion?: (candidates: { ref: string; score: number }[]) => void;

  // Optional AI assistant for described or quoted passages without a reference
  assistant?: VerseAssistant;
  /** AI matches are offered here for the operator to confirm */
  onVerseSuggested?: (verse: BibleVerse, info: DetectionInfo) => void;
  /** Show high-confidence AI matches directly instead of suggesting them */
  autoDisplayAiMatches?: boolean;

  /** A passage was called ("John 5:8-13", "John 5") or finished: shown verse by verse as it is read */
  onPassageChange?: (passage: Passage | null) => void;
  /** Song mode went on or off (off by itself when a Bible reference is said) */
  onSongModeChange?: (on: boolean) => void;
  /** A song from the library is being sung: offered to the operator */
  onSongSuggested?: (match: SongMatch) => void;
  /** While a song's lyrics are on screen: the slide (index into setLiveLyrics' slides) being sung now; with the cue when the leader called it */
  onLyricsMove?: (index: number, cue?: WorshipCue) => void;
  /** The preacher hinted where they are going ("Paul says the same thing in Romans"): for Predictive Next, never shown by itself */
  onScriptureHint?: (hint: ScriptureHint) => void;
  /** In song mode, singing that is in no library song and not the song on screen: offered as a new song to capture */
  onNewSinging?: (lines: string[]) => void;
  /** While capturing a new song: each line as it is sung */
  onCapturedLine?: (line: string) => void;
  /** How far the verse being read has got: the last word read (index into readingTokens(verse.text)), -1 for none yet */
  onReadingProgress?: (progress: ReadingProgress) => void;
  /**
   * A chapter was named without a verse ("somewhere in Isaiah 53"): nothing goes up yet. The chapter is
   * loaded for the operator; the verse goes up when it is read or named ("verse 5"), or is offered when paraphrased.
   */
  onChapterCalled?: (chapter: { book: string; chapter: number }) => void;
  /** The preacher asked for help finding a scripture ("help me find it"): the app is looking now */
  onFindRequested?: (heard: string) => void;
  
  // Dedupe settings
  dedupeWindowMs?: number;      // Ignore same verse within this window (default: 10000ms)
  debounceMs?: number;          // Minimum time between any verse triggers (default: 500ms)
  requireStablePartials?: boolean; // Require reference in 2 consecutive partials (default: true)
}

export interface ReadingProgress {
  verse: BibleVerse;
  /** Index of the last word read, in readingTokens(verse.text); -1 before the first */
  word: number;
  /** The last word has been read */
  done: boolean;
}

/** Quotes shown without asking only when at least this sure (the whole verse, word for word, and nothing else like it) */
export const AUTO_SHOW_CONFIDENCE = 0.99;

/** The preacher asking the media team to find a scripture */
const ASKED_TO_FIND =
  /\b(?:help me (?:find|look)|find (?:it|that|this|the (?:verse|scripture|passage)) for me|(?:can|could|would) (?:you|somebody|someone|anybody|the media(?: team)?) (?:find|look|bring|put)|(?:somebody|someone|media(?: team)?),? (?:find|look|bring|put)|where is (?:it|that|this)(?: found)?(?: in the bible)?\??$|what (?:verse|scripture|chapter) is (?:it|that|this)|look (?:it|that) up|put (?:it|that) on the screen)/i;

/** Fainter guesses than this are not offered */
const MIN_OFFER = 0.2;

/** Words too common to tell verses of one chapter apart */
const COMMON_WORDS = new Set(['that', 'this', 'with', 'from', 'they', 'them', 'their', 'there', 'have', 'has', 'were', 'will', 'shall', 'unto', 'your', 'what', 'when', 'which', 'then', 'than', 'into', 'upon', 'also', 'said', 'says', 'lord', 'god', 'people', 'like', 'just', 'know', 'because', 'about', 'some', 'come', 'came', 'went', 'make', 'made', 'does', 'even', 'every', 'over', 'only', 'very']);

/** How often the sentence still being spoken is searched for a quote or a story (ms) */
const PARTIAL_SEARCH_MS = 450;

/** A called passage: a range of verses, or a whole chapter */
export interface Passage {
  book: string;
  chapter: number;
  from: number;
  to: number;
}

interface VerseKey {
  book: string;
  chapter: number;
  startVerse: number;
  endVerse?: number;
}

export class VerseDetectionController {
  private lastDisplayedKey: string | null = null;
  private lastDisplayedAt: number = 0;
  private lastTriggerAt: number = 0;
  private lastPartialReference: ExtractedReference | null = null;
  private partialMatchCount: number = 0;
  private currentVerse: BibleVerse | null = null;
  private currentEngine: SpeechEngineType = 'builtin';
  private recentFinals: string[] = [];
  /** Words heard since the last verse change (finished sentences), in their common form */
  private heardWords: string[] = [];
  /** The sentence being spoken now; `usedWords` of it already moved the screen on */
  private partialWords: string[] = [];
  private usedWords = 0;
  private assistantRequest: AbortController | null = null;
  private lastSuggestedKey: string | null = null;
  private lastSuggestedAt = 0;
  /** The passage being read, with each verse's words (for following it loosely) */
  private passage: (Passage & { words: Map<number, string[]> }) | null = null;
  /** While singing: no verses from the words themselves, only from a reference said aloud */
  private songMode = false;
  private lyrics = new LyricsMatcher();
  /** The song on screen: its slides' text, and which one is showing */
  private liveLyrics: { slides: string[]; index: number; labels: string[] } | null = null;
  /** Spontaneous singing: lines heard that match nothing, and whether they are being captured */
  private unknownLines: string[] = [];
  private lastNewSingingOffer = 0;
  private capturing = false;
  private lastHint: { books: string; at: number } | null = null;
  /** A cue already acted on in the sentence being spoken (partials repeat it) */
  private cueTaken = false;
  /** When the lyrics last moved to another slide */
  private lyricsMovedAt = 0;
  /** Recent words for songs (kept apart from the scripture words, which reset on every verse) */
  private lyricWords: string[] = [];
  private lyricPartial: string[] = [];
  private lastSongSuggestion: { title: string; at: number } | null = null;
  /** Every word heard since the verse went up, for following it word by word */
  private readWords: string[] = [];
  private reading: { verse: BibleVerse; tokens: ReadingToken[]; word: number; done: boolean } | null = null;
  private suggested = new Map<string, number>();
  /** When the sentence in progress was last searched, and how many words it had then */
  private partialSearch = { at: 0, words: 0 };
  /** "Help me find it" was already acted on in this sentence */
  private findAsked = false;
  /** Sentences finished so far, and searches offered (to tie suggestions to the sentence they came from) */
  private utterance = 0;
  private batch = 0;
  /** Books hinted at lately ("in Romans", "Paul says"): their verses are a little more likely */
  private hinted: { books: Set<string>; at: number } | null = null;
  /** Scripture planned in today's service, by verse and by chapter */
  private planned = { verses: new Set<string>(), chapters: new Set<string>() };
  /** A chapter named without a verse, waiting to learn which verse */
  private calledChapter: { book: string; chapter: number } | null = null;
  
  private dedupeWindowMs: number;
  private debounceMs: number;
  private requireStablePartials: boolean;

  constructor(private options: VerseDetectionOptions) {
    this.dedupeWindowMs = options.dedupeWindowMs ?? 10000;
    this.debounceMs = options.debounceMs ?? 500;
    this.requireStablePartials = options.requireStablePartials ?? true;
    // Build the Bible word index in the background so quotes and read-along work once it is ready
    loadScriptureIndex().catch((error) => console.warn('Bible word index unavailable:', error));
  }

  /**
   * Set the current speech engine (for detection info)
   */
  setEngine(engine: SpeechEngineType): void {
    this.currentEngine = engine;
  }

  /**
   * Get the current verse context
   */
  getCurrentVerse(): BibleVerse | null {
    return this.currentVerse;
  }

  /**
   * Set current verse context (for "next verse" navigation)
   */
  setCurrentVerse(verse: BibleVerse | null): void {
    this.currentVerse = verse;
  }

  /** The church's songs, recognised when sung. */
  setSongLibrary(songs: LibrarySong[]): void {
    this.lyrics.setLibrary(songs);
  }

  /**
   * A song's lyrics are on screen (slides' text in order and the one showing), or null when not.
   * `labels` are each slide's section ("Chorus", "Verse 2"), for the leader's cues.
   */
  setLiveLyrics(slides: string[] | null, index = 0, labels: string[] = []): void {
    const sameSong = slides && this.liveLyrics && slides.join('\u0000') === this.liveLyrics.slides.join('\u0000');
    if (!sameSong || index !== this.liveLyrics?.index) {
      this.forgetLyricWords();
      this.lyricsMovedAt = Date.now();
    }
    this.liveLyrics = slides?.length ? { slides, index, labels } : null;
  }

  /** Capture each sung line (a new song the operator chose to show), or stop. */
  setCapturing(on: boolean): void {
    this.capturing = on;
    this.unknownLines = [];
  }

  isSongMode(): boolean {
    return this.songMode;
  }

  /** Singing: stop finding verses in the words (a reference said aloud still shows, and ends song mode). */
  setSongMode(on: boolean): void {
    if (this.songMode === on) return;
    this.songMode = on;
    this.heardWords = [];
    this.forgetLyricWords();
    this.options.onSongModeChange?.(on);
  }

  getPassage(): Passage | null {
    return this.passage ? { book: this.passage.book, chapter: this.passage.chapter, from: this.passage.from, to: this.passage.to } : null;
  }

  /** Steps through the called passage (or on through the chapter): +1 next verse, -1 previous. */
  async step(direction: 1 | -1): Promise<void> {
    const current = this.currentVerse;
    if (!current) return;
    const target = current.verse + direction;
    if (target < 1) return;
    const verse = await BibleParser.getVerse(current.book, current.chapter, target);
    if (verse) this.triggerVerseDetected(verse, { method: 'manual', confidence: 'high' });
  }

  endPassage(): void {
    this.setPassage(null);
  }

  /**
   * The operator put this verse on screen themselves: follow it (reading, next
   * verse, passage) without announcing it as detected.
   */
  follow(verse: BibleVerse | null): void {
    if (!verse) {
      this.currentVerse = null;
      this.reading = null;
      return;
    }
    this.lastDisplayedKey = `${verse.book}:${verse.chapter}:${verse.verse}`;
    this.lastDisplayedAt = Date.now();
    this.markShown(verse);
  }

  /**
   * Main entry point - process incoming transcript
   */
  async onTranscript(text: string, isFinal: boolean): Promise<void> {
    if (!text || typeof text !== 'string') {
      return;
    }

    const cleanText = text.trim();
    if (!cleanText) {
      return;
    }

    console.log(`VerseDetectionController: Processing transcript (final=${isFinal}):`, cleanText);
    
    // Notify transcript update
    this.options.onTranscriptUpdate?.(cleanText);

    // Quick filter - skip expensive parsing when there is no number at all
    let reference: ExtractedReference | null = null;
    if (mightContainVerseReference(cleanText)) {
      const normalized = normalizeTranscript(cleanText);
      console.log('Normalized transcript:', normalized);
      reference = extractBestReference(normalized);
    }

    // Speech engines sometimes split a reference across two segments
    // ("...second timothy three" | "sixteen tells us...")
    if (!reference && isFinal) {
      reference = this.referenceAcrossSegments(cleanText);
    }

    // While singing, references are only taken when clearly said ("John 3:16"), not "John 3" in a lyric
    if (reference && this.songMode && reference.confidence === 'low') reference = null;

    if (!reference) {
      // No reference: a navigation command, a song being sung, the passage being read on, a quoted verse, or a described one
      if (await this.handleNavigationCommands(cleanText, isFinal)) return;
      if (this.handleSinging(cleanText, isFinal)) return;
      this.noticeHint(cleanText, isFinal);
      const recent = this.hear(cleanText, isFinal);
      if (await this.verseOfPassage(cleanText, isFinal)) return;
      if (this.calledChapter && (await this.findInCalledChapter(recent, cleanText, isFinal))) return;
      if (await this.trackReading()) return;
      if (await this.followReading(recent)) return;
      if (this.askedToFind(cleanText, isFinal)) {
        await this.findForPreacher(cleanText);
        return;
      }
      if (isFinal) {
        const quote = await this.findQuote(recent, cleanText);
        const story = quote === 'reading' ? 0 : await this.findStory(recent, cleanText, quote);
        if (!quote && !story) this.askAssistant(cleanText);
      } else if (this.dueForPartialSearch(recent)) {
        // While the sentence is still being spoken: offer what it sounds like now (nothing goes up from a partial)
        const quote = await this.findQuote(recent, cleanText, { offerOnly: true });
        if (quote !== 'reading') await this.findStory(recent, cleanText, quote);
      }
      return;
    }

    // A Bible reference said aloud: back to scripture
    this.setSongMode(false);

    if (isFinal) this.rememberFinal(cleanText);

    console.log('Extracted reference:', reference);

    // For partial transcripts, require stability before triggering, unless more words already
    // follow the reference (then it is complete: "John 3:16 says..." cannot still become 3:17)
    if (!isFinal && this.requireStablePartials && !this.isCompleteInPartial(cleanText, reference)) {
      if (this.isSameReference(reference, this.lastPartialReference)) {
        this.partialMatchCount++;
        console.log(`Partial match count: ${this.partialMatchCount}`);
        
        // Only trigger on 2+ consecutive matches
        if (this.partialMatchCount < 2) {
          this.lastPartialReference = reference;
          return;
        }
      } else {
        // Different reference, reset counter
        this.partialMatchCount = 1;
        this.lastPartialReference = reference;
        return;
      }
    }

    // A chapter alone ("somewhere in Isaiah 53") is not a verse: wait to learn which one
    if (reference.wholeChapter && !reference.fromVerse) {
      await this.callChapter(reference.book, reference.chapter);
      return;
    }

    // Check dedupe rules
    if (!this.passesDedupeCheck(reference)) {
      console.log('Reference blocked by dedupe rules');
      return;
    }

    // Look up the actual verse
    const verse = await this.lookupVerse(reference);
    
    if (verse) {
      this.triggerVerseDetected(verse, {
        method: 'explicit',
        confidence: reference.confidence,
        engine: this.currentEngine,
        score: 1,
      });
      await this.passageFor(reference);
    }
  }

  /** A range ("John 5:8-13") or a whole chapter ("John 5") is followed verse by verse as it is read. */
  private async passageFor(reference: ExtractedReference): Promise<void> {
    let to = reference.endVerse && reference.endVerse > reference.startVerse ? reference.endVerse : 0;
    if (!to && reference.wholeChapter) to = await BibleParser.getChapterLength(reference.book, reference.chapter);
    if (!to || !this.currentVerse) {
      // A verse inside the passage being read ("verse 10") keeps the passage
      const p = this.passage;
      const inside = p && this.currentVerse && p.book === this.currentVerse.book && p.chapter === this.currentVerse.chapter;
      if (!inside) this.setPassage(null);
      return;
    }
    const passage = { book: this.currentVerse.book, chapter: reference.chapter, from: reference.startVerse, to };
    const verses = await Promise.all(
      Array.from({ length: to - reference.startVerse + 1 }, (_, i) => BibleParser.getVerse(passage.book, passage.chapter, passage.from + i)),
    );
    const wordsByVerse = new Map<number, string[]>();
    verses.forEach((v) => v && wordsByVerse.set(v.verse, words(v.text)));
    this.setPassage({ ...passage, words: wordsByVerse });
  }

  private setPassage(passage: (Passage & { words: Map<number, string[]> }) | null): void {
    if (!passage && !this.passage) return;
    this.passage = passage;
    this.options.onPassageChange?.(this.getPassage());
  }

  /** The reference in a partial transcript is followed by at least two more words. */
  private isCompleteInPartial(text: string, reference: ExtractedReference): boolean {
    if (reference.index === undefined) return false;
    const after = normalizeTranscript(text).slice(reference.index + reference.raw.length);
    return after.split(/\s+/).filter((w) => /[a-z]/i.test(w)).length >= 2;
  }

  /**
   * Songs: while one is on screen, follows the part being sung; otherwise
   * offers a library song that is clearly being sung. In song mode nothing
   * else is looked for. Returns true when the words were taken as singing.
   */
  private handleSinging(text: string, isFinal: boolean): boolean {
    if (!this.lyrics.size && !this.liveLyrics && !this.songMode) return false;
    if (this.liveLyrics && this.followCue(text, isFinal)) return true;
    const sung = this.hearLyrics(text, isFinal);
    if (isFinal && (this.songMode || this.capturing)) this.noticeNewSinging(text);
    if (this.liveLyrics) {
      const next = this.lyrics.follow(this.liveLyrics.slides, this.liveLyrics.index, sung);
      if (next !== null && next !== this.liveLyrics.index) {
        this.liveLyrics = { ...this.liveLyrics, index: next };
        this.forgetLyricWords();
        this.lyricsMovedAt = Date.now();
        this.options.onLyricsMove?.(next);
      }
      return true;
    }
    const match = this.lyrics.identify(sung);
    if (match) {
      const repeated = this.lastSongSuggestion?.title === match.song.title && Date.now() - this.lastSongSuggestion.at < 60_000;
      if (!repeated) {
        this.lastSongSuggestion = { title: match.song.title, at: Date.now() };
        this.options.onSongSuggested?.(match);
      }
      return true;
    }
    return this.songMode;
  }

  /**
   * The worship leader called a cue ("one more time", "go to the bridge"): move the lyrics there.
   * Acts once per sentence, as soon as the cue is heard (partials included).
   */
  private followCue(text: string, isFinal: boolean): boolean {
    const live = this.liveLyrics!;
    const taken = this.cueTaken;
    if (isFinal) this.cueTaken = false;
    const cue = parseWorshipCue(text);
    if (!cue) return false;
    if (taken) return true;
    // Without section names only "from the top" can be followed
    const named = live.labels.length === live.slides.length && live.labels.some(Boolean);
    const justArrived = Date.now() - this.lyricsMovedAt < 4000;
    const target = named ? cueTarget(cue, live.labels, live.index, { justArrived }) : cue.kind === 'top' && live.index !== 0 ? 0 : null;
    if (!isFinal) this.cueTaken = true;
    if (target === null) return true;
    this.liveLyrics = { ...live, index: target };
    this.forgetLyricWords();
    this.options.onLyricsMove?.(target, cue);
    return true;
  }

  /**
   * A hint of the next verse's book, passed on once (partials repeat it). In a
   * sentence still being spoken, only a hint naming one book: "Paul says the
   * same thing…" may still go on to name the book ("…in Romans").
   */
  private noticeHint(text: string, isFinal = true): void {
    const hint = scriptureHint(text);
    if (!hint || (!isFinal && hint.books.length > 1)) return;
    this.hinted = { books: new Set(hint.books), at: Date.now() };
    if (!this.options.onScriptureHint) return;
    const books = hint.books.join('|');
    if (this.lastHint?.books === books && Date.now() - this.lastHint.at < 15_000) return;
    this.lastHint = { books, at: Date.now() };
    this.options.onScriptureHint(hint);
  }

  /**
   * A finished sung line that is in no library song and not in the song on screen. Two in a row in
   * song mode: offered as a new song. While capturing, every line is passed on as it is sung.
   */
  private noticeNewSinging(text: string): void {
    const line = words(text);
    if (this.capturing) {
      if (line.length >= 3) this.options.onCapturedLine?.(text);
      return;
    }
    if (line.length < 4) return;
    const known = this.liveLyrics ? this.lyrics.matchScore(this.liveLyrics.slides, line) >= 3 : false;
    if (known || this.lyrics.libraryScore(line) >= 4) {
      this.unknownLines = [];
      return;
    }
    this.unknownLines = [...this.unknownLines, text].slice(-4);
    if (this.unknownLines.length >= 2 && Date.now() - this.lastNewSingingOffer > 60_000) {
      this.lastNewSingingOffer = Date.now();
      this.options.onNewSinging?.([...this.unknownLines]);
    }
  }

  private hearLyrics(text: string, isFinal: boolean): string[] {
    const sentence = words(text);
    if (isFinal) {
      this.lyricWords = [...this.lyricWords, ...sentence].slice(-24);
      this.lyricPartial = [];
      return this.lyricWords;
    }
    this.lyricPartial = sentence;
    return [...this.lyricWords, ...sentence].slice(-24);
  }

  private forgetLyricWords(): void {
    this.lyricWords = [];
    this.lyricPartial = [];
  }

  /**
   * Handle navigation commands ("next verse", "previous verse").
   * Returns true when the text was a navigation command.
   */
  private async handleNavigationCommands(text: string, isFinal = true): Promise<boolean> {
    // "Next" said on its own (a whole short sentence): the next verse, or the next slide of a song
    const saidNext = isFinal && /^\W*(?:(?:ok(?:ay)?|and|right|alright|yes|so)\W+)?next(?:\W+(?:one|please|verse|slide|line))?\W*$/i.test(text);
    if (saidNext && this.liveLyrics) {
      const next = Math.min(this.liveLyrics.slides.length - 1, this.liveLyrics.index + 1);
      if (next !== this.liveLyrics.index) {
        this.liveLyrics = { ...this.liveLyrics, index: next };
        this.forgetLyricWords();
        this.options.onLyricsMove?.(next);
      }
      return true;
    }
    if (!this.currentVerse) {
      return false;
    }

    if (isNextVerseCommand(text) || saidNext) {
      console.log('Next verse command detected');
      const nextVerse = await BibleParser.getVerse(
        this.currentVerse.book,
        this.currentVerse.chapter,
        this.currentVerse.verse + 1
      );
      
      if (nextVerse) {
        this.triggerVerseDetected(nextVerse, {
          method: 'explicit',
          confidence: 'high',
          engine: this.currentEngine,
        });
      }
    } else if (isPreviousVerseCommand(text)) {
      console.log('Previous verse command detected');
      const prevVerse = await BibleParser.getVerse(
        this.currentVerse.book,
        this.currentVerse.chapter,
        Math.max(1, this.currentVerse.verse - 1)
      );
      
      if (prevVerse) {
        this.triggerVerseDetected(prevVerse, {
          method: 'explicit',
          confidence: 'high',
          engine: this.currentEngine,
        });
      }
    } else {
      return false;
    }
    return true;
  }

  /** Keeps track of the words heard since the screen last changed; returns them, latest last. */
  private hear(text: string, isFinal: boolean): string[] {
    const sentence = words(text);
    if (isFinal) {
      const fresh = sentence.slice(this.usedWords);
      this.heardWords = [...this.heardWords, ...fresh].slice(-40);
      this.readWords = [...this.readWords, ...fresh].slice(-300);
      this.partialWords = [];
      this.usedWords = 0;
      this.partialSearch = { at: 0, words: 0 };
      this.utterance++;
      this.readingNow = this.readWords;
      return this.heardWords;
    }
    this.partialWords = sentence;
    this.readingNow = [...this.readWords, ...sentence.slice(this.usedWords)];
    return [...this.heardWords, ...sentence.slice(this.usedWords)].slice(-40);
  }

  /** Words heard since the verse went up, including the sentence in progress */
  private readingNow: string[] = [];

  /**
   * Follows the verse on screen word by word. When the reader gets to the end
   * of a verse inside a called passage, the next verse comes up. Returns true
   * when it moved on.
   */
  private async trackReading(): Promise<boolean> {
    const reading = this.reading;
    if (!reading || reading.done) return false;
    const word = readingPosition(reading.tokens, this.readingNow);
    if (word <= reading.word) return false;
    reading.word = word;
    reading.done = word >= lastWordIndex(reading.tokens);
    this.options.onReadingProgress?.({ verse: reading.verse, word, done: reading.done });
    const p = this.passage;
    const v = reading.verse;
    if (reading.done && p && v.book === p.book && v.chapter === p.chapter && v.verse < p.to) {
      const next = await BibleParser.getVerse(v.book, v.chapter, v.verse + 1);
      if (next && this.reading === reading) {
        this.triggerVerseDetected(next, { method: 'explicit', confidence: 'high', engine: this.currentEngine, score: 1 });
        return true;
      }
    }
    return false;
  }

  /** After the screen changes, only words spoken from now on count. */
  private forgetHeardWords(): void {
    this.heardWords = [];
    this.readWords = [];
    this.readingNow = [];
    this.usedWords = this.partialWords.length;
  }

  /** A verse is now the one on screen: following starts again from its first word. */
  private markShown(verse: BibleVerse): void {
    this.currentVerse = verse;
    this.calledChapter = null;
    this.lastPartialReference = null;
    this.partialMatchCount = 0;
    this.forgetHeardWords();
    this.reading = { verse, tokens: readingTokens(verse.text), word: -1, done: false };
    this.options.onReadingProgress?.({ verse, word: -1, done: false });
    const p = this.passage;
    if (p && (verse.book !== p.book || verse.chapter !== p.chapter || verse.verse < p.from || verse.verse > p.to)) {
      this.setPassage(null);
    }
  }

  /** While a passage is read aloud, moves on to the verse being read (a few ahead at most). */
  private async followReading(recent: string[]): Promise<boolean> {
    if (await this.followPassage(recent)) return true;
    const index = scriptureIndex();
    if (!index || !this.currentVerse) return false;
    const next = index.followReading(this.currentVerse, recent.slice(-14));
    if (!next) return false;
    const verse = await BibleParser.getVerse(next.book, next.chapter, next.verse);
    if (!verse) return false;
    this.triggerVerseDetected(verse, { method: 'explicit', confidence: 'medium', engine: this.currentEngine, score: 1 });
    return true;
  }

  /**
   * Inside a called passage the verses to come are known, so a looser match is
   * enough: a few pairs of words from the next verse (speech recognition often
   * gets single words of a reading wrong, which breaks longer runs).
   */
  private async followPassage(recent: string[]): Promise<boolean> {
    const passage = this.passage;
    const current = this.currentVerse;
    if (!passage || !current || current.book !== passage.book || current.chapter !== passage.chapter) return false;
    const spoken = recent.slice(-12);
    if (spoken.length < 3) return false;
    const pairsOf = (w: string[]) => new Set(w.slice(1).map((x, i) => `${w[i]} ${x}`));
    const heard = pairsOf(spoken);
    const hits = (verse: number) => {
      const w = passage.words.get(verse);
      if (!w) return -1;
      let n = 0;
      for (const p of pairsOf(w)) if (heard.has(p)) n++;
      return n;
    };
    const stay = Math.max(0, hits(current.verse));
    let best = 0;
    let bestHits = 0;
    for (let v = current.verse + 1; v <= Math.min(passage.to, current.verse + 4); v++) {
      const h = hits(v);
      if (h > bestHits) {
        best = v;
        bestHits = h;
      }
    }
    if (!best || bestHits < 3 || bestHits <= stay) return false;
    const verse = await BibleParser.getVerse(passage.book, passage.chapter, best);
    if (!verse) return false;
    this.triggerVerseDetected(verse, { method: 'explicit', confidence: 'medium', engine: this.currentEngine, score: 1 });
    return true;
  }

  /**
   * A verse quoted without its reference. Shown only when it is the whole verse
   * word for word and nothing else matches (99%+); otherwise the likely verses
   * are offered with how sure each is, for the operator to check and choose.
   */
  /**
   * Returns how sure the best quote found is (0 for none), or 'reading' when
   * the words are the verse on screen being read on (not a new quote).
   * `offerOnly`: the sentence is still being spoken, so nothing goes up yet.
   */
  private async findQuote(recent: string[], heard: string, { offerOnly = false } = {}): Promise<number | 'reading'> {
    const index = scriptureIndex();
    if (!index) return 0;
    // The last sentence or two: enough for a quote, without older words competing with it
    const spoken = recent.slice(-18);
    // Still reading the verse on screen: not a new quote (and not a question for the AI)
    if (this.currentVerse && index.wordsFrom(this.currentVerse, spoken) >= 2) return 'reading';
    const candidates = index.findQuotes(spoken, this.currentVerse, 3, recent);
    if (!candidates.length) return 0;
    const [best] = candidates;
    if (best.confidence >= AUTO_SHOW_CONFIDENCE && !offerOnly) {
      const verse = await BibleParser.getVerse(best.ref.book, best.ref.chapter, best.ref.verse);
      if (verse && `${verse.book}:${verse.chapter}:${verse.verse}` !== this.lastDisplayedKey) {
        this.triggerVerseDetected(verse, { method: 'description', description: heard, confidence: 'high', engine: this.currentEngine, score: best.confidence });
      }
      return best.confidence;
    }
    await this.offer(candidates.map((c) => ({ ...c, confidence: Math.min(c.confidence, offerOnly ? 0.98 : c.confidence) })), heard);
    return best.confidence;
  }

  /**
   * A Bible story told in the preacher's own words, with its names ("Zacchaeus
   * climbed a tree"): offered for the operator to choose, never shown by
   * itself. Only when no quote was found that is as sure. Returns how sure the
   * best is (0 for none).
   */
  private async findStory(recent: string[], heard: string, quote = 0, eager = false): Promise<number> {
    const index = scriptureIndex();
    if (!index) return 0;
    const candidates = index.findStory(recent.slice(eager ? -80 : -30), this.currentVerse, 2, { eager });
    if (!candidates.length || candidates[0].confidence <= quote) return 0;
    await this.offer(candidates, heard);
    return candidates[0].confidence;
  }

  /** The sentence in progress has grown enough since it was last searched. */
  private dueForPartialSearch(recent: string[]): boolean {
    const now = Date.now();
    const spoken = this.partialWords.length;
    if (spoken < 6 || now - this.partialSearch.at < PARTIAL_SEARCH_MS || spoken - this.partialSearch.words < 3) return false;
    this.partialSearch = { at: now, words: spoken };
    return recent.length >= 6;
  }

  /** Loads a chapter named without a verse, for following: nothing goes on screen until the verse is known. */
  private async callChapter(book: string, chapter: number): Promise<void> {
    const length = await BibleParser.getChapterLength(book, chapter);
    if (!length) return;
    const verses = await Promise.all(Array.from({ length }, (_, i) => BibleParser.getVerse(book, chapter, i + 1)));
    const first = verses.find((v) => v);
    if (!first) return;
    const wordsByVerse = new Map<number, string[]>();
    verses.forEach((v) => v && wordsByVerse.set(v.verse, words(v.text)));
    this.calledChapter = { book: first.book, chapter };
    this.setPassage({ book: first.book, chapter, from: 1, to: length, words: wordsByVerse });
    this.forgetHeardWords();
    this.options.onChapterCalled?.({ book: first.book, chapter });
  }

  /** "Verse 5" (no book) while a chapter is called or a passage is being read: that verse of it, said outright. */
  private async verseOfPassage(text: string, isFinal: boolean): Promise<boolean> {
    const p = this.passage;
    if (!p) return false;
    const match = /(?:^|[\s,.])(?:verses?\s+|:)(\d{1,3})\b(?!\s*:)/i.exec(normalizeTranscript(text));
    if (!match) return false;
    const n = parseInt(match[1], 10);
    // In a partial the number may still grow ("verse 1" becoming "verse 14"): wait for a word after it
    if (!isFinal && !/\S+\s+\S/.test(text.slice(text.toLowerCase().lastIndexOf(match[1])))) return false;
    const book = this.calledChapter?.book ?? p.book;
    const chapter = this.calledChapter?.chapter ?? p.chapter;
    if (n < 1 || n > (this.calledChapter ? p.to : Math.max(p.to, n))) return false;
    if (this.currentVerse && this.currentVerse.book === book && this.currentVerse.chapter === chapter && this.currentVerse.verse === n) return false;
    const verse = await BibleParser.getVerse(book, chapter, n);
    if (!verse) return false;
    this.triggerVerseDetected(verse, { method: 'explicit', confidence: 'high', engine: this.currentEngine, score: 1 });
    return true;
  }

  /**
   * A chapter was called: find the verse of it being read or quoted (it goes up,
   * as a reading does), or the one paraphrased (offered, surer than elsewhere).
   */
  private async findInCalledChapter(recent: string[], heard: string, isFinal: boolean): Promise<boolean> {
    const called = this.calledChapter;
    const p = this.passage;
    if (!called || !p) return false;
    const spoken = recent.slice(-14);
    if (spoken.length < 3) return false;
    const pairsOf = (w: string[]) => new Set(w.slice(1).map((x, i) => `${w[i]} ${x}`));
    const heardPairs = pairsOf(spoken);
    const scored = [...p.words.entries()].map(([verse, w]) => {
      let hits = 0;
      for (const pair of pairsOf(w)) if (heardPairs.has(pair)) hits++;
      return { verse, hits };
    });
    scored.sort((a, b) => b.hits - a.hits || a.verse - b.verse);
    const [best, second] = scored;
    // Read or quoted: three pairs of its words, clearly more than any other verse of the chapter
    if (best && best.hits >= 3 && best.hits >= (second?.hits ?? 0) + 2) {
      const verse = await BibleParser.getVerse(called.book, called.chapter, best.verse);
      if (verse) {
        this.triggerVerseDetected(verse, { method: 'explicit', confidence: 'medium', engine: this.currentEngine, score: 1 });
        return true;
      }
    }
    if (!isFinal) return false;
    // In his own words: the telling words it shares with each verse of the chapter
    const told = new Set(recent.slice(-30).filter((w) => w.length >= 4 && !COMMON_WORDS.has(w)));
    const shared = [...p.words.entries()]
      .map(([verse, w]) => ({ verse, n: new Set(w.filter((x) => told.has(x))).size }))
      .sort((a, b) => b.n - a.n || a.verse - b.verse);
    const [top, next] = shared;
    if (!top || top.n < 2 || top.n <= (next?.n ?? 0)) return false;
    await this.offer([{ ref: { book: called.book, chapter: called.chapter, verse: top.verse }, confidence: Math.min(0.9, 0.55 + 0.1 * (top.n - (next?.n ?? 0))) }], heard);
    return true;
  }

  /** "Help me find it", acted on once per sentence (as soon as the partial has it). */
  private askedToFind(text: string, isFinal: boolean): boolean {
    const heard = ASKED_TO_FIND.test(text);
    const act = heard && !this.findAsked;
    this.findAsked = isFinal ? false : this.findAsked || heard;
    return act;
  }

  /**
   * The preacher asked for help finding it: everything said since the screen
   * last changed is searched at once, more widely (quotes and stories), and
   * the AI assistant is asked about the last few sentences together.
   */
  private async findForPreacher(heard: string): Promise<void> {
    this.options.onFindRequested?.(heard);
    const said = this.readWords.slice(-80);
    const index = scriptureIndex();
    let best = 0;
    if (index && said.length >= 4) {
      const quotes = index.findQuotes(said.slice(-40), this.currentVerse, 3, said);
      if (quotes.length) {
        await this.offer(quotes.map((c) => ({ ...c, confidence: Math.min(c.confidence, 0.98) })), heard);
        best = quotes[0].confidence;
      }
      best = Math.max(best, await this.findStory(said, heard, best, true));
    }
    const told = [...this.recentFinals.slice(-3), heard].join(' ');
    this.askAssistant(told, { force: true, remember: false });
  }

  /** Scripture planned in today's service: offered verses from it (or its chapters) are more likely. */
  setPlanned(verses: { book: string; chapter: number; verse: number }[]): void {
    this.planned = {
      verses: new Set(verses.map((v) => `${v.book}|${v.chapter}|${v.verse}`)),
      chapters: new Set(verses.map((v) => `${v.book}|${v.chapter}`)),
    };
  }

  /**
   * How much likelier a verse is from what is going on: the chapter called or
   * being read (+0.15) or its book (+0.05), today's plan (+0.12 for the verse,
   * +0.06 for its chapter), a book hinted at in the last minute (+0.1).
   */
  private contextBoost(ref: { book: string; chapter: number; verse: number }): number {
    let boost = 0;
    const here = this.calledChapter ?? this.passage ?? this.currentVerse;
    if (here && here.book === ref.book) boost += here.chapter === ref.chapter ? 0.15 : 0.05;
    if (this.planned.verses.has(`${ref.book}|${ref.chapter}|${ref.verse}`)) boost += 0.12;
    else if (this.planned.chapters.has(`${ref.book}|${ref.chapter}`)) boost += 0.06;
    if (this.hinted && Date.now() - this.hinted.at < 60_000 && this.hinted.books.has(ref.book)) boost += 0.1;
    return boost;
  }

  /**
   * Offers verses to the operator with how sure each is, best first. Context
   * (the chapter called, today's plan, a book just mentioned) makes a verse
   * surer, though never sure enough to go up by itself. Only the best, and
   * any nearly as good, are offered; very faint guesses (under 20%) are not.
   * The same verse again only when surer, or a while later.
   */
  private async offer(candidates: { ref: { book: string; chapter: number; verse: number }; confidence: number }[], heard: string): Promise<void> {
    const boosted = candidates
      .map((c) => ({ ...c, confidence: Math.round(Math.min(0.98, c.confidence + this.contextBoost(c.ref)) * 100) / 100 }))
      .sort((a, b) => b.confidence - a.confidence);
    const top = boosted[0]?.confidence ?? 0;
    const kept = boosted.filter((c, i) => c.confidence >= MIN_OFFER && (i === 0 || c.confidence >= top - 0.2));
    const batch = ++this.batch;
    const now = Date.now();
    for (const candidate of kept) {
      const verse = await BibleParser.getVerse(candidate.ref.book, candidate.ref.chapter, candidate.ref.verse);
      if (!verse) continue;
      const key = `${verse.book}:${verse.chapter}:${verse.verse}`;
      if (key === this.lastDisplayedKey) continue;
      // The same verse again only if it is now more certain, or a while later
      const previous = this.suggested.get(key);
      if (previous !== undefined && previous >= candidate.confidence && now - this.lastSuggestedAt < this.dedupeWindowMs) continue;
      this.suggested.set(key, candidate.confidence);
      this.lastSuggestedKey = key;
      this.lastSuggestedAt = now;
      // The words stay: if the rest of the quote follows, it becomes more certain
      this.options.onVerseSuggested?.(verse, {
        method: 'description',
        description: heard,
        confidence: candidate.confidence >= 0.75 ? 'high' : candidate.confidence >= 0.45 ? 'medium' : 'low',
        engine: this.currentEngine,
        score: candidate.confidence,
        utterance: this.utterance,
        batch,
      });
    }
  }

  /**
   * Look for a reference that starts in the previous final segment and ends in
   * this one. References entirely inside the previous segment were already handled.
   */
  private referenceAcrossSegments(text: string): ExtractedReference | null {
    const previous = this.recentFinals[this.recentFinals.length - 1];
    if (!previous) return null;

    const tail = previous.split(/\s+/).slice(-6).join(' ');
    const boundary = normalizeTranscript(tail).length;
    const spanning = extractReferences(`${tail} ${text}`).filter(
      (r) => r.confidence !== 'low' && (r.index ?? 0) < boundary && (r.index ?? 0) + r.raw.length > boundary,
    );
    return spanning[spanning.length - 1] ?? null;
  }

  private rememberFinal(text: string): void {
    this.recentFinals = [...this.recentFinals, text].slice(-3);
  }

  /**
   * Ask the AI assistant about a sentence the rules couldn't place. Only the
   * latest sentence is in flight; an older request is cancelled.
   */
  private askAssistant(text: string, { force = false, remember = true } = {}): void {
    const assistant = this.options.assistant;
    const context = this.recentFinals;
    if (remember) this.rememberFinal(text);
    if (!assistant) return;
    // A short sentence ("he climbed up a tree") is asked about with the one before it
    if (!force && text.split(/\s+/).length < 8 && context.length) text = `${context[context.length - 1]} ${text}`;
    if (!force && !assistant.shouldAsk(text)) return;

    this.assistantRequest?.abort();
    const request = new AbortController();
    this.assistantRequest = request;

    assistant
      .identify(text, context, request.signal)
      .then((match) => (match && !request.signal.aborted ? this.handleAssistantMatch(match.reference, match.confidence, text) : undefined))
      .catch((error) => {
        if (!request.signal.aborted) console.warn('AI verse assistant failed:', error);
      });
  }

  private async handleAssistantMatch(referenceText: string, confidence: 'high' | 'medium' | 'low', heard: string): Promise<void> {
    if (confidence === 'low') return;

    // Only accept references that exist in the Bible
    const reference = extractBestReference(normalizeTranscript(referenceText));
    if (!reference) return;
    const verse = await this.lookupVerse(reference);
    if (!verse) return;

    const info: DetectionInfo = { method: 'description', description: heard, confidence, engine: 'ai', score: confidence === 'high' ? 0.85 : 0.6 };

    if (this.options.autoDisplayAiMatches && confidence === 'high') {
      if (this.passesDedupeCheck(reference)) this.triggerVerseDetected(verse, info);
      return;
    }

    // Don't offer the verse already on screen, or the same suggestion twice in a row
    const key = `${verse.book}:${verse.chapter}:${verse.verse}`;
    const onScreen = key === this.lastDisplayedKey;
    const repeated = key === this.lastSuggestedKey && Date.now() - this.lastSuggestedAt < this.dedupeWindowMs;
    if (onScreen || repeated) return;

    this.lastSuggestedKey = key;
    this.lastSuggestedAt = Date.now();
    this.options.onVerseSuggested?.(verse, info);
  }

  /**
   * Check if two references are the same
   */
  private isSameReference(a: ExtractedReference | null, b: ExtractedReference | null): boolean {
    if (!a || !b) return false;
    return a.book === b.book && 
           a.chapter === b.chapter && 
           a.startVerse === b.startVerse &&
           a.endVerse === b.endVerse;
  }

  /**
   * Check if a reference passes dedupe rules
   */
  private passesDedupeCheck(reference: ExtractedReference): boolean {
    const now = Date.now();
    const key = this.makeKey(reference);

    // Check debounce (minimum time between any triggers)
    if (now - this.lastTriggerAt < this.debounceMs) {
      console.log(`Debounce active: ${now - this.lastTriggerAt}ms since last trigger`);
      return false;
    }

    // Check dedupe window (same verse within window)
    if (key === this.lastDisplayedKey && now - this.lastDisplayedAt < this.dedupeWindowMs) {
      console.log(`Dedupe active: same verse within ${this.dedupeWindowMs}ms window`);
      return false;
    }

    return true;
  }

  /**
   * Create a unique key for a reference
   */
  private makeKey(reference: ExtractedReference): string {
    return `${reference.book}:${reference.chapter}:${reference.startVerse}${reference.endVerse ? `-${reference.endVerse}` : ''}`;
  }

  /**
   * Look up a verse from a reference
   */
  private async lookupVerse(reference: ExtractedReference): Promise<BibleVerse | null> {
    try {
      const verse = await BibleParser.getVerse(
        reference.book,
        reference.chapter,
        reference.startVerse
      );
      
      return verse;
    } catch (error) {
      console.error('Error looking up verse:', error);
      return null;
    }
  }

  /**
   * Trigger verse detected event with all safety checks passed
   */
  private triggerVerseDetected(verse: BibleVerse, info: DetectionInfo): void {
    const now = Date.now();
    const key = `${verse.book}:${verse.chapter}:${verse.verse}`;

    console.log('Triggering verse detected:', verse, info);

    // Update tracking state
    this.lastDisplayedKey = key;
    this.lastDisplayedAt = now;
    this.lastTriggerAt = now;
    this.markShown(verse);

    // Emit the event
    this.options.onVerseDetected(verse, info);
  }

  /**
   * Manually trigger a verse (e.g., from search)
   */
  triggerManualVerse(verse: BibleVerse): void {
    this.triggerVerseDetected(verse, {
      method: 'manual',
      confidence: 'high',
    });
  }

  /**
   * Reset the controller state
   */
  reset(): void {
    this.assistantRequest?.abort();
    this.assistantRequest = null;
    this.recentFinals = [];
    this.heardWords = [];
    this.partialWords = [];
    this.usedWords = 0;
    this.lastSuggestedKey = null;
    this.lastDisplayedKey = null;
    this.lastDisplayedAt = 0;
    this.lastTriggerAt = 0;
    this.lastPartialReference = null;
    this.partialMatchCount = 0;
    this.currentVerse = null;
    this.passage = null;
    this.reading = null;
    this.readWords = [];
    this.readingNow = [];
    this.suggested.clear();
    this.songMode = false;
    this.liveLyrics = null;
    this.forgetLyricWords();
  }
}
