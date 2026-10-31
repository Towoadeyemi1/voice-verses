import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AudioVisualizer } from './AudioVisualizer';
import { TranscriptWindow } from './TranscriptWindow';
import { VerseDisplay } from './VerseDisplay';
import { ContextTracker } from './ContextTracker';
import { SettingsPanel } from './SettingsPanel';
import { ManualSearch } from './ManualSearch';
import { DisplayMonitor } from './DisplayMonitor';
import { PageHeader } from './PageHeader';
import { ModeNav } from './ModeNav';
import { DisplayedVerse, AudioStatus, BibleVerse } from '@/types/bible';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { syncService } from '@/lib/syncService';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card } from '@/components/ui/card';
import { ApiKeyDialog } from './ApiKeyDialog';
import { Monitor, ChevronDown, ExternalLink } from 'lucide-react';
import { 
  ISpeechProvider, 
  DetectionInfo,
  createSpeechProvider, 
  loadSpeechSettings,
  getEngineDisplayName,
  VerseDetectionController 
} from '@/speech';
import { hasSecret } from '@/lib/secrets';
import { desktop } from '@/lib/desktop';
import { verseAssistantOptions } from '@/ai/detectionOptions';
import { appUrl } from '@/lib/appUrl';
import { sendVerseToProPresenter } from '@/lib/proPresenter';
import { BibleParser } from '@/lib/bibleParser';
import { ServiceStorage } from '@/lib/serviceStorage';
import { buildSongSlides, ccliLicence } from '@/lib/songs';
import { LyricsSlide, MediaItem } from '@/types/service';
import type { Passage } from '@/speech/VerseDetectionController';
import { LiveSuggestions, Suggestion } from './LiveSuggestions';
import { SongFollowPanel } from './SongFollowPanel';
import { PassageBar } from './PassageBar';

interface ControlPanelProps {
  showDisplayMonitor?: boolean;
  onToggleDisplayMonitor?: () => void;
}

export const ControlPanel = ({ showDisplayMonitor, onToggleDisplayMonitor }: ControlPanelProps) => {
  const [audioStatus, setAudioStatus] = useState<AudioStatus>({
    isListening: false,
    volume: 0,
    status: 'idle',
  });

  const [transcript, setTranscript] = useState('');
  const [currentVerse, setCurrentVerse] = useState<DisplayedVerse | null>(null);
  const [recentVerses, setRecentVerses] = useState<DisplayedVerse[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [transcriptionLanguage, setTranscriptionLanguage] = useState(() => {
    return localStorage.getItem('transcription_language') || 'en';
  });

  const speechProvider = useRef<ISpeechProvider | null>(null);
  const verseController = useRef<VerseDetectionController | null>(null);
  const [suggestions, setSuggestions] = useState<(Suggestion & { at: number })[]>([]);
  const [songMode, setSongMode] = useState(false);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [liveSong, setLiveSong] = useState<{ title: string; slides: LyricsSlide[]; index: number } | null>(null);
  const [followSinging, setFollowSinging] = useState(true);
  const songLibrary = useRef<MediaItem[]>([]);
  // The controller's callbacks are made once per listening session: they read these
  const liveSongRef = useRef(liveSong);
  liveSongRef.current = liveSong;
  const followSingingRef = useRef(followSinging);
  followSingingRef.current = followSinging;

  const addSuggestion = (suggestion: Suggestion) =>
    setSuggestions((prev) => {
      const now = Date.now();
      const same = (s: Suggestion) =>
        s.kind === suggestion.kind &&
        (s.kind === 'song' ? s.songId === (suggestion as typeof s).songId : `${s.verse.book}${s.verse.chapter}:${s.verse.verse}` === `${(suggestion as typeof s).verse.book}${(suggestion as typeof s).verse.chapter}:${(suggestion as typeof s).verse.verse}`);
      return [{ ...suggestion, at: now }, ...prev.filter((s) => !same(s) && now - s.at < 90_000)].slice(0, 3);
    });
  const dismissSuggestion = (suggestion: Suggestion) => setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));

  /** Puts slide `index` of the song on screen. */
  const broadcastSongSlide = (slides: LyricsSlide[], index: number) => {
    syncService.broadcast({
      type: 'SLIDE_UPDATE',
      data: { slide: slides[index], index, slideIndex: index, upcoming: slides.slice(index + 1, index + 4), timestamp: new Date() },
    });
  };

  const showSongSlide = (index: number) => {
    const song = liveSongRef.current;
    if (!song || !song.slides[index]) return;
    setLiveSong({ ...song, index });
    broadcastSongSlide(song.slides, index);
    verseController.current?.setLiveLyrics(song.slides.map((s) => s.content), index);
  };

  /** A library song on screen, from the slide with the words heard; singing then moves it on. */
  const showSong = async (songId: string, heard: string) => {
    const items = songLibrary.current.length ? songLibrary.current : await ServiceStorage.getMedia();
    const item = items.find((m) => m.id === songId);
    if (!item) return;
    const slides = buildSongSlides(
      { title: item.name, lyrics: item.lyrics ?? '', author: item.author, copyright: item.copyright, ccliNumber: item.ccliNumber, arrangement: item.arrangement },
      { linesPerSlide: 2, licence: ccliLicence() },
    );
    if (!slides.length) return;
    const index = Math.max(0, slides.findIndex((s) => heard && s.content.includes(heard)));
    setLiveSong({ title: item.name, slides, index });
    broadcastSongSlide(slides, index);
    verseController.current?.setSongMode(true);
    verseController.current?.setLiveLyrics(slides.map((s) => s.content), index);
  };

  const closeSong = () => {
    setLiveSong(null);
    verseController.current?.setLiveLyrics(null);
    syncService.broadcast({ type: 'SLIDE_UPDATE', data: { slide: null, index: -1, slideIndex: -1, upcoming: [], timestamp: new Date() } });
  };

  const showSuggestion = (s: Suggestion) => {
    dismissSuggestion(s);
    if (s.kind === 'song') showSong(s.songId, s.heard);
    else handleManualVerseSelect(s.verse);
  };

  const toggleSongMode = () => {
    const next = !songMode;
    if (verseController.current) verseController.current.setSongMode(next);
    else setSongMode(next);
  };

  /** Previous / next verse (through the passage, or on through the chapter), or slide while a song is up. */
  const step = async (direction: 1 | -1) => {
    const song = liveSongRef.current;
    if (song) {
      showSongSlide(Math.min(song.slides.length - 1, Math.max(0, song.index + direction)));
      return;
    }
    if (verseController.current) {
      await verseController.current.step(direction);
    } else if (currentVerse) {
      const verse = await BibleParser.getVerse(currentVerse.book, currentVerse.chapter, currentVerse.verse + direction);
      if (verse) handleVerseDetected(verse, { method: 'manual' });
    }
  };
  const stepRef = useRef(step);
  stepRef.current = step;

  // ← → step through verses (or song slides) when not typing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (e.key === 'ArrowRight') stepRef.current(1);
      else if (e.key === 'ArrowLeft') stepRef.current(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Listen for API fallback events
  useEffect(() => {
    const handleFallback = (event: CustomEvent) => {
      const { reason, verse } = event.detail;
      toast.warning('Using offline KJV fallback', {
        description: `${verse} - ${reason}. Switched to KJV temporarily.`,
      });
    };
    
    const handleSettingsUpdate = () => {
      const savedLanguage = localStorage.getItem('transcription_language');
      if (savedLanguage && savedLanguage !== transcriptionLanguage) {
        setTranscriptionLanguage(savedLanguage);
        toast.info('Language updated', {
          description: 'Restart listening for the change to take effect.',
        });
      }
    };

    window.addEventListener('bible-api-fallback', handleFallback as EventListener);
    window.addEventListener('settings-updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('bible-api-fallback', handleFallback as EventListener);
      window.removeEventListener('settings-updated', handleSettingsUpdate);
    };
  }, [transcriptionLanguage]);

  const handleOpenLowerThird = () => {
    window.open(appUrl('/lower-third'), '_blank', 'width=1280,height=720');
  };

  const handleOpenDisplayManagerWindow = () => {
    window.open(appUrl('/display-manager'), '_blank', 'width=1400,height=900');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleStopListening();
    };
  }, []);

  const handleStartListening = async () => {
    const settings = loadSpeechSettings();

    // Ask for the OpenAI key up front rather than failing mid-connection
    if (settings.speechEngine === 'openai' && !(await hasSecret('openai'))) {
      setShowApiKeyDialog(true);
      return;
    }

    startListening();
  };

  const startListening = async () => {
    try {
      setIsConnecting(true);
      setAudioStatus(prev => ({ ...prev, isListening: true, status: 'listening' }));
      
      // Create verse detection controller (centralized detection with dedupe)
      verseController.current = new VerseDetectionController({
        onVerseDetected: (verse, detectionInfo) => {
          console.log('Verse detected:', verse, detectionInfo);
          handleVerseDetected(verse, detectionInfo);
        },
        onTranscriptUpdate: (text) => {
          setTranscript(text);
        },
        onPassageChange: setPassage,
        onSongModeChange: setSongMode,
        onSongSuggested: (match) => {
          if (liveSongRef.current?.title === match.song.title) return;
          addSuggestion({ id: `song-${match.song.id}-${Date.now()}`, kind: 'song', songId: match.song.id, title: match.song.title, heard: match.heard });
        },
        onLyricsMove: (index) => {
          if (followSingingRef.current) showSongSlide(index);
        },
        ...verseAssistantOptions(
          (verse) => verseController.current?.triggerManualVerse(verse),
          (verse, info) =>
            addSuggestion({ id: `verse-${Date.now()}`, kind: 'verse', verse, byAi: info.engine === 'ai', heard: info.description }),
        ),
      });
      verseController.current.setSongMode(songMode);

      // The church's songs, so a song being sung can be recognised
      ServiceStorage.getMedia()
        .then((items) => {
          songLibrary.current = items.filter((m) => m.type === 'song' && m.lyrics);
          verseController.current?.setSongLibrary(songLibrary.current.map((m) => ({ id: m.id, title: m.name, lyrics: m.lyrics ?? '' })));
        })
        .catch(() => {});

      // Load speech settings and create provider
      const settings = loadSpeechSettings();
      settings.language = transcriptionLanguage;

      speechProvider.current = createSpeechProvider(settings, {
        onTranscript: (text, isFinal) => {
          console.log(`Transcript received (final=${isFinal}):`, text);
          // Route through centralized verse detection controller
          verseController.current?.onTranscript(text, isFinal);
        },
        onVolumeUpdate: (volume) => {
          setAudioStatus(prev => ({ ...prev, volume }));
        },
        onError: (error) => {
          console.error('Speech provider error:', error);
          toast.error('Speech recognition error', {
            description: error.message,
          });
        },
      });

      // Set engine type in controller
      verseController.current.setEngine(settings.speechEngine);

      await speechProvider.current.init();
      
      setIsConnecting(false);
      
      desktop?.setListening(true);
      toast.success('Listening started', {
        description: `Using ${getEngineDisplayName(settings)}`,
      });
    } catch (error) {
      console.error('Error starting listening:', error);
      setIsConnecting(false);
      toast.error('Failed to start listening', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      setAudioStatus(prev => ({ ...prev, isListening: false, status: 'idle' }));
    }
  };

  const handleVerseDetected = (verse: BibleVerse, detectionInfo?: DetectionInfo) => {
    const displayedVerse: DisplayedVerse = {
      ...verse,
      timestamp: new Date(),
    };

    setCurrentVerse(displayedVerse);
    // A verse replaces a song on screen
    if (liveSongRef.current) {
      setLiveSong(null);
      verseController.current?.setLiveLyrics(null);
    }
    setSuggestions((prev) => prev.filter((s) => s.kind !== 'verse' || `${s.verse.book}${s.verse.chapter}:${s.verse.verse}` !== `${verse.book}${verse.chapter}:${verse.verse}`));
    // Shown again: moves to the top rather than appearing twice
    setRecentVerses(prev => [
      displayedVerse,
      ...prev.filter(v => !(v.book === verse.book && v.chapter === verse.chapter && v.verse === verse.verse)),
    ].slice(0, 5));
    verseController.current?.setCurrentVerse(verse);

    syncService.broadcast({
      type: 'VERSE_UPDATE',
      data: {
        verse: displayedVerse,
        timestamp: displayedVerse.timestamp,
      },
    });
    sendVerseToProPresenter(verse);
    void detectionInfo;
  };

  const handleApiKeyDialogClose = (saved: boolean) => {
    setShowApiKeyDialog(false);
    if (saved) {
      startListening();
    }
  };

  const handleStopListening = () => {
    if (speechProvider.current) {
      speechProvider.current.disconnect();
      speechProvider.current = null;
    }
    
    if (verseController.current) {
      verseController.current.reset();
      verseController.current = null;
    }
    
    setAudioStatus(prev => ({ ...prev, isListening: false, status: 'idle', volume: 0 }));
    setIsMicMuted(false);
    setSuggestions([]);
    setPassage(null);
    desktop?.setListening(false);
    toast.info('Listening stopped');
  };

  const handleToggleMute = () => {
    if (speechProvider.current) {
      const newMutedState = !isMicMuted;
      setIsMicMuted(newMutedState);
      speechProvider.current.setMicrophoneMuted(newMutedState);
      toast.info(newMutedState ? 'Microphone muted' : 'Microphone unmuted');
    }
  };

  const handleManualVerseSelect = (verse: BibleVerse) => {
    if (verseController.current) {
      verseController.current.triggerManualVerse(verse);
    } else {
      handleVerseDetected(verse, { method: 'manual' });
    }
  };


  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6">
      <div className="max-w-[1800px] mx-auto space-y-3 sm:space-y-4 lg:space-y-6">
        <PageHeader
          title="Voice Verses"
          description="Scripture on screen as it is preached"
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings(!showSettings)}
          showDisplayMonitor={showDisplayMonitor}
          onToggleDisplayMonitor={onToggleDisplayMonitor}
          onOpenLowerThird={handleOpenLowerThird}
        />

        <ModeNav />

        {/* Settings Panel */}
        {showSettings && (
          <div className="animate-fade-in">
            <SettingsPanel onClose={() => setShowSettings(false)} />
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 2xl:col-span-3 min-w-0 space-y-3 sm:space-y-4 lg:space-y-6">
            <ManualSearch onVerseSelect={handleManualVerseSelect} />

            <AudioVisualizer
              isListening={audioStatus.isListening}
              volume={audioStatus.volume}
              isMuted={isMicMuted}
              onToggleMute={handleToggleMute}
            />

            <TranscriptWindow
              transcript={transcript}
              highlightedText={currentVerse ? `${currentVerse.book} ${currentVerse.chapter}` : undefined}
              isListening={audioStatus.isListening}
              onStop={handleStopListening}
              songMode={songMode}
              onToggleSongMode={toggleSongMode}
            >
              <LiveSuggestions suggestions={suggestions} onShow={showSuggestion} onDismiss={dismissSuggestion} />
            </TranscriptWindow>

            {liveSong && (
              <SongFollowPanel
                title={liveSong.title}
                slides={liveSong.slides}
                index={liveSong.index}
                follow={followSinging}
                onFollowChange={setFollowSinging}
                onSelect={showSongSlide}
                onClose={closeSong}
              />
            )}

            {!liveSong && currentVerse && (
              <PassageBar verse={currentVerse} passage={passage} onStep={step} onEnd={() => verseController.current?.endPassage()} />
            )}

            {!liveSong && (
              <VerseDisplay
                verse={currentVerse}
                timestamp={currentVerse?.timestamp}
              />
            )}

            {/* Control Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {!audioStatus.isListening ? (
                <Button 
                  onClick={handleStartListening} 
                  size="lg" 
                  className="flex-1 gradient-divine h-12 sm:h-auto"
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      <span className="text-sm sm:text-base">Connecting...</span>
                    </>
                  ) : (
                    <span className="text-sm sm:text-base">Start Listening</span>
                  )}
                </Button>
              ) : (
                <Button onClick={handleStopListening} size="lg" variant="destructive" className="flex-1 h-12 sm:h-auto">
                  <span className="text-sm sm:text-base">Stop Listening</span>
                </Button>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="2xl:col-span-2 min-w-0 space-y-3 sm:space-y-4">
            {/* Display Monitor Section */}
            {showDisplayMonitor && (
              <Card className="p-3 sm:p-4 lg:p-5 animate-fade-in">
                <Collapsible defaultOpen>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-sm">Display Monitor</h3>
                      <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-primary/10 rounded">Live</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleOpenDisplayManagerWindow}
                        className="h-7 px-2 hover:bg-primary/10"
                        title="Open in window"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-primary/10">
                          <ChevronDown className="w-4 h-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent>
                    <DisplayMonitor />
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}

            {/* Context Tracker Section */}
            <Card className="p-3 sm:p-4 lg:p-5">
              <Collapsible defaultOpen>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm">Active Content</h3>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-primary/10">
                      <ChevronDown className="w-4 h-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <ContextTracker
                    currentBook={currentVerse?.book}
                    currentChapter={currentVerse?.chapter}
                    recentVerses={recentVerses}
                    onSelect={handleManualVerseSelect}
                  />
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </div>
        </div>
      </div>

      {/* API Key Dialog for Development */}
      <ApiKeyDialog open={showApiKeyDialog} onClose={handleApiKeyDialogClose} />
    </div>
  );
};
