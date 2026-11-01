import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronDown, PanelLeft, Search, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BibleVerse, DisplayedVerse } from '@/types/bible';
import { MediaItem, Service, ServiceSubsection, Slide } from '@/types/service';
import { syncService } from '@/lib/syncService';
import { BibleParser } from '@/lib/bibleParser';
import { LAST_SERVICE_KEY, ServiceStorage } from '@/lib/serviceStorage';
import { buildSongSlides, ccliLicence } from '@/lib/songs';
import { addLine, captureSlide, draftLyrics, draftTitle } from '@/lib/spontaneousSong';
import { SAMPLES_CHANGED } from '@/lib/samples/seed';
import { DEMO_STEPS } from '@/lib/demoScript';
import { WelcomePane } from './live/WelcomePane';
import { loadCrossReferences } from '@/lib/crossReferences';
import { predictNext } from '@/lib/predictNext';
import type { ScriptureHint } from '@/speech/scriptureHints';
import { plainVerseText } from '@/lib/verseText';
import { sendVerseToProPresenter } from '@/lib/proPresenter';
import { hasSecret } from '@/lib/secrets';
import { desktop } from '@/lib/desktop';
import { loadSendMode, saveSendMode, SendMode } from '@/lib/sendMode';
import { showLogo } from '@/lib/showLogo';
import { templateFor } from '@/lib/templates';
import { withTeamColors } from '@/lib/colorTeams';
import { useLibraryUpdated } from '@/hooks/use-library-updated';
import { useLive } from '@/hooks/use-live';
import { useCountdown } from '@/hooks/use-countdown';
import { useTemplates } from '@/hooks/use-templates';
import { useColorTeam } from '@/hooks/use-color-team';
import { verseAssistantOptions } from '@/ai/detectionOptions';
import {
  createSpeechProvider,
  getEngineDisplayName,
  ISpeechProvider,
  loadSpeechSettings,
  VerseDetectionController,
} from '@/speech';
import type { Passage } from '@/speech/VerseDetectionController';
import { readingTokens } from '@/speech/readingTracker';
import type { Live } from './OutputContent';
import { SettingsPanel } from './SettingsPanel';
import { ApiKeyDialog } from './ApiKeyDialog';
import { CountdownControl } from './CountdownControl';
import { AlertControl } from './AlertControl';
import { LibraryPanel } from './live/LibraryPanel';
import { StatusCapsule } from './live/StatusCapsule';
import { ServiceTimeline, serviceEnd } from './live/ServiceTimeline';
import { NowPane, Step } from './live/NowPane';
import { SuggestionBar, LiveSuggestion } from './live/SuggestionBar';
import { ScreensColumn } from './live/ScreensColumn';
import { CommandPalette, PaletteAction } from './live/CommandPalette';

/** What is loaded in the middle: a chapter of the Bible, or slides (a song, a service item). */
type Collection =
  | { kind: 'chapter'; book: string; chapter: number; verses: BibleVerse[] }
  | { kind: 'slides'; title: string; slides: Slide[] };

const verseKey = (v: { book: string; chapter: number; verse: number }) => `v:${v.book}:${v.chapter}:${v.verse}`;
const keyOf = (item: Live): string | undefined => (!item ? undefined : 'verse' in item ? verseKey(item.verse) : item.slide.id);
const sameVerse = (a: BibleVerse, b: BibleVerse) => a.book === b.book && a.chapter === b.chapter && a.verse === b.verse;

function slideText(slide: Slide): string {
  switch (slide.type) {
    case 'lyrics':
      return slide.content;
    case 'scripture':
      return `${slide.title}\n${plainVerseText(slide.verse.text)}`;
    case 'announcement':
      return `${slide.title}\n${slide.content}`;
    case 'image':
      return `🖼 ${slide.caption || slide.title}`;
    case 'video':
      return `🎬 ${slide.title}`;
    default:
      return slide.title || '(blank)';
  }
}

/** Translations read from the internet: the grid shows the KJV's words, and the verse is fetched when used. */
const isOnlineVersion = () => BibleParser.isOnline(BibleParser.getVersion());

/** A chapter's verses in the translation in use (an online one is fetched once for the whole chapter). */
async function chapterVerses(book: string, chapter: number): Promise<BibleVerse[]> {
  const count = await BibleParser.getChapterLength(book, chapter);
  const verses = await Promise.all(Array.from({ length: count }, (_, i) => BibleParser.getVerse(book, chapter, i + 1)));
  return verses.filter((v): v is BibleVerse => !!v);
}

/**
 * The live screen (design 4, docs/DESIGN_SYSTEM.md): one status at the top,
 * the order of service as a timeline, what is being said or sung large in the
 * middle with what comes next faded below it and one suggestion at a time,
 * and the screens on the right like a switcher (Live, Take, Next). On a wide
 * monitor the library opens as a column; otherwise it slides in.
 */
export const LiveWorkspace = () => {
  const navigate = useNavigate();
  const { live, logo } = useLive();
    const { countdown, remaining } = useCountdown();

  const [sendMode, setSendModeState] = useState<SendMode>(loadSendMode);
  const [preview, setPreview] = useState<Live>(null);
  const [previewSuggestionId, setPreviewSuggestionId] = useState<string | undefined>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [recent, setRecent] = useState<BibleVerse[]>([]);
  const [songs, setSongs] = useState<MediaItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [suggestions, setSuggestions] = useState<(LiveSuggestion & { at: number })[]>([]);
  const [reading, setReading] = useState<{ verse: BibleVerse; word: number } | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [songMode, setSongMode] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [volume, setVolume] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<string | undefined>();
  /** A new song being sung (spontaneous worship), its words going on screen as they are sung */
  const [capture, setCapture] = useState<{ id: string; lines: string[] } | null>(null);
  const captureRef = useRef(capture);
  captureRef.current = capture;
  /** Predictive Next: the likely verse waiting in Next, and why */
  const [prediction, setPrediction] = useState<{ key: string; reason: string; heard: string } | null>(null);

  const speech = useRef<ISpeechProvider | null>(null);
  const controller = useRef<VerseDetectionController | null>(null);

  // Library: songs and services
  const loadLibrary = () => {
    ServiceStorage.getMedia()
      .then((items) => {
        const all = items.filter((m) => m.type === 'song' && m.lyrics);
        // A sample hymn the church also has in its own library: keep the church's copy only
        const own = new Set(all.filter((m) => !m.tags?.includes('sample')).map((m) => m.name.toLowerCase()));
        const list = all.filter((m) => !m.tags?.includes('sample') || !own.has(m.name.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
        setSongs(list);
        controller.current?.setSongLibrary(list.map((m) => ({ id: m.id, title: m.name, lyrics: m.lyrics ?? '' })));
      })
      .catch(() => {});
    ServiceStorage.getServices()
      .then((all) => setServices(all.filter((s) => !s.isTemplate)))
      .catch(() => {});
  };
  useEffect(loadLibrary, []);
  useEffect(() => {
    window.addEventListener(SAMPLES_CHANGED, loadLibrary);
    return () => window.removeEventListener(SAMPLES_CHANGED, loadLibrary);
  }, []);
  useLibraryUpdated(loadLibrary);

  const setSendMode = (mode: SendMode) => {
    setSendModeState(mode);
    saveSendMode(mode);
    toast.info(mode === 'auto' ? 'Auto send: scripture goes straight to the screens' : 'Preview first: check, then press Send (Space)');
  };

  // ---- Collections ----------------------------------------------------------

  const loadChapter = async (book: string, chapter: number) => {
    if (collection?.kind === 'chapter' && collection.book === book && collection.chapter === chapter) return collection;
    const verses = await chapterVerses(book, chapter);
    if (!verses.length) return null;
    const next: Collection = { kind: 'chapter', book: verses[0].book, chapter, verses };
    setCollection(next);
    return next;
  };

  const itemAt = (c: Collection | null, index: number): Live => {
    if (!c) return null;
    if (c.kind === 'chapter') return c.verses[index] ? { verse: c.verses[index] } : null;
    return c.slides[index] ? { slide: c.slides[index] } : null;
  };
  const indexOf = (c: Collection | null, item: Live): number => {
    const key = keyOf(item);
    if (!c || !key) return -1;
    return c.kind === 'chapter' ? c.verses.findIndex((v) => verseKey(v) === key) : c.slides.findIndex((s) => s.id === key);
  };

  // ---- Going live -----------------------------------------------------------

  /** Puts an item on the screens. After it, the next item waits in Preview. */
  const goLive = async (item: Live, opts: { fromDetector?: boolean; within?: Collection; capturing?: boolean } = {}) => {
    if (!item) return;
    // Anything else going on screen ends a capture (and keeps what was sung)
    if (captureRef.current && !opts.capturing) void stopCapture();
    if ('verse' in item) {
      const verse = isOnlineVersion() ? (await BibleParser.getVerse(item.verse.book, item.verse.chapter, item.verse.verse)) ?? item.verse : item.verse;
      const shown: DisplayedVerse = { ...verse, timestamp: new Date() };
      syncService.broadcast({ type: 'VERSE_UPDATE', data: { verse: shown, timestamp: shown.timestamp } });
      sendVerseToProPresenter(verse);
      setRecent((prev) => [verse, ...prev.filter((v) => !sameVerse(v, verse))].slice(0, 30));
      if (!opts.fromDetector) controller.current?.follow(verse);
      controller.current?.setLiveLyrics(null);
      setSuggestions((prev) => prev.filter((s) => s.kind !== 'verse' || !sameVerse(s.verse, verse)));
      const c = await loadChapter(verse.book, verse.chapter);
      const next = c?.kind === 'chapter' ? c.verses.find((v) => v.verse === verse.verse + 1) : undefined;
      setPreview(next ? { verse: next } : null);
    } else {
      const from = opts.within ?? collection;
      const c = from?.kind === 'slides' ? from : null;
      const index = c ? c.slides.findIndex((s) => s.id === item.slide.id) : -1;
      syncService.broadcast({
        type: 'SLIDE_UPDATE',
        data: { slide: item.slide, index, slideIndex: index, upcoming: c && index >= 0 ? c.slides.slice(index + 1, index + 4) : [], timestamp: new Date() },
      });
      // A song being captured is not followed: its words are what is being sung
      if (item.slide.type === 'lyrics' && c && index >= 0 && !opts.capturing) {
        controller.current?.setLiveLyrics(
          c.slides.map((s) => (s.type === 'lyrics' ? s.content : '')),
          index,
          c.slides.map((s) => (s.type === 'lyrics' ? s.sectionLabel ?? '' : '')),
        );
      } else {
        controller.current?.setLiveLyrics(null);
      }
      setPreview(c && index >= 0 && c.slides[index + 1] ? { slide: c.slides[index + 1] } : null);
    }
    setPreviewSuggestionId(undefined);
    setPrediction(null);
  };

  /** Detected or chosen: on screen straight away (Auto send), or into Preview to check first. */
  const present = async (item: Live, opts: { fromDetector?: boolean } = {}) => {
    if (!item) return;
    if (sendMode === 'auto') return goLive(item, opts);
    if ('verse' in item) await loadChapter(item.verse.book, item.verse.chapter);
    setPreview(item);
  };

  const sendPreview = () => preview && goLive(preview);

  const clearText = () => {
    syncService.broadcast({ type: 'SLIDE_UPDATE', data: { slide: null, index: -1, slideIndex: -1, upcoming: [], timestamp: new Date() } });
    controller.current?.setLiveLyrics(null);
  };

  /** Previous / next item after what is live (verse or slide). */
  const step = async (direction: 1 | -1) => {
    const index = indexOf(collection, live);
    if (index < 0) {
      // A verse outside what is loaded: step through its chapter
      if (live && 'verse' in live) {
        const verse = await BibleParser.getVerse(live.verse.book, live.verse.chapter, live.verse.verse + direction);
        if (verse) goLive({ verse });
      }
      return;
    }
    const next = itemAt(collection, index + direction);
    if (next) goLive(next);
  };

  // ---- Library actions --------------------------------------------------------

  const search = async (text: string): Promise<boolean> => {
    const verse = await BibleParser.parseReference(text);
    if (!verse) return false;
    await loadChapter(verse.book, verse.chapter);
    // A chapter ("Psalm 23") loads it with its first verse ready in Preview; a verse is presented
    if (/^\s*[1-3]?\s*[a-z ]+\s+\d+\s*$/i.test(text)) setPreview({ verse });
    else present({ verse });
    return true;
  };

  const songSlides = (song: MediaItem) =>
    buildSongSlides(
      { title: song.name, lyrics: song.lyrics ?? '', author: song.author, copyright: song.copyright, ccliNumber: song.ccliNumber, arrangement: song.arrangement },
      { linesPerSlide: 2, licence: ccliLicence() },
    );

  const loadSong = (song: MediaItem): Collection & { kind: 'slides' } => {
    const slides = songSlides(song);
    const loaded = { kind: 'slides' as const, title: song.name, slides };
    setCollection(loaded);
    setPreview(slides[0] ? { slide: slides[0] } : null);
    return loaded;
  };

  const loadServiceItem = (service: Service, item: ServiceSubsection) => {
    setCurrentItemId(item.id);
    setCollection({ kind: 'slides', title: item.name, slides: item.slides });
    setPreview(item.slides[0] ? { slide: item.slides[0] } : null);
  };

  // ---- Suggestions ----------------------------------------------------------

  const addSuggestion = (s: LiveSuggestion) =>
    setSuggestions((prev) => {
      const now = Date.now();
      const same = (o: LiveSuggestion) =>
        o.kind === s.kind &&
        (o.kind === 'song' ? o.songId === (s as typeof o).songId : o.kind === 'verse' ? sameVerse(o.verse, (s as typeof o).verse) : true);
      const kept = prev.filter((o) => !same(o) && now - o.at < 120_000);
      const score = (o: LiveSuggestion) => (o.kind === 'verse' ? o.score : 0.8);
      return [{ ...s, at: now }, ...kept].sort((a, b) => b.at - a.at || score(b) - score(a)).slice(0, 6);
    });

  const songForSuggestion = (s: Extract<LiveSuggestion, { kind: 'song' }>) => {
    const song = songs.find((m) => m.id === s.songId);
    if (!song) return null;
    const loaded = loadSong(song);
    const index = Math.max(0, loaded.slides.findIndex((sl) => sl.type === 'lyrics' && s.heard && sl.content.includes(s.heard)));
    return loaded.slides[index] ? { item: { slide: loaded.slides[index] }, within: loaded } : null;
  };

  const previewSuggestion = async (s: LiveSuggestion) => {
    setPreviewSuggestionId(s.id);
    if (s.kind === 'verse') {
      await loadChapter(s.verse.book, s.verse.chapter);
      setPreview({ verse: s.verse });
    } else if (s.kind === 'song') {
      setPreview(songForSuggestion(s)?.item ?? null);
    } else {
      startCapture(s.lines);
    }
  };

  const sendSuggestion = (s: LiveSuggestion) => {
    setSuggestions((prev) => prev.filter((o) => o.id !== s.id));
    if (s.kind === 'verse') {
      goLive({ verse: s.verse });
    } else if (s.kind === 'new-song') {
      startCapture(s.lines);
    } else {
      const found = songForSuggestion(s);
      controller.current?.setSongMode(true);
      if (found) goLive(found.item, { within: found.within });
    }
  };

  // ---- Spontaneous worship: a new song, shown as it is sung and kept as a draft ----

  /** Shows the newest captured lines and the whole song so far in the middle. */
  const showCapture = (next: { id: string; lines: string[] }) => {
    const title = 'Sung live';
    const slides = next.lines
      .map((_, i) => (i % 2 === 1 || i === next.lines.length - 1 ? captureSlide(next.lines.slice(0, i + 1), title, next.id) : null))
      .filter((x): x is NonNullable<typeof x> => !!x);
    const latest = slides[slides.length - 1];
    if (!latest) return;
    const loaded = { kind: 'slides' as const, title: 'New song, sung live', slides };
    setCollection(loaded);
    goLive({ slide: latest }, { within: loaded, capturing: true });
  };

  const startCapture = (lines: string[]) => {
    setSuggestions((prev) => prev.filter((o) => o.kind !== 'new-song'));
    const next = { id: `sung-${Date.now()}`, lines: lines.reduce(addLine, [] as string[]) };
    setCapture(next);
    captureRef.current = next;
    controller.current?.setSongMode(true);
    controller.current?.setCapturing(true);
    showCapture(next);
  };

  const captureLine = (text: string) => {
    const current = captureRef.current;
    if (!current) return;
    const lines = addLine(current.lines, text);
    if (lines === current.lines) return;
    const next = { ...current, lines };
    setCapture(next);
    captureRef.current = next;
    showCapture(next);
  };

  /** Stops capturing and keeps what was sung as a draft song in the library. */
  const stopCapture = async () => {
    const current = captureRef.current;
    if (!current) return;
    setCapture(null);
    captureRef.current = null;
    controller.current?.setCapturing(false);
    if (current.lines.length < 2) return;
    const { lyrics, arrangement } = draftLyrics(current.lines);
    const day = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    const title = draftTitle(current.lines);
    const song: MediaItem = {
      id: `song-sung-${Date.now()}`,
      type: 'song',
      name: `${title} (sung live, ${day})`,
      category: 'Drafts',
      tags: ['draft', 'sung live'],
      lyrics,
      arrangement,
      author: 'Sung live; check the words and add the writer',
      createdAt: new Date(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await ServiceStorage.saveMediaItem(song);
      loadLibrary();
      toast.success(`Saved “${title}” as a draft song`, { description: 'Find it in Media → Songs to check the words before next week.' });
    } catch {
      toast.error('Could not save the new song', { description: 'The words are still on screen; copy them from the middle before closing.' });
    }
  };

  // ---- Predictive Next -----------------------------------------------------------

  /**
   * The preacher hinted where they are going next ("Paul says the same thing in Romans"):
   * the likely verse waits in Next, from today's plan and cross-references. Never sent by itself.
   */
  const predict = async (hint: ScriptureHint) => {
    if (previewSuggestionId || captureRef.current) return; // the operator chose what is in Next, or a song is being captured
    await loadCrossReferences().catch(() => {});
    const outline = (service?.sections ?? []).flatMap((sec) =>
      sec.subsections.flatMap((item) => item.slides.flatMap((sl) => (sl.type === 'scripture' ? [sl.verse] : []))),
    );
    const [best] = predictNext({ books: hint.books, live: liveVerse, recent: recent.filter((v) => !liveVerse || !sameVerse(v, liveVerse)), outline });
    if (!best) return;
    const verse = await BibleParser.getVerse(best.book, best.chapter, best.verse);
    if (!verse) return;
    await loadChapter(verse.book, verse.chapter);
    setPreview({ verse });
    setPrediction({ key: verseKey(verse), reason: best.reason, heard: hint.heard });
  };

  // Singing is over (song mode off): keep what was sung
  useEffect(() => {
    if (!songMode && captureRef.current) void stopCapture();
  }, [songMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Listening --------------------------------------------------------------

  // The detector's callbacks are made once per listening session; they call the latest versions of these
  const handlers = useRef({ present, addSuggestion, collection, captureLine, predict });
  handlers.current = { present, addSuggestion, collection, captureLine, predict };

  // ---- The demo: a scripted sermon and worship set through the real detector ----------

  const [demo, setDemo] = useState<{ caption: string; mode: SendMode } | null>(null);
  const suggestionsRef = useRef(suggestions);
  suggestionsRef.current = suggestions;
  const demoRun = useRef(0);

  const stopDemo = (finished = false) => {
    demoRun.current++;
    setDemo((d) => {
      if (d) setSendMode(d.mode);
      return null;
    });
    controller.current?.reset();
    controller.current = null;
    setTranscript('');
    setSongMode(false);
    if (finished) toast.success('That was the demo', { description: 'Press Start listening to do the same with your microphone.', duration: 8000 });
  };

  const startDemo = async () => {
    if (listening || demo) return;
    const run = ++demoRun.current;
    const wait = (ms: number) => new Promise<boolean>((done) => window.setTimeout(() => done(demoRun.current === run), ms));
    setDemo({ caption: 'Starting the demo', mode: sendMode });
    setSendMode('auto');
    const detector = createDetector();
    for (const step of DEMO_STEPS) {
      if (demoRun.current !== run) return;
      if (step.kind === 'caption') setDemo((d) => (d ? { ...d, caption: step.text } : d));
      if (step.kind === 'say') {
        await detector.onTranscript(step.text, false);
        if (!(await wait(350))) return;
        await detector.onTranscript(step.text, true);
      }
      if (step.kind === 'read') {
        // A few words at a time, as speech recognition gives them
        const words = step.text.split(' ');
        for (let i = 3; i < words.length; i += 3) {
          await detector.onTranscript(words.slice(0, i).join(' '), false);
          if (!(await wait(260))) return;
        }
        await detector.onTranscript(step.text, true);
      }
      if (step.kind === 'take') {
        const offered = suggestionsRef.current.find((x) => x.kind === 'verse');
        if (offered) sendSuggestion(offered);
      }
      if (step.kind === 'song') {
        const song = songs.find((m) => m.id === step.songId) ?? songs[0];
        if (song) {
          const loaded = loadSong(song);
          await goLive({ slide: loaded.slides[0] }, { within: loaded });
          detector.setSongMode(true);
        }
      }
      if (!(await wait(step.wait))) return;
    }
    if (demoRun.current === run) stopDemo(true);
  };

  /** The detector, wired to this screen (used for listening, and for the demo). */
  const createDetector = () => {
    const detector = new VerseDetectionController({
      onVerseDetected: (verse) => handlers.current.present({ verse }, { fromDetector: true }),
      onTranscriptUpdate: setTranscript,
      onPassageChange: setPassage,
      onSongModeChange: setSongMode,
      onReadingProgress: (p) => setReading({ verse: p.verse, word: p.word }),
      onSongSuggested: (match) =>
        handlers.current.addSuggestion({ id: `song-${match.song.id}-${Date.now()}`, kind: 'song', songId: match.song.id, title: match.song.title, heard: match.heard }),
      onScriptureHint: (hint) => void handlers.current.predict(hint),
      onNewSinging: (lines) => handlers.current.addSuggestion({ id: `new-song-${Date.now()}`, kind: 'new-song', lines }),
      onCapturedLine: (line) => handlers.current.captureLine(line),
      onLyricsMove: (index, cue) => {
        const c = handlers.current.collection;
        if (c?.kind !== 'slides' || !c.slides[index]) return;
        handlers.current.present({ slide: c.slides[index] }, { fromDetector: true });
        if (cue) {
          const slide = c.slides[index];
          const where = cue.kind === 'top' ? 'the start' : slide.type === 'lyrics' && slide.sectionLabel ? slide.sectionLabel : `slide ${index + 1}`;
          toast(`Heard “${cue.heard}”`, { description: `Went to ${where}`, duration: 2500 });
        }
      },
      ...verseAssistantOptions(
        (verse) => handlers.current.present({ verse }),
        (verse, info) =>
          handlers.current.addSuggestion({ id: `verse-${verseKey(verse)}-${Date.now()}`, kind: 'verse', verse, byAi: info.engine === 'ai', score: info.score ?? 0.5, heard: info.description }),
      ),
    });
    controller.current = detector;
    detector.setSongMode(songMode);
    detector.setSongLibrary(songs.map((m) => ({ id: m.id, title: m.name, lyrics: m.lyrics ?? '' })));
    return detector;
  };

  const startListening = async () => {
    if (demo) stopDemo();
    const settings = loadSpeechSettings();
    if (settings.speechEngine === 'openai' && !(await hasSecret('openai'))) {
      setShowApiKey(true);
      return;
    }
    try {
      setConnecting(true);
      const detector = createDetector();
      if (live && 'verse' in live) detector.follow(live.verse);

      settings.language = localStorage.getItem('transcription_language') || 'en';
      speech.current = createSpeechProvider(settings, {
        onTranscript: (text, isFinal) => controller.current?.onTranscript(text, isFinal),
        onVolumeUpdate: (v) => {
          setVolume(v);
          loudest.current = Math.max(loudest.current, v);
        },
        onError: (error) => toast.error('Speech recognition error', { description: error.message }),
      });
      detector.setEngine(settings.speechEngine);
      await speech.current.init();
      setListening(true);
      desktop?.setListening(true);
      toast.success('Listening', { description: `Using ${getEngineDisplayName(settings)}` });
    } catch (error) {
      const blocked = desktop?.microphone && ['denied', 'restricted'].includes(await desktop.microphone.status().catch(() => ''));
      toast.error(blocked ? 'The computer is not letting Voice Verses use the microphone' : 'Could not start listening', {
        description: blocked
          ? 'Switch Voice Verses on in the microphone privacy settings (if it is on, switch it off and on again), then press Start listening.'
          : error instanceof Error ? error.message : String(error),
        duration: 15000,
        action: blocked
          ? { label: 'Open microphone settings', onClick: () => void desktop?.microphone?.openSettings() }
          : { label: 'Listening settings', onClick: () => openListeningSettings() },
      });
      stopListening(true);
    } finally {
      setConnecting(false);
    }
  };

  const [settingsPane, setSettingsPane] = useState<'bible' | 'listening'>('bible');
  const openListeningSettings = () => {
    setSettingsPane('listening');
    setShowSettings(true);
  };

  // No sound at all for 10 seconds after listening starts: say so, rather than seeming to work
  const loudest = useRef(0);
  useEffect(() => {
    if (!listening) return;
    loudest.current = 0;
    const timer = window.setTimeout(() => {
      if (loudest.current < 2 && !muted) {
        toast.warning('No sound is reaching Voice Verses', {
          description: 'Check the input and channel in Settings → Listening: the sound check there shows which channel moves.',
          duration: 15000,
          action: { label: 'Listening settings', onClick: () => openListeningSettings() },
        });
      }
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [listening]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = (quiet = false) => {
    speech.current?.disconnect();
    speech.current = null;
    controller.current?.reset();
    controller.current = null;
    setListening(false);
    setVolume(0);
    setMuted(false);
    setPassage(null);
    desktop?.setListening(false);
    if (!quiet) toast.info('Listening stopped');
  };

  useEffect(() => () => stopListening(true), []);

  const toggleSong = () => {
    if (controller.current) controller.current.setSongMode(!songMode);
    else setSongMode(!songMode);
  };

  // ---- Keyboard ---------------------------------------------------------------

  const keys = useRef({ sendPreview, step, preview, clearText });
  keys.current = { sendPreview, step, preview, clearText };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowPalette(true);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      // Tabs, lists and menus use the arrow keys themselves
      if (target?.closest('[role="tab"],[role="option"],[role="menuitem"],[role="listbox"],[role="radio"]')) return;
      if (document.querySelector('[role="dialog"]')) return;
      // A button clicked last keeps the focus: Space/Enter still mean Send/next here, not "press it again"
      if (target?.tagName === 'BUTTON') target.blur();
      if (e.key === 'Escape') {
        keys.current.clearText();
        e.preventDefault();
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        if (keys.current.preview) keys.current.sendPreview();
        else keys.current.step(1);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') keys.current.step(1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') keys.current.step(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---- Layout -----------------------------------------------------------------

  const liveVerse = live && 'verse' in live ? live.verse : null;
  const previewVerse = preview && 'verse' in preview ? preview.verse : null;
  const liveProgress = useMemo(() => {
    if (!reading || !liveVerse || !sameVerse(reading.verse, liveVerse)) return 0;
    const total = readingTokens(liveVerse.text).length;
    return total ? (reading.word + 1) / total : 0;
  }, [reading, liveVerse]);

  // The service on today (or the one opened last), for the timeline
  const service = useMemo(() => {
    if (!services.length) return null;
    const today = new Date().toDateString();
    const lastId = localStorage.getItem(LAST_SERVICE_KEY);
    const opened = services.find((s) => s.id === lastId);
    // The church's own services come first; the samples only while there are none
    const own = services.filter((s) => !s.sample);
    const pool = own.length ? own : services;
    return (
      pool.find((s) => new Date(s.date).toDateString() === today) ??
      opened ??
      [...pool].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    );
  }, [services]);
  // Opening the app: the service's first slide waits in Next, so the screens show the design straight away
  const primed = useRef(false);
  useEffect(() => {
    if (primed.current || !service || live || preview || collection) return;
    const first = service.sections.flatMap((sec) => sec.subsections).find((item) => item.slides.length);
    if (!first) return;
    primed.current = true;
    setCurrentItemId(first.id);
    setPreview({ slide: first.slides[0] });
  }, [service]); // eslint-disable-line react-hooks/exhaustive-deps

  const [nowMinutes, setNowMinutes] = useState(() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; });
  useEffect(() => {
    const timer = setInterval(() => { const d = new Date(); setNowMinutes(d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60); }, 15000);
    return () => clearInterval(timer);
  }, []);
  // When it ends, and how far over it runs; only on the day, while it can still be running (not for samples)
  const planned = serviceEnd(service, nowMinutes);
  const onTheDay = service && !service.sample && new Date(service.date).toDateString() === new Date().toDateString();
  const end = planned && (planned.over === 0 || (onTheDay && planned.over <= 90)) ? planned : null;

  // What fills the middle: a passage being read, a song or other slides
  const now = useMemo(() => {
    const status = !listening ? 'start listening to follow the reader' : reading && reading.word >= 0 ? 'following the reader' : 'waiting for the reading';
    if (collection?.kind === 'chapter') {
      const inChapter = (v: BibleVerse | null) => v && v.book === collection.book && v.chapter === collection.chapter;
      const focus = (inChapter(liveVerse) ? liveVerse : inChapter(previewVerse) ? previewVerse : collection.verses[0]) as BibleVerse;
      const inPassage = passage && passage.book === collection.book && passage.chapter === collection.chapter;
      const from = inPassage ? passage.from : Math.max(1, focus.verse - 3);
      const to = inPassage ? passage.to : Math.min(collection.verses.length, from + 8);
      const steps: Step[] = collection.verses
        .filter((v) => v.verse >= from && v.verse <= to)
        .map((v) => ({
          key: verseKey(v),
          label: String(v.verse),
          state: liveVerse && sameVerse(v, liveVerse) ? 'live' : previewVerse && sameVerse(v, previewVerse) ? 'next' : liveVerse && inChapter(liveVerse) && v.verse < liveVerse.verse ? 'done' : '',
        }));
      const word = reading && sameVerse(reading.verse, focus) ? reading.word : -1;
      const nextVerse = previewVerse && !sameVerse(previewVerse, focus) ? previewVerse : null;
      return {
        title: inPassage ? `${collection.book} ${collection.chapter}:${passage.from}–${passage.to}` : `${collection.book} ${collection.chapter}`,
        sub: `${BibleParser.getVersionLabel()} · ${status}`,
        steps,
        stepItems: steps.map((st) => ({ verse: collection.verses.find((v) => verseKey(v) === st.key)! }) as Live),
        verse: focus,
        word,
        text: null as string | null,
        next: nextVerse ? { label: nextVerse.chapter === focus.chapter ? `verse ${nextVerse.verse}` : `${nextVerse.book} ${nextVerse.chapter}:${nextVerse.verse}`, text: plainVerseText(nextVerse.text) } : null,
      };
    }
    if (collection?.kind === 'slides') {
      const liveIndex = live && 'slide' in live ? collection.slides.findIndex((sl) => sl.id === live.slide.id) : -1;
      const previewIndex = preview && 'slide' in preview ? collection.slides.findIndex((sl) => sl.id === preview.slide.id) : -1;
      const focusIndex = liveIndex >= 0 ? liveIndex : previewIndex >= 0 ? previewIndex : 0;
      const label = (sl: Slide, i: number) => {
        if (sl.type !== 'lyrics') return String(i + 1);
        const name = sl.sectionLabel ?? '';
        const m = name.match(/^(verse|chorus|bridge|pre-?chorus|tag|outro|intro|ending)\s*(\d*)/i);
        if (!m) return name ? name.slice(0, 3) : String(i + 1);
        const short = { verse: 'V', chorus: 'C', bridge: 'B', prechorus: 'PC', 'pre-chorus': 'PC', tag: 'T', outro: 'O', intro: 'I', ending: 'E' }[m[1].toLowerCase()] ?? m[1][0];
        return `${short}${m[2]}`;
      };
      // A section over several slides: V1.1, V1.2…
      const labels = collection.slides.map(label);
      const numbered = labels.map((l, i) => {
        let before = 0;
        while (i - before - 1 >= 0 && labels[i - before - 1] === l) before++;
        let after = 0;
        while (i + after + 1 < labels.length && labels[i + after + 1] === l) after++;
        return before + after > 0 && collection.slides[i].type === 'lyrics' ? `${l}.${before + 1}` : l;
      });
      const steps: Step[] = collection.slides.map((sl, i) => ({
        key: sl.id,
        label: numbered[i],
        state: i === liveIndex ? 'live' : i === previewIndex ? 'next' : liveIndex >= 0 && i < liveIndex ? 'done' : '',
      }));
      const focus = collection.slides[focusIndex];
      const nextSlide = previewIndex >= 0 && previewIndex !== focusIndex ? collection.slides[previewIndex] : null;
      return {
        title: collection.title,
        sub: songMode ? 'following the singers' : `${collection.slides.length} slide${collection.slides.length === 1 ? '' : 's'}`,
        steps,
        stepItems: collection.slides.map((sl) => ({ slide: sl }) as Live),
        verse: null as BibleVerse | null,
        word: -1,
        text: focus ? (focus.type === 'lyrics' ? focus.content : slideText(focus)) : null,
        next: nextSlide ? { label: nextSlide.type === 'lyrics' ? nextSlide.sectionLabel ?? `slide ${previewIndex + 1}` : `slide ${previewIndex + 1}`, text: slideText(nextSlide).split('\n')[0] } : null,
      };
    }
    return { title: null, sub: undefined, steps: [] as Step[], stepItems: [] as Live[], verse: liveVerse, word: -1, text: null as string | null, next: null };
  }, [collection, live, preview, liveVerse, previewVerse, passage, reading, listening, songMode]);

  const pickStep = (index: number) => {
    const item = now.stepItems[index];
    if (!item) return;
    if (sendMode === 'auto') goLive(item);
    else setPreview(item);
  };

  const describeLive = (item: Live): string => {
    if (!item) return 'Nothing on screen';
    if ('verse' in item) return `${item.verse.book} ${item.verse.chapter}:${item.verse.verse}`;
    const sl = item.slide;
    return sl.type === 'lyrics' ? `${sl.songTitle}${sl.sectionLabel ? ` · ${sl.sectionLabel}` : ''}` : sl.title || 'Slide';
  };
  const predicted = prediction && preview && 'verse' in preview && verseKey(preview.verse) === prediction.key;
  const nextLabel = !preview
    ? sendMode === 'auto' ? 'what comes next appears here' : 'waits here for Take'
    : predicted
      ? `${describeLive(preview)} · likely next (${prediction.reason.charAt(0).toLowerCase()}${prediction.reason.slice(1)}) · Take to show it`
      : `${describeLive(preview)} · ${sendMode === 'auto' && 'verse' in preview && liveVerse ? 'goes up when this verse ends' : 'waiting for Take'}`;

  const doing = songMode
    ? 'following the singers'
    : passage
      ? `following ${passage.book} ${passage.chapter}`
      : liveVerse
        ? `following ${liveVerse.book} ${liveVerse.chapter}`
        : 'waiting for scripture';

  // The live look's colours light the window softly
  const { templates, assignments } = useTemplates();
  const team = useColorTeam();
  const look = withTeamColors(templateFor(templates, assignments, 'projection', live && 'slide' in live && live.slide.type === 'lyrics' ? 'lyrics' : 'scripture'), team);
  const glowA = look.background.color;
  const glowB = look.background.gradient?.to ?? team.colors.primary;

  const paletteActions: PaletteAction[] = [
    { id: 'clear', label: 'Clear the words off the screens', hint: 'Esc', icon: 'clear', run: clearText },
    { id: 'logo', label: 'Show the logo', icon: 'logo', run: () => showLogo(service?.id) },
    listening
      ? { id: 'stop', label: 'Stop listening', icon: 'mic', run: () => stopListening() }
      : { id: 'listen', label: 'Start listening', icon: 'mic', run: startListening },
    { id: 'song', label: songMode ? 'Back to scripture (song mode off)' : 'Song mode: follow the singing', icon: 'song', run: toggleSong },
    { id: 'mode', label: sendMode === 'auto' ? 'Ask before showing verses' : 'Show verses by themselves (Auto)', icon: 'timer', run: () => setSendMode(sendMode === 'auto' ? 'preview' : 'auto') },
    { id: 'screens', label: 'Screens: where each output goes', icon: 'screens', run: () => navigate('/display-manager') },
    { id: 'settings', label: 'Settings', icon: 'settings', run: () => setShowSettings(true) },
  ];

  const library = (
    <LibraryPanel
      chapter={collection?.kind === 'chapter' ? { book: collection.book, chapter: collection.chapter } : liveVerse ? { book: liveVerse.book, chapter: liveVerse.chapter } : null}
      recent={recent}
      songs={songs}
      services={services}
      onSearch={search}
      onChapter={(book, chapter) => loadChapter(book, chapter)}
      onVerse={(verse) => present({ verse })}
      onSong={(song) => { loadSong(song); setShowLibrary(false); }}
      onServiceItem={(svc, item) => { loadServiceItem(svc, item); setShowLibrary(false); }}
    />
  );

  return (
    <div className="relative h-screen min-h-[640px] grid grid-rows-[64px_auto_minmax(0,1fr)] grid-cols-[minmax(0,1fr)] bg-background text-foreground overflow-hidden max-[1000px]:h-auto max-[1000px]:overflow-visible">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.22] transition-[background] duration-1000"
        style={{ background: `radial-gradient(45% 60% at 82% 40%, ${glowA}, transparent 70%), radial-gradient(35% 45% at 72% 95%, ${glowB}, transparent 70%)` }}
        aria-hidden="true"
      />

      {/* Top bar: the service, the one status, the clock */}
      <header className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6">
        <div className="flex items-center gap-2 min-w-0">
          <button type="button" onClick={() => setShowLibrary(true)} className="min-[1900px]:hidden w-10 h-10 rounded-xl grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground" title="Library: Bible, songs and services" aria-label="Library">
            <PanelLeft className="w-5 h-5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex items-center gap-2.5 min-w-0 rounded-xl px-2 py-1 hover:bg-muted text-left" title="Go to another page">
                <img src={`${import.meta.env.BASE_URL}cornerstone-logo.png`} alt="" className="w-8 h-8 object-contain flex-shrink-0" />
                <span className="min-w-0 leading-tight">
                  <b className="block text-[15px] font-semibold tracking-[-0.01em] truncate">{service?.name ?? 'Voice Verses'}</b>
                  <span className="block text-[13px] text-muted-foreground truncate">{service ? new Date(service.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Live'}</span>
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onSelect={() => navigate('/service-planner')}>Plan services</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/presenter')}>Presenter</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/media-library')}>Pictures, videos and songs</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/templates')}>Looks and colour teams</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/display-manager')}>Screens</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setShowSettings(true)}>Settings</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <StatusCapsule
          listening={listening}
          connecting={connecting}
          volume={volume}
          muted={muted}
          songMode={songMode}
          doing={doing}
          sendMode={sendMode}
          onListen={startListening}
          onStop={() => stopListening()}
          onToggleMute={() => {
            const next = !muted;
            setMuted(next);
            speech.current?.setMicrophoneMuted(next);
          }}
          onToggleSong={toggleSong}
          onSendMode={setSendMode}
        />

        <div className="flex items-center justify-end gap-1.5">
          <button type="button" onClick={() => setShowPalette(true)} className="w-10 h-10 rounded-xl grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground" title="Find a verse, song or action (⌘K)" aria-label="Search">
            <Search className="w-5 h-5" />
          </button>
          <AlertControl className="h-9 hidden xl:flex" />
          <CountdownControl className="h-9 hidden xl:flex" />
          <button type="button" onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-xl grid place-items-center text-muted-foreground hover:bg-muted hover:text-foreground" title="Settings" aria-label="Settings">
            <Settings className="w-5 h-5" />
          </button>
          <div className="text-right leading-tight ml-2">
            <b className="block text-xl font-semibold tabular-nums tracking-[-0.01em]">{new Date(0, 0, 0, Math.floor(nowMinutes / 60), Math.floor(nowMinutes % 60)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</b>
            {end && <span className={`text-[12.5px] ${end.over > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>{end.over > 0 ? `${end.over} min over` : `ends ${end.ends}`}</span>}
          </div>
        </div>
      </header>

      <nav className="relative px-6 pt-1 pb-4" aria-label="Order of service">
        <ServiceTimeline service={service} currentId={currentItemId} now={nowMinutes} onPick={(item) => service && loadServiceItem(service, item)} onPlan={() => navigate('/service-planner')} />
      </nav>

      <div className="relative min-h-0 grid grid-cols-[minmax(0,1fr)_clamp(380px,33vw,720px)] min-[1900px]:grid-cols-[300px_minmax(0,1fr)_clamp(560px,34vw,900px)] max-[1000px]:grid-cols-1">
        <aside className="hidden min-[1900px]:block min-h-0 pl-6 pb-5" aria-label="Library">{library}</aside>

        <NowPane
          title={now.title}
          sub={now.sub}
          steps={now.steps}
          onStep={pickStep}
          verse={now.verse}
          word={now.word}
          text={now.text}
          next={now.next}
          heard={listening || demo ? `…${transcript.split(' ').slice(-16).join(' ')}` : undefined}
          onSearch={() => setShowPalette(true)}
          empty={
            !collection && !live ? (
              <WelcomePane
                service={service}
                listening={listening}
                demoPlaying={!!demo}
                onItem={loadServiceItem}
                onListen={startListening}
                onDemo={startDemo}
                onVerse={(r) => void search(r)}
                onSearch={() => setShowPalette(true)}
                onPlan={() => navigate('/service-planner')}
              />
            ) : undefined
          }
        >
          {demo && (
            <div className="flex flex-wrap items-center gap-3 p-3 pl-4 rounded-[18px] bg-card shadow-[0_1px_1px_rgba(0,0,0,.3),0_12px_36px_rgba(0,0,0,.35)]" data-demo>
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse-soft flex-shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[15px] font-semibold">Demo: {demo.caption}</p>
                <p className="m-0 text-[13px] text-muted-foreground">Played through the real listening engine, as if it had been heard. It uses the real screens.</p>
              </div>
              <button type="button" onClick={() => stopDemo()} className="h-9 px-3.5 rounded-xl bg-muted text-sm font-semibold hover:bg-muted/70">
                Stop the demo
              </button>
            </div>
          )}
          {capture && (
            <div className="flex flex-wrap items-center gap-3 p-3 pl-4 rounded-[18px] bg-card shadow-[0_1px_1px_rgba(0,0,0,.3),0_12px_36px_rgba(0,0,0,.35)]" data-capture>
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse-soft flex-shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[15px] font-semibold">Showing a new song as it is sung</p>
                <p className="m-0 text-[13px] text-muted-foreground">
                  {capture.lines.length} {capture.lines.length === 1 ? 'line' : 'lines'} so far. It is kept as a draft song when you stop.
                </p>
              </div>
              <button type="button" onClick={() => void stopCapture()} className="h-9 px-3.5 rounded-xl bg-primary/20 text-sm font-semibold hover:bg-primary/30">
                Stop and save
              </button>
            </div>
          )}
          <SuggestionBar
            suggestions={suggestions}
            inNextId={previewSuggestionId}
            onUse={previewSuggestion}
            onShowNow={sendSuggestion}
            onDismiss={(s) => setSuggestions((prev) => prev.filter((o) => o.id !== s.id))}
          />
        </NowPane>

        <ScreensColumn
          live={live}
          logo={logo}
          next={preview}
          countdown={countdown}
          remaining={remaining}
          liveLabel={describeLive(live)}
          nextLabel={nextLabel}
          progress={liveProgress}
          onTake={() => (preview ? sendPreview() : step(1))}
          onClear={clearText}
          onLogo={() => showLogo(service?.id)}
        />
      </div>

      <Sheet open={showLibrary} onOpenChange={setShowLibrary}>
        <SheetContent side="left" className="w-[360px] sm:max-w-[360px] p-4 pt-12">
          <SheetTitle className="sr-only">Library</SheetTitle>
          {library}
        </SheetContent>
      </Sheet>

      <CommandPalette
        open={showPalette}
        onOpenChange={setShowPalette}
        songs={songs}
        service={service}
        actions={paletteActions}
        onReference={search}
        onSong={loadSong}
        onServiceItem={(item) => service && loadServiceItem(service, item)}
      />

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-6xl p-0 overflow-hidden gap-0 [&>button.absolute]:hidden">
          <DialogTitle className="sr-only">Settings</DialogTitle>
          <SettingsPanel onClose={() => setShowSettings(false)} key={settingsPane} initial={settingsPane} />
        </DialogContent>
      </Dialog>
      <ApiKeyDialog
        open={showApiKey}
        onClose={(saved) => {
          setShowApiKey(false);
          if (saved) startListening();
        }}
      />
    </div>
  );
};
