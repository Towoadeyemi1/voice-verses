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
  /** While a song's lyrics are on screen: the slide (index into setLiveLyrics' slides) being sung now */
  onLyricsMove?: (index: number) => void;
  
  // Dedupe settings
  dedupeWindowMs?: number;      // Ignore same verse within this window (default: 10000ms)
  debounceMs?: number;          // Minimum time between any verse triggers (default: 500ms)
  requireStablePartials?: boolean; // Require reference in 2 consecutive partials (default: true)
}

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
  private liveLyrics: { slides: string[]; index: number } | null = null;
  /** Recent words for songs (kept apart from the scripture words, which reset on every verse) */
  private lyricWords: string[] = [];
  private lyricPartial: string[] = [];
  private lastSongSuggestion: { title: string; at: number } | null = null;
  
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

  /** A song's lyrics are on screen (slides' text in order and the one showing), or null when not. */
  setLiveLyrics(slides: string[] | null, index = 0): void {
    const sameSong = slides && this.liveLyrics && slides.join('\u0000') === this.liveLyrics.slides.join('\u0000');
    if (!sameSong || index !== this.liveLyrics?.index) this.forgetLyricWords();
    this.liveLyrics = slides?.length ? { slides, index } : null;
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
      if (await this.handleNavigationCommands(cleanText)) return;
      if (this.handleSinging(cleanText, isFinal)) return;
      const recent = this.hear(cleanText, isFinal);
      if (await this.followReading(recent)) return;
      if (isFinal && !(await this.findQuote(recent, cleanText))) {
        this.askAssistant(cleanText);
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
    const sung = this.hearLyrics(text, isFinal);
    if (this.liveLyrics) {
      const next = this.lyrics.follow(this.liveLyrics.slides, this.liveLyrics.index, sung);
      if (next !== null && next !== this.liveLyrics.index) {
        this.liveLyrics = { ...this.liveLyrics, index: next };
        this.forgetLyricWords();
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
  private async handleNavigationCommands(text: string): Promise<boolean> {
    if (!this.currentVerse) {
      return false;
    }

    if (isNextVerseCommand(text)) {
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
      this.heardWords = [...this.heardWords, ...sentence.slice(this.usedWords)].slice(-40);
      this.partialWords = [];
      this.usedWords = 0;
      return this.heardWords;
    }
    this.partialWords = sentence;
    return [...this.heardWords, ...sentence.slice(this.usedWords)].slice(-40);
  }

  /** After the screen changes, only words spoken from now on count. */
  private forgetHeardWords(): void {
    this.heardWords = [];
    this.usedWords = this.partialWords.length;
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
    this.triggerVerseDetected(verse, { method: 'explicit', confidence: 'medium', engine: this.currentEngine });
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
    this.triggerVerseDetected(verse, { method: 'explicit', confidence: 'medium', engine: this.currentEngine });
    return true;
  }

  /** A verse quoted without its reference: shown if clearly matched, otherwise offered to the operator. */
  private async findQuote(recent: string[], heard: string): Promise<boolean> {
    const index = scriptureIndex();
    if (!index) return false;
    // The last sentence or two: enough for a quote, without older words competing with it
    const spoken = recent.slice(-18);
    // Still reading the verse on screen: not a new quote (and not a question for the AI)
    if (this.currentVerse && index.wordsFrom(this.currentVerse, spoken) >= 2) return true;
    const match = index.findQuote(spoken, this.currentVerse);
    if (!match) return false;
    const verse = await BibleParser.getVerse(match.ref.book, match.ref.chapter, match.ref.verse);
    if (!verse) return false;
    const key = `${verse.book}:${verse.chapter}:${verse.verse}`;
    if (key === this.lastDisplayedKey) return true;
    const info: DetectionInfo = { method: 'description', description: heard, confidence: match.strong ? 'high' : 'medium', engine: this.currentEngine };
    if (match.strong) {
      this.triggerVerseDetected(verse, info);
    } else if (this.lastSuggestedKey !== key || Date.now() - this.lastSuggestedAt > this.dedupeWindowMs) {
      this.lastSuggestedKey = key;
      this.lastSuggestedAt = Date.now();
      // The words stay: if the rest of the quote follows, the verse is then shown
      this.options.onVerseSuggested?.(verse, info);
    }
    return true;
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
  private askAssistant(text: string): void {
    const assistant = this.options.assistant;
    const context = this.recentFinals;
    this.rememberFinal(text);
    if (!assistant?.shouldAsk(text)) return;

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

    const info: DetectionInfo = { method: 'description', description: heard, confidence, engine: 'ai' };

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
    this.currentVerse = verse;
    this.lastPartialReference = null;
    this.partialMatchCount = 0;
    this.forgetHeardWords();
    const p = this.passage;
    if (p && (verse.book !== p.book || verse.chapter !== p.chapter || verse.verse < p.from || verse.verse > p.to)) {
      this.setPassage(null);
    }

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
    this.songMode = false;
    this.liveLyrics = null;
    this.forgetLyricWords();
  }
}
