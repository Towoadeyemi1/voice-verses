import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Send, Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { BibleVerse, DisplayedVerse } from '@/types/bible';
import { MediaItem, Service, ServiceSubsection, Slide } from '@/types/service';
import { syncService } from '@/lib/syncService';
import { BibleParser } from '@/lib/bibleParser';
import { ServiceStorage } from '@/lib/serviceStorage';
import { buildSongSlides, ccliLicence } from '@/lib/songs';
import { plainVerseText } from '@/lib/verseText';
import { sendVerseToProPresenter } from '@/lib/proPresenter';
import { hasSecret } from '@/lib/secrets';
import { desktop } from '@/lib/desktop';
import { loadSendMode, saveSendMode, SendMode } from '@/lib/sendMode';
import { useLibraryUpdated } from '@/hooks/use-library-updated';
import { useLive } from '@/hooks/use-live';
import { useCountdown } from '@/hooks/use-countdown';
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
import { OutputContent } from './OutputContent';
import { ScaledStage } from './ScaledStage';
import { ConfidenceScreen, loadConfidenceSettings } from './ConfidenceScreen';
import { SettingsPanel } from './SettingsPanel';
import { ApiKeyDialog } from './ApiKeyDialog';
import { TopBar } from './live/TopBar';
import { LibraryPanel } from './live/LibraryPanel';
import { SlideGrid, GridItem } from './live/SlideGrid';
import { ReadingFollower } from './live/ReadingFollower';
import { ScreenView } from './live/ScreenView';
import { LiveSuggestion, SuggestionsPanel } from './live/SuggestionsPanel';

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
 * The live workspace, laid out like ProPresenter: the library on the left,
 * the slides of what is loaded in the middle with the reading follower under
 * them, and on the right what is in Preview, what is Live, the other screens,
 * the suggestions and the transcript.
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

  const items: GridItem[] = useMemo(() => {
    if (!collection) return [];
    if (collection.kind === 'chapter') {
      return collection.verses.map((v) => ({ key: verseKey(v), label: `${v.book} ${v.chapter}:${v.verse}`, text: `${v.verse}  ${plainVerseText(v.text)}` }));
    }
    return collection.slides.map((s, i) => ({
      key: s.id,
      label: s.type === 'lyrics' ? s.sectionLabel ?? `Slide ${i + 1}` : s.title || `Slide ${i + 1}`,
      text: slideText(s),
    }));
  }, [collection]);

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
    setCollection({ kind: 'slides', title: `${service.name} — ${item.name}`, slides: item.slides });
    setPreview(item.slides[0] ? { slide: item.slides[0] } : null);
  };

  const pickGrid = (index: number, forceLive: boolean) => {
    const item = itemAt(collection, index);
    if (!item) return;
    if (forceLive || sendMode === 'auto') goLive(item);
    else setPreview(item);
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
  const handlers = useRef({ present, addSuggestion, collection, items });
  handlers.current = { present, addSuggestion, collection, items };

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

  const keys = useRef({ sendPreview, step, preview });
  keys.current = { sendPreview, step, preview };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      // Tabs, lists and menus use the arrow keys themselves
      if (target?.closest('[role="tab"],[role="option"],[role="menuitem"],[role="listbox"],[role="radio"]')) return;
      if (document.querySelector('[role="dialog"]')) return;
      // A button clicked last keeps the focus: Space/Enter still mean Send/next here, not "press it again"
      if (target?.tagName === 'BUTTON') target.blur();
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
  const followed = reading?.verse ?? liveVerse;
  const readingWord = reading && followed && reading.verse === followed ? reading.word : -1;
  const liveProgress = useMemo(() => {
    if (!reading || !liveVerse || !sameVerse(reading.verse, liveVerse)) return 0;
    const total = readingTokens(liveVerse.text).length;
    return total ? (reading.word + 1) / total : 0;
  }, [reading, liveVerse]);

  const gridTitle = !collection
    ? 'Nothing loaded'
    : collection.kind === 'chapter'
      ? `${collection.book} ${collection.chapter} · ${BibleParser.getVersionLabel()}`
      : collection.title;

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <TopBar
        listening={listening}
        connecting={connecting}
        volume={volume}
        muted={muted}
        songMode={songMode}
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
        onOpenOutputs={() => navigate('/display-manager')}
        onSettings={() => setShowSettings(true)}
      />

      <ResizablePanelGroup direction="horizontal" autoSaveId="vv-live-columns" className="flex-1 min-h-0">
        <ResizablePanel defaultSize={19} minSize={13} className="p-2 pr-1">
          <LibraryPanel
            chapter={collection?.kind === 'chapter' ? { book: collection.book, chapter: collection.chapter } : liveVerse ? { book: liveVerse.book, chapter: liveVerse.chapter } : null}
            recent={recent}
            songs={songs}
            services={services}
            onSearch={search}
            onChapter={(book, chapter) => loadChapter(book, chapter)}
            onVerse={(verse) => present({ verse })}
            onSong={loadSong}
            onServiceItem={loadServiceItem}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={51} minSize={30}>
          <ResizablePanelGroup direction="vertical" autoSaveId="vv-live-center">
            <ResizablePanel defaultSize={66} minSize={25} className="p-2 px-1">
              <SlideGrid title={gridTitle} items={items} liveKey={keyOf(live)} previewKey={keyOf(preview)} onPick={pickGrid} />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={34} minSize={15}>
              <ResizablePanelGroup direction="horizontal" autoSaveId="vv-live-bottom">
                <ResizablePanel defaultSize={58} minSize={30} className="p-2 px-1">
                  <ReadingFollower
                    verse={followed}
                    word={readingWord}
                    passage={passage}
                    listening={listening}
                    onStep={step}
                    onEndPassage={() => controller.current?.endPassage()}
                    transcript={listening ? transcript : undefined}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={42} minSize={25} className="p-2 px-1">
                  <div className="h-full flex flex-col rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suggestions</span>
                      {songMode && <span className="text-xs text-primary whitespace-nowrap">· song: scripture paused</span>}
                      <span className="ml-auto text-[11px] text-muted-foreground truncate">{sendMode === 'auto' ? 'sent by itself only at 99%+' : 'nothing is sent without you'}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 min-h-0">
                      <SuggestionsPanel
                        suggestions={suggestions}
                        previewId={previewSuggestionId}
                        onPreview={previewSuggestion}
                        onSend={sendSuggestion}
                        onDismiss={(s) => setSuggestions((prev) => prev.filter((o) => o.id !== s.id))}
                      />
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={30} minSize={20} className="p-2 pl-1">
          <div className="h-full overflow-y-auto space-y-3 pr-1">
            <ScreenView
              label="PREVIEW"
              tone="preview"
              live={preview}
              empty={sendMode === 'auto' ? 'Next up appears here' : 'Detected scripture waits here'}
              actions={
                <Button size="sm" className="h-7 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!preview} onClick={sendPreview} title="Send to the screens (Space)">
                  <Send className="w-3.5 h-3.5" />Send
                </Button>
              }
            />
            <ScreenView
              label="LIVE"
              tone="live"
              live={live}
              logo={logo}
              countdown={countdown}
              remaining={remaining}
              empty="Nothing on screen"
              progress={liveProgress}
              actions={
                <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={clearText} title="Take the text off the screens">
                  <Eraser className="w-3.5 h-3.5" />Clear
                </Button>
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Lower third</p>
                <ScaledStage className="aspect-video rounded border border-border/50">
                  <OutputContent live={logo !== null ? null : live} output="stream" countdown={countdown} remaining={remaining} />
                </ScaledStage>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Confidence</p>
                <ScaledStage className="aspect-video bg-black rounded border border-border/50">
                  <ConfidenceScreen settings={loadConfidenceSettings()} style={{ width: 1920, height: 1080 }} />
                </ScaledStage>
              </div>
            </div>

          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

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
