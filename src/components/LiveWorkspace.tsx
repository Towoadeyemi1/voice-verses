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

  const speech = useRef<ISpeechProvider | null>(null);
  const controller = useRef<VerseDetectionController | null>(null);

  // Library: songs and services
  const loadLibrary = () => {
    ServiceStorage.getMedia()
      .then((items) => {
        const list = items.filter((m) => m.type === 'song' && m.lyrics).sort((a, b) => a.name.localeCompare(b.name));
        setSongs(list);
        controller.current?.setSongLibrary(list.map((m) => ({ id: m.id, title: m.name, lyrics: m.lyrics ?? '' })));
      })
      .catch(() => {});
    ServiceStorage.getServices()
      .then((all) => setServices(all.filter((s) => !s.isTemplate)))
      .catch(() => {});
  };
  useEffect(loadLibrary, []);
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
      if (item.slide.type === 'lyrics' && c && index >= 0) {
        controller.current?.setLiveLyrics(c.slides.map((s) => (s.type === 'lyrics' ? s.content : '')), index);
      } else {
        controller.current?.setLiveLyrics(null);
      }
      setPreview(c && index >= 0 && c.slides[index + 1] ? { slide: c.slides[index + 1] } : null);
    }
    setPreviewSuggestionId(undefined);
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
        o.kind === s.kind && (o.kind === 'song' ? o.songId === (s as typeof o).songId : sameVerse(o.verse, (s as typeof o).verse));
      const kept = prev.filter((o) => !same(o) && now - o.at < 120_000);
      const score = (o: LiveSuggestion) => (o.kind === 'song' ? 0.8 : o.score);
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
    } else {
      setPreview(songForSuggestion(s)?.item ?? null);
    }
  };

  const sendSuggestion = (s: LiveSuggestion) => {
    setSuggestions((prev) => prev.filter((o) => o.id !== s.id));
    if (s.kind === 'verse') {
      goLive({ verse: s.verse });
    } else {
      const found = songForSuggestion(s);
      controller.current?.setSongMode(true);
      if (found) goLive(found.item, { within: found.within });
    }
  };

  // ---- Listening --------------------------------------------------------------

  // The detector's callbacks are made once per listening session; they call the latest versions of these
  const handlers = useRef({ present, addSuggestion, collection });
  handlers.current = { present, addSuggestion, collection };

  const startListening = async () => {
    const settings = loadSpeechSettings();
    if (settings.speechEngine === 'openai' && !(await hasSecret('openai'))) {
      setShowApiKey(true);
      return;
    }
    try {
      setConnecting(true);
      const detector = new VerseDetectionController({
        onVerseDetected: (verse) => handlers.current.present({ verse }, { fromDetector: true }),
        onTranscriptUpdate: setTranscript,
        onPassageChange: setPassage,
        onSongModeChange: setSongMode,
        onReadingProgress: (p) => setReading({ verse: p.verse, word: p.word }),
        onSongSuggested: (match) =>
          handlers.current.addSuggestion({ id: `song-${match.song.id}-${Date.now()}`, kind: 'song', songId: match.song.id, title: match.song.title, heard: match.heard }),
        onLyricsMove: (index) => {
          const c = handlers.current.collection;
          if (c?.kind === 'slides' && c.slides[index]) handlers.current.present({ slide: c.slides[index] }, { fromDetector: true });
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
    return (
      services.find((s) => new Date(s.date).toDateString() === today) ??
      services.find((s) => s.id === lastId) ??
      [...services].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    );
  }, [services]);
  const [nowMinutes, setNowMinutes] = useState(() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; });
  useEffect(() => {
    const timer = setInterval(() => { const d = new Date(); setNowMinutes(d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60); }, 15000);
    return () => clearInterval(timer);
  }, []);
  const end = serviceEnd(service, nowMinutes);

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
  const nextLabel = !preview
    ? sendMode === 'auto' ? 'what comes next appears here' : 'waits here for Take'
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
          heard={listening ? `…${transcript.split(' ').slice(-16).join(' ')}` : undefined}
          onSearch={() => setShowPalette(true)}
        >
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
