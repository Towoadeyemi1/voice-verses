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
import { isReadingNextVerse } from './readAlong';
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
  
  // Dedupe settings
  dedupeWindowMs?: number;      // Ignore same verse within this window (default: 10000ms)
  debounceMs?: number;          // Minimum time between any verse triggers (default: 500ms)
  requireStablePartials?: boolean; // Require reference in 2 consecutive partials (default: true)
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
  private assistantRequest: AbortController | null = null;
  private lastSuggestedKey: string | null = null;
  private lastSuggestedAt = 0;
  
  private dedupeWindowMs: number;
  private debounceMs: number;
  private requireStablePartials: boolean;

  constructor(private options: VerseDetectionOptions) {
    this.dedupeWindowMs = options.dedupeWindowMs ?? 10000;
    this.debounceMs = options.debounceMs ?? 500;
    this.requireStablePartials = options.requireStablePartials ?? true;
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

    if (!reference) {
      // No reference found: a navigation command, the next verse being read aloud, or a described passage
      if (await this.handleNavigationCommands(cleanText)) return;
      if (isFinal && !(await this.followReading(cleanText))) {
        this.askAssistant(cleanText);
      }
      return;
    }

    if (isFinal) this.rememberFinal(cleanText);

    console.log('Extracted reference:', reference);

    // For partial transcripts, require stability before triggering
    if (!isFinal && this.requireStablePartials) {
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
    }
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

  /** Moves to the next verse when the preacher reads it aloud. Returns true if it did. */
  private async followReading(text: string): Promise<boolean> {
    if (!this.currentVerse) return false;
    const next = await BibleParser.getVerse(this.currentVerse.book, this.currentVerse.chapter, this.currentVerse.verse + 1);
    if (!next || !isReadingNextVerse(text, this.currentVerse.text, next.text)) return false;
    this.triggerVerseDetected(next, { method: 'explicit', confidence: 'medium', engine: this.currentEngine });
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
    this.lastSuggestedKey = null;
    this.lastDisplayedKey = null;
    this.lastDisplayedAt = 0;
    this.lastTriggerAt = 0;
    this.lastPartialReference = null;
    this.partialMatchCount = 0;
    this.currentVerse = null;
  }
}
