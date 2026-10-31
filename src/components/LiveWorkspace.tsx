import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { BibleVerse, DisplayedVerse } from '@/types/bible';
import { MediaItem, Service, Slide } from '@/types/service';
import { syncService } from '@/lib/syncService';
import { BibleParser } from '@/lib/bibleParser';
import { ServiceStorage } from '@/lib/serviceStorage';
import { buildSongSlides, ccliLicence } from '@/lib/songs';
import { plainVerseText } from '@/lib/verseText';
import { clearProPresenter, sendVerseToProPresenter } from '@/lib/proPresenter';
import { endsAtFor, startCountdown, stopCountdown } from '@/lib/countdown';
import { hasSecret } from '@/lib/secrets';
import { desktop } from '@/lib/desktop';
import { loadSendMode, saveSendMode, SendMode } from '@/lib/sendMode';
import { loadTheme, setTheme as saveTheme, Theme } from '@/lib/theme';
import { useLibraryUpdated } from '@/hooks/use-library-updated';
import { useLive } from '@/hooks/use-live';
import { useCountdown } from '@/hooks/use-countdown';
import { verseAssistantOptions } from '@/ai/detectionOptions';
import { createSpeechProvider, getEngineDisplayName, ISpeechProvider, loadSpeechSettings, VerseDetectionController } from '@/speech';
import type { Passage } from '@/speech/VerseDetectionController';
import { readingTokens } from '@/speech/readingTracker';
import type { Live } from './OutputContent';
import { OutputContent } from './OutputContent';
import { ScaledStage } from './ScaledStage';
import { ConfidenceScreen, loadConfidenceSettings } from './ConfidenceScreen';
import { CountdownControl } from './CountdownControl';
import { SettingsPanel } from './SettingsPanel';
import { ApiKeyDialog } from './ApiKeyDialog';
import { ScreenStatus, TopBar } from './live/TopBar';
import { Cue, cuesFor, RunningOrder } from './live/RunningOrder';
import { CommandPalette, PaletteAction } from './live/CommandPalette';
import { ReadingPanel } from './live/ReadingPanel';
import { SlidesPanel } from './live/SlidesPanel';
import { ScreenView } from './live/ScreenView';
import { LiveSuggestion, SuggestionStrip } from './live/SuggestionStrip';

/** What is loaded in the middle: a chapter of the Bible, or slides (a song, a service item). */
type Collection =
  | { kind: 'chapter'; book: string; chapter: number; verses: BibleVerse[] }
  | { kind: 'slides'; title: string; slides: Slide[]; cueId?: string; badge?: string };

const verseKey = (v: { book: string; chapter: number; verse: number }) => `v:${v.book}:${v.chapter}:${v.verse}`;
const keyOf = (item: Live): string | undefined => (!item ? undefined : 'verse' in item ? verseKey(item.verse) : item.slide.id);
const sameVerse = (a: BibleVerse, b: BibleVerse) => a.book === b.book && a.chapter === b.chapter && a.verse === b.verse;
const SERVICE_KEY = 'voice-verses-live-service';
const slideCaption = (slide: Slide) =>
  slide.type === 'lyrics' ? [slide.songTitle, slide.sectionLabel].filter(Boolean).join(' · ') : slide.title || 'Slide';

/** Translations read from the internet: the steps use the KJV's text, and the verse is fetched when used. */
const isOnlineVersion = () => ['esv', 'nlt'].includes(BibleParser.getVersion());

async function chapterVerses(book: string, chapter: number): Promise<BibleVerse[]> {
  if (isOnlineVersion()) {
    const books = await BibleParser.getOfflineBooks('kjv');
    const b = books.find((x) => x.name.toLowerCase() === book.toLowerCase());
    return (b?.chapters[chapter - 1] ?? []).map((text, i) => ({ book: b!.name, chapter, verse: i + 1, text }));
  }
  const count = await BibleParser.getChapterLength(book, chapter);
  const verses = await Promise.all(Array.from({ length: count }, (_, i) => BibleParser.getVerse(book, chapter, i + 1)));
  return verses.filter((v): v is BibleVerse => !!v);
}

/** Today's service: one dated today, else the next one coming, else the latest. */
function pickService(services: Service[]): string | null {
  const saved = localStorage.getItem(SERVICE_KEY);
  if (saved && services.some((s) => s.id === saved)) return saved;
  const day = (d: Date | string) => new Date(d).toDateString();
  const today = services.find((s) => day(s.date) === new Date().toDateString());
  if (today) return today.id;
  const upcoming = services.filter((s) => new Date(s.date) >= new Date()).sort((a, b) => +new Date(a.date) - +new Date(b.date))[0];
  return (upcoming ?? [...services].sort((a, b) => +new Date(b.date) - +new Date(a.date))[0])?.id ?? null;
}

/**
 * The live screen. The service runs across the top; the middle shows what is
 * happening (the reading while preaching, the song while singing, the slides
 * for anything else); Live and Next sit on the right; one search reaches
 * everything (Ctrl+K).
 */
export const LiveWorkspace = () => {
  const { live, logo } = useLive();
  const { countdown, remaining } = useCountdown();

  const [sendMode, setSendModeState] = useState<SendMode>(loadSendMode);
  const [theme, setThemeState] = useState<Theme>(loadTheme);
  const [next, setNext] = useState<Live>(null);
  const [nextSuggestionId, setNextSuggestionId] = useState<string | undefined>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [why, setWhy] = useState<string | undefined>();
  const [recent, setRecent] = useState<BibleVerse[]>([]);
  const [songs, setSongs] = useState<MediaItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<(LiveSuggestion & { at: number })[]>([]);
  const [reading, setReading] = useState<{ verse: BibleVerse; word: number } | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [songMode, setSongMode] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [volume, setVolume] = useState(0);
  const [muted, setMuted] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [screens, setScreens] = useState<ScreenStatus[]>([]);

  const speech = useRef<ISpeechProvider | null>(null);
  const controller = useRef<VerseDetectionController | null>(null);

  // ---- Library: songs and services ---------------------------------------------

  const loadLibrary = () => {
    ServiceStorage.getMedia()
      .then((items) => {
        const list = items.filter((m) => m.type === 'song' && m.lyrics).sort((a, b) => a.name.localeCompare(b.name));
        setSongs(list);
        controller.current?.setSongLibrary(list.map((m) => ({ id: m.id, title: m.name, lyrics: m.lyrics ?? '' })));
      })
      .catch(() => {});
    ServiceStorage.getServices()
      .then((all) => {
        const list = all.filter((s) => !s.isTemplate).sort((a, b) => +new Date(b.date) - +new Date(a.date));
        setServices(list);
        setServiceId((current) => (current && list.some((s) => s.id === current) ? current : pickService(list)));
      })
      .catch(() => {});
  };
  useEffect(loadLibrary, []);
  useLibraryUpdated(loadLibrary);

  // Which screens are set up (desktop app)
  useEffect(() => {
    desktop?.screens
      .get()
      .then((c) => setScreens([{ label: 'Projector', on: c.projection != null }, { label: 'Stage', on: c.confidence != null }, { label: 'Stream', on: c.lowerThird != null }]))
      .catch(() => {});
  }, []);

  const service = services.find((s) => s.id === serviceId);
  const cues = useMemo(() => cuesFor(service), [service]);

  const chooseService = (id: string) => {
    setServiceId(id);
    localStorage.setItem(SERVICE_KEY, id);
  };

  // ---- Collections ----------------------------------------------------------------

  const loadChapter = async (book: string, chapter: number) => {
    if (collection?.kind === 'chapter' && collection.book.toLowerCase() === book.toLowerCase() && collection.chapter === chapter) return collection;
    const verses = await chapterVerses(book, chapter);
    if (!verses.length) return null;
    const loaded: Collection = { kind: 'chapter', book: verses[0].book, chapter, verses };
    setCollection(loaded);
    return loaded;
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

  // ---- Going live -----------------------------------------------------------------

  /** Puts an item on the screens; the item after it waits in Next. */
  const goLive = async (item: Live, opts: { fromDetector?: boolean; within?: Collection } = {}) => {
    if (!item) return;
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
      const after = c?.kind === 'chapter' ? c.verses.find((v) => v.verse === verse.verse + 1) : undefined;
      setNext(after ? { verse: after } : null);
    } else {
      const from = opts.within ?? collection;
      const c = from?.kind === 'slides' ? from : null;
      const index = c ? c.slides.findIndex((s) => s.id === item.slide.id) : -1;
      syncService.broadcast({
        type: 'SLIDE_UPDATE',
        data: { slide: item.slide, index, slideIndex: index, upcoming: c && index >= 0 ? c.slides.slice(index + 1, index + 4) : [], timestamp: new Date() },
      });
      if (item.slide.type === 'lyrics' && c && index >= 0) controller.current?.setLiveLyrics(c.slides.map((s) => (s.type === 'lyrics' ? s.content : '')), index);
      else controller.current?.setLiveLyrics(null);
      setNext(c && index >= 0 && c.slides[index + 1] ? { slide: c.slides[index + 1] } : null);
    }
    setNextSuggestionId(undefined);
  };

  /** Detected or chosen: on screen straight away (Auto send), or into Next to check first. */
  const present = async (item: Live, opts: { fromDetector?: boolean } = {}) => {
    if (!item) return;
    if (sendMode === 'auto') return goLive(item, opts);
    if ('verse' in item) await loadChapter(item.verse.book, item.verse.chapter);
    setNext(item);
  };

  const sendNext = () => next && goLive(next);

  const clearText = () => {
    syncService.broadcast({ type: 'SLIDE_UPDATE', data: { slide: null, index: -1, slideIndex: -1, upcoming: [], timestamp: new Date() } });
    controller.current?.setLiveLyrics(null);
    clearProPresenter();
  };
  const showLogo = (black = false) => {
    syncService.showLogo(black ? '' : localStorage.getItem('global-service-logo') || '');
    stopCountdown();
    clearProPresenter();
    controller.current?.setLiveLyrics(null);
  };

  /** Previous / next item after what is live (verse or slide). */
  const step = async (direction: 1 | -1) => {
    const index = indexOf(collection, live);
    if (index < 0) {
      if (live && 'verse' in live) {
        const verse = await BibleParser.getVerse(live.verse.book, live.verse.chapter, live.verse.verse + direction);
        if (verse) goLive({ verse });
      }
      return;
    }
    const item = itemAt(collection, index + direction);
    if (item) goLive(item);
  };

  // ---- Loading things -------------------------------------------------------------

  const songSlides = (song: MediaItem) =>
    buildSongSlides(
      { title: song.name, lyrics: song.lyrics ?? '', author: song.author, copyright: song.copyright, ccliNumber: song.ccliNumber, arrangement: song.arrangement },
      { linesPerSlide: 2, licence: ccliLicence() },
    );

  const loadSong = (song: MediaItem, reason?: string) => {
    const slides = songSlides(song);
    const loaded = { kind: 'slides' as const, title: song.name, slides, badge: song.ccliNumber ? `CCLI #${song.ccliNumber}` : undefined };
    setCollection(loaded);
    setWhy(reason);
    setNext(slides[0] ? { slide: slides[0] } : null);
    return loaded;
  };

  const loadCue = (cue: Cue) => {
    const loaded = { kind: 'slides' as const, title: cue.item.name, slides: cue.item.slides, cueId: cue.item.id, badge: cue.section };
    setCollection(loaded);
    setWhy(undefined);
    setNext(cue.item.slides[0] ? { slide: cue.item.slides[0] } : null);
  };

  const chooseVerse = async (verse: BibleVerse, reason?: string) => {
    await loadChapter(verse.book, verse.chapter);
    setWhy(reason);
    present({ verse });
  };

  const pickSlide = (index: number, forceLive: boolean) => {
    const item = itemAt(collection, index);
    if (!item) return;
    if (forceLive || sendMode === 'auto') goLive(item);
    else setNext(item);
  };

  // ---- Suggestions ----------------------------------------------------------------

  const addSuggestion = (s: LiveSuggestion) =>
    setSuggestions((prev) => {
      const now = Date.now();
      const same = (o: LiveSuggestion) =>
        o.kind === s.kind && (o.kind === 'song' ? o.songId === (s as typeof o).songId : sameVerse(o.verse, (s as typeof o).verse));
      const score = (o: LiveSuggestion) => (o.kind === 'song' ? 0.8 : o.score);
      return [{ ...s, at: now }, ...prev.filter((o) => !same(o) && now - o.at < 120_000)].sort((a, b) => score(b) - score(a)).slice(0, 6);
    });

  const songForSuggestion = (s: Extract<LiveSuggestion, { kind: 'song' }>) => {
    const song = songs.find((m) => m.id === s.songId);
    if (!song) return null;
    const loaded = loadSong(song, `Recognised from the words “${s.heard}”`);
    const index = Math.max(0, loaded.slides.findIndex((sl) => sl.type === 'lyrics' && s.heard && sl.content.includes(s.heard)));
    return loaded.slides[index] ? { item: { slide: loaded.slides[index] } as Live, within: loaded } : null;
  };

  const pickSuggestion = async (s: LiveSuggestion) => {
    setNextSuggestionId(s.id);
    if (s.kind === 'verse') {
      await loadChapter(s.verse.book, s.verse.chapter);
      setWhy(`Sounds like it (${Math.round(s.score * 100)}%)`);
      setNext({ verse: s.verse });
    } else {
      setNext(songForSuggestion(s)?.item ?? null);
    }
  };

  const sendSuggestion = (s: LiveSuggestion) => {
    setSuggestions((prev) => prev.filter((o) => o.id !== s.id));
    if (s.kind === 'verse') {
      setWhy(`Sounds like it (${Math.round(s.score * 100)}%)`);
      goLive({ verse: s.verse });
    } else {
      const found = songForSuggestion(s);
      controller.current?.setSongMode(true);
      if (found) goLive(found.item, { within: found.within });
    }
  };

  // ---- Listening --------------------------------------------------------------------

  // The detector's callbacks are made once per listening session; they call the latest versions of these
  const handlers = useRef({ present, addSuggestion, collection, setWhy });
  handlers.current = { present, addSuggestion, collection, setWhy };

  const startListening = async () => {
    const settings = loadSpeechSettings();
    if (settings.speechEngine === 'openai' && !(await hasSecret('openai'))) {
      setShowApiKey(true);
      return;
    }
    try {
      setConnecting(true);
      const detector = new VerseDetectionController({
        onVerseDetected: (verse, info) => {
          handlers.current.setWhy(info.method === 'explicit' ? (info.score === 1 && info.confidence !== 'medium' ? 'Reference heard' : 'Reading followed') : `Quoted (${Math.round((info.score ?? 1) * 100)}%)`);
          handlers.current.present({ verse }, { fromDetector: true });
        },
        onTranscriptUpdate: setTranscript,
        onPassageChange: setPassage,
        onSongModeChange: setSongMode,
        onReadingProgress: (p) => setReading({ verse: p.verse, word: p.word }),
        onSongSuggested: (match) =>
          handlers.current.addSuggestion({ id: `song-${match.song.id}-${Date.now()}`, kind: 'song', songId: match.song.id, title: match.song.title, heard: match.heard }),
        onLyricsMove: (index) => {
          const c = handlers.current.collection;
          if (c?.kind === 'slides' && c.slides[index]) {
            handlers.current.setWhy('Following the singing');
            handlers.current.present({ slide: c.slides[index] }, { fromDetector: true });
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
      if (live && 'verse' in live) detector.follow(live.verse);

      settings.language = localStorage.getItem('transcription_language') || 'en';
      speech.current = createSpeechProvider(settings, {
        onTranscript: (text, isFinal) => controller.current?.onTranscript(text, isFinal),
        onVolumeUpdate: setVolume,
        onError: (error) => toast.error('Speech recognition error', { description: error.message }),
      });
      detector.setEngine(settings.speechEngine);
      await speech.current.init();
      setListening(true);
      desktop?.setListening(true);
      toast.success('Listening', { description: `Using ${getEngineDisplayName(settings)}` });
    } catch (error) {
      toast.error('Could not start listening', { description: error instanceof Error ? error.message : String(error) });
      stopListening(true);
    } finally {
      setConnecting(false);
    }
  };

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
  const setSendMode = (mode: SendMode) => {
    setSendModeState(mode);
    saveSendMode(mode);
  };
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(nextTheme);
    saveTheme(nextTheme);
  };

  // ---- Search actions ----------------------------------------------------------------

  const actionsFor = (q: string): PaletteAction[] => {
    const all: PaletteAction[] = [
      { id: 'clear', label: 'Clear text', hint: 'Esc', run: clearText },
      { id: 'logo', label: 'Show the logo', run: () => showLogo() },
      { id: 'black', label: 'Black screen', run: () => showLogo(true) },
      { id: 'song', label: songMode ? 'Back to scripture (song off)' : 'Singing now (song on)', run: toggleSong },
      { id: 'auto', label: 'Auto send', run: () => setSendMode('auto') },
      { id: 'preview', label: 'Preview first', run: () => setSendMode('preview') },
      { id: 'theme', label: theme === 'dark' ? 'Light look' : 'Dark look', run: toggleTheme },
      { id: 'settings', label: 'Settings', run: () => setShowSettings(true) },
      { id: 'stop-countdown', label: 'Stop the countdown', run: stopCountdown },
    ];
    const minutes = /^(?:count ?down|timer)\s*(\d{1,3})/.exec(q)?.[1];
    if (minutes) {
      return [
        {
          id: 'countdown',
          label: `Countdown ${minutes} minutes`,
          hint: 'full screen',
          run: () => startCountdown({ message: 'Starting in', endsAt: endsAtFor({ minutes: Number(minutes) }), projector: 'full', confidence: true, stream: true }),
        },
      ];
    }
    if (!q) return all.slice(0, 3);
    return all.filter((a) => a.label.toLowerCase().includes(q) || a.id.includes(q)).slice(0, 4);
  };

  // ---- Keyboard ----------------------------------------------------------------------

  const keys = useRef({ sendNext, step, next, clearText });
  keys.current = { sendNext, step, next, clearText };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (target?.closest('[role="tab"],[role="option"],[role="menuitem"],[role="listbox"],[role="radio"],[role="combobox"]')) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (target?.tagName === 'BUTTON') target.blur();
      if (e.key === ' ' || e.key === 'Enter') {
        if (keys.current.next) keys.current.sendNext();
        else keys.current.step(1);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') keys.current.step(1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') keys.current.step(-1);
      else if (e.key === 'Escape') keys.current.clearText();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---- What to show ------------------------------------------------------------------

  const liveVerse = live && 'verse' in live ? live.verse : null;
  const nextVerse = next && 'verse' in next ? next.verse : null;
  const followed = reading?.verse ?? liveVerse;
  const readingWord = reading && followed && reading.verse === followed ? reading.word : -1;
  const liveProgress = useMemo(() => {
    if (!reading || !liveVerse || !sameVerse(reading.verse, liveVerse)) return 0;
    const total = readingTokens(liveVerse.text).length;
    return total ? (reading.word + 1) / total : 0;
  }, [reading, liveVerse]);

  // The running order's NOW: the item whose slide is live, else the one loaded
  const liveSlideId = live && 'slide' in live ? live.slide.id : undefined;
  const nowCue = cues.find((c) => liveSlideId && c.item.slides.some((s) => s.id === liveSlideId)) ?? cues.find((c) => collection?.kind === 'slides' && c.item.id === collection.cueId);
  const nowProgress = nowCue && liveSlideId ? (nowCue.item.slides.findIndex((s) => s.id === liveSlideId) + 1) / Math.max(1, nowCue.item.slides.length) : 0;

  const liveCaption = logo != null ? (logo ? 'Logo' : 'Black') : liveVerse ? `${liveVerse.book} ${liveVerse.chapter}:${liveVerse.verse} · on the screens` : live && 'slide' in live ? slideCaption(live.slide) : 'Nothing on screen';
  const inPassage = passage && nextVerse && passage.book === nextVerse.book && passage.chapter === nextVerse.chapter && nextVerse.verse <= passage.to;
  const nextCaption = !next
    ? sendMode === 'preview'
      ? 'Detected scripture waits here'
      : 'What comes next'
    : nextVerse
      ? `${nextVerse.book} ${nextVerse.chapter}:${nextVerse.verse} · ${inPassage && sendMode === 'auto' && liveVerse && listening ? `comes up at the end of verse ${liveVerse.verse}` : 'Space to send'}`
      : `${'slide' in next ? slideCaption(next.slide) : ''} · Space to send`;

  const inputName = (() => {
    const s = loadSpeechSettings();
    return s.audioChannel != null ? `ch ${s.audioChannel + 1}` : 'mic';
  })();

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <TopBar
        services={services}
        serviceId={serviceId}
        onService={chooseService}
        onSearch={() => setPaletteOpen(true)}
        listening={listening}
        connecting={connecting}
        volume={volume}
        muted={muted}
        inputName={inputName}
        songMode={songMode}
        sendMode={sendMode}
        screens={screens}
        theme={theme}
        onListen={startListening}
        onStop={() => stopListening()}
        onToggleMute={() => {
          const m = !muted;
          setMuted(m);
          speech.current?.setMicrophoneMuted(m);
        }}
        onToggleSong={toggleSong}
        onSendMode={setSendMode}
        onTheme={toggleTheme}
        onSettings={() => setShowSettings(true)}
      />

      <RunningOrder cues={cues} nowId={nowCue?.item.id} progress={nowProgress} onPick={loadCue} />

      <div className="flex-1 min-h-0 grid grid-cols-[minmax(0,1fr)_clamp(320px,28vw,460px)]">
        <section className="flex flex-col gap-3.5 p-4 min-h-0">
          {collection?.kind === 'slides' ? (
            <SlidesPanel title={collection.title} badge={collection.badge} why={why} slides={collection.slides} liveId={liveSlideId} nextId={keyOf(next)} onPick={pickSlide} />
          ) : (
            <ReadingPanel
              verse={followed}
              word={readingWord}
              passage={passage}
              chapter={collection?.kind === 'chapter' ? { book: collection.book, chapter: collection.chapter, count: collection.verses.length } : null}
              liveVerse={liveVerse}
              nextVerse={nextVerse}
              listening={listening}
              heard={transcript}
              why={why}
              onPickVerse={(n) => {
                const v = collection?.kind === 'chapter' ? collection.verses.find((x) => x.verse === n) : undefined;
                if (v) pickSlide(collection!.kind === 'chapter' ? collection.verses.indexOf(v) : -1, false);
              }}
              onChapter={async (d) => {
                if (collection?.kind !== 'chapter') return;
                const c = await loadChapter(collection.book, collection.chapter + d);
                if (c?.kind === 'chapter' && c.verses[0]) setNext({ verse: c.verses[0] });
              }}
              onEndPassage={() => controller.current?.endPassage()}
            />
          )}
          <SuggestionStrip
            suggestions={suggestions}
            selectedId={nextSuggestionId}
            note={sendMode === 'auto' ? 'Only 99%+ goes out by itself' : 'Nothing goes out without you'}
            onPick={pickSuggestion}
            onSend={sendSuggestion}
            onDismiss={(s) => setSuggestions((prev) => prev.filter((o) => o.id !== s.id))}
          />
        </section>

        <aside className="flex flex-col gap-3 p-4 pl-0 min-h-0 overflow-y-auto">
          <ScreenView
            tone="live"
            live={live}
            logo={logo}
            countdown={countdown}
            remaining={remaining}
            caption={liveCaption}
            empty="Nothing on the screens"
            progress={liveProgress}
            action={
              <button onClick={clearText} className="h-7 px-3 rounded-lg border border-border bg-muted text-xs font-semibold hover:bg-card">
                Clear
              </button>
            }
          />
          <ScreenView
            tone="next"
            live={next}
            caption={nextCaption}
            empty={sendMode === 'preview' ? 'Detected scripture waits here for you to send' : 'The next verse or slide appears here'}
            action={
              <button onClick={sendNext} disabled={!next} className="h-7 px-3.5 rounded-lg bg-next text-white text-xs font-bold disabled:opacity-40">
                Send ▸
              </button>
            }
          />
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted-foreground">Stream lower third</span>
              <ScaledStage className="aspect-video rounded-lg">
                <OutputContent live={logo != null ? null : live} output="stream" countdown={countdown} remaining={remaining} />
              </ScaledStage>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted-foreground">Stage monitor</span>
              <ScaledStage className="aspect-video bg-black rounded-lg">
                <ConfidenceScreen settings={loadConfidenceSettings()} style={{ width: 1920, height: 1080 }} />
              </ScaledStage>
            </div>
          </div>
        </aside>
      </div>

      <footer className="flex items-center gap-2 h-[52px] px-4 border-t border-border bg-card flex-shrink-0 text-[13px]">
        <button onClick={clearText} className="h-8 px-3 rounded-lg border border-border bg-muted font-semibold hover:bg-card">Clear text</button>
        <button onClick={() => showLogo()} className="h-8 px-3 rounded-lg border border-border bg-muted font-semibold hover:bg-card">Logo</button>
        <button onClick={() => showLogo(true)} className="h-8 px-3 rounded-lg border border-border bg-muted font-semibold hover:bg-card">Black</button>
        <CountdownControl className="h-8" />
        <div className="ml-auto hidden md:flex items-center gap-3.5 text-muted-foreground">
          {[
            ['Space', 'send next'],
            ['← →', 'step'],
            ['Ctrl K', 'search'],
            ['Esc', 'clear text'],
          ].map(([k, label]) => (
            <span key={k} className="flex items-center gap-1.5">
              <kbd className="font-sans text-[11px] border border-border rounded px-1.5 bg-background text-foreground">{k}</kbd>
              {label}
            </span>
          ))}
        </div>
      </footer>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        songs={songs}
        cues={cues}
        recent={recent}
        actions={actionsFor}
        onVerse={(v) => chooseVerse(v, 'Chosen in search')}
        onSong={(s) => loadSong(s, 'Chosen in search')}
        onCue={loadCue}
      />
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          <DialogTitle className="sr-only">Settings</DialogTitle>
          <SettingsPanel onClose={() => setShowSettings(false)} />
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
