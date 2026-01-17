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
import { BibleParser } from '@/lib/bibleParser';
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
  createSpeechProvider, 
  loadSpeechSettings,
  VerseDetectionController 
} from '@/speech';

interface ControlPanelProps {
  showDisplayMonitor?: boolean;
  onToggleDisplayMonitor?: () => void;
}

export const ControlPanel = ({ showDisplayMonitor, onToggleDisplayMonitor }: ControlPanelProps) => {
  const [audioStatus, setAudioStatus] = useState<AudioStatus>({
    isListening: false,
    volume: 45,
    status: 'idle',
  });

  const [transcript, setTranscript] = useState('');
  const [currentVerse, setCurrentVerse] = useState<DisplayedVerse | null>(null);
  const [recentVerses, setRecentVerses] = useState<DisplayedVerse[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [pendingApiKey, setPendingApiKey] = useState<string | null>(null);
  const [transcriptionLanguage, setTranscriptionLanguage] = useState(() => {
    return localStorage.getItem('transcription_language') || 'en';
  });
  
  // Verse range tracking
  const [verseRange, setVerseRange] = useState<{ start: number; end: number } | null>(null);
  const [lastTranscriptSegment, setLastTranscriptSegment] = useState('');
  const [readingMode, setReadingMode] = useState<'reading' | 'explaining' | 'idle'>('idle');
  
  const speechProvider = useRef<ISpeechProvider | null>(null);
  const verseController = useRef<VerseDetectionController | null>(null);
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);

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
    window.open('/lower-third', '_blank', 'width=1280,height=720');
  };

  const handleOpenDisplayManagerWindow = () => {
    window.open('/display-manager', '_blank', 'width=1400,height=900');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleStopListening();
    };
  }, []);

  // Process transcript whenever it changes
  useEffect(() => {
    if (transcript && audioStatus.isListening) {
      processTranscript(transcript);
    }
  }, [transcript]);

  const handleStartListening = async () => {
    // Check if in development mode and need API key
    const isDevelopment = window.location.hostname.includes('lovableproject.com') || 
                         window.location.hostname.includes('lovable.dev');
    
    if (isDevelopment) {
      // Check for saved API key
      const savedKey = localStorage.getItem('dev_openai_api_key');
      
      if (!savedKey) {
        // Show dialog to get API key
        setShowApiKeyDialog(true);
        return;
      }
      
      // Use saved key
      setPendingApiKey(savedKey);
      startListeningWithKey(savedKey);
    } else {
      // Production mode - use Azure Function
      startListeningWithKey(null);
    }
  };

  const startListeningWithKey = async (apiKey: string | null) => {
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
      });

      // Load speech settings and create provider
      const settings = loadSpeechSettings();
      settings.openaiApiKey = apiKey;
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
      setReadingMode('idle');
      
      const engineName = settings.speechEngine === 'local' ? settings.localEngine : 'OpenAI';
      toast.success('Listening started', {
        description: `Using ${engineName} for speech recognition`,
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

  const handleVerseDetected = (verse: BibleVerse, detectionInfo?: any) => {
    const startTime = performance.now();
    const latency = Math.round(performance.now() - startTime);
    
    const displayedVerse: DisplayedVerse = {
      ...verse,
      timestamp: new Date(),
      latency,
    };

    setCurrentVerse(displayedVerse);
    setRecentVerses(prev => [displayedVerse, ...prev].slice(0, 5));
    verseController.current?.setCurrentVerse(verse);

    // Broadcast to projection display
    console.log('ControlPanel broadcasting verse:', displayedVerse);
    syncService.broadcast({
      type: 'VERSE_UPDATE',
      data: {
        verse: displayedVerse,
        timestamp: displayedVerse.timestamp,
        latency: displayedVerse.latency,
      },
    });

    toast.success('Verse found!', {
      description: `${verse.book} ${verse.chapter}:${verse.verse}`,
    });

    if (detectionInfo?.method === 'description') {
      toast.info('Detected from description', {
        description: `${detectionInfo.description} (${detectionInfo.confidence} confidence)`,
        duration: 3000,
      });
    }
  };

  const handleApiKeyDialogClose = (apiKey: string | null) => {
    setShowApiKeyDialog(false);
    
    if (apiKey) {
      setPendingApiKey(apiKey);
      startListeningWithKey(apiKey);
    }
  };

  const handleStopListening = () => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    
    if (speechProvider.current) {
      speechProvider.current.disconnect();
      speechProvider.current = null;
    }
    
    if (verseController.current) {
      verseController.current.reset();
      verseController.current = null;
    }
    
    setAudioStatus(prev => ({ ...prev, isListening: false, status: 'idle', volume: 0 }));
    setReadingMode('idle');
    setVerseRange(null);
    setIsMicMuted(false);
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

  const analyzeReadingMode = (text: string, currentVerseText?: string): 'reading' | 'explaining' => {
    if (!currentVerseText) return 'explaining';
    
    // Check if transcript contains significant portions of current verse text
    const verseWords = currentVerseText.toLowerCase().split(' ').filter(w => w.length > 3);
    const transcriptLower = text.toLowerCase();
    
    let matchCount = 0;
    verseWords.forEach(word => {
      if (transcriptLower.includes(word)) matchCount++;
    });
    
    const matchRatio = matchCount / verseWords.length;
    
    // If more than 30% of verse words are in transcript, likely reading
    return matchRatio > 0.3 ? 'reading' : 'explaining';
  };

  const checkForNextVerseText = (text: string, nextVerse: BibleVerse | null): boolean => {
    if (!nextVerse) return false;
    
    // Check if transcript contains beginning of next verse
    const nextVerseWords = nextVerse.text.toLowerCase().split(' ').slice(0, 5);
    const transcriptLower = text.toLowerCase();
    
    let matchCount = 0;
    nextVerseWords.forEach(word => {
      if (word.length > 3 && transcriptLower.includes(word)) matchCount++;
    });
    
    return matchCount >= 3;
  };

  const processTranscript = async (text: string, verseOverride?: any) => {
    const startTime = performance.now();
    
    // Clear any pending auto-advance
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    
    // Check for explicit "next" command
    if (/\b(next|next verse)\b/i.test(text) && currentVerse) {
      const nextVerse = BibleParser.getVerse(
        currentVerse.book,
        currentVerse.chapter,
        currentVerse.verse + 1
      );
      
      if (nextVerse) {
        verseOverride = nextVerse;
        setReadingMode('reading');
      }
    }
    
    // Check for range specifications (e.g., "1 to 10", "1 to end")
    const rangeMatch = text.match(/(\d+)\s+(?:to|through|-)\s+(?:(\d+)|end)/i);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = rangeMatch[2] ? parseInt(rangeMatch[2]) : 999;
      setVerseRange({ start, end });
      console.log('Range detected:', { start, end });
    }
    
    const verse = verseOverride || await BibleParser.parseReference(text);
    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);

    if (verse) {
      const displayedVerse: DisplayedVerse = {
        ...verse,
        timestamp: new Date(),
        latency,
      };

      setCurrentVerse(displayedVerse);
      setRecentVerses(prev => [displayedVerse, ...prev].slice(0, 5));

      // Broadcast to projection display
      console.log('ControlPanel broadcasting voice-controlled verse:', displayedVerse);
      syncService.broadcast({
        type: 'VERSE_UPDATE',
        data: {
          verse: displayedVerse,
          timestamp: displayedVerse.timestamp,
          latency: displayedVerse.latency,
        },
      });

      toast.success('Verse found!', {
        description: `${verse.book} ${verse.chapter}:${verse.verse}`,
      });
      
      // If range is set, enter reading mode
      if (verseRange) {
        setReadingMode('reading');
      }
      return;
    }
    
    // Analyze current transcript for reading vs explaining
    if (currentVerse && text !== lastTranscriptSegment) {
      setLastTranscriptSegment(text);
      
      const mode = analyzeReadingMode(text, currentVerse.text);
      console.log('Reading mode:', mode, 'Text:', text);
      
      if (mode === 'reading') {
        setReadingMode('reading');
        
        // Check if next verse is being read
        const nextVerse = await BibleParser.getVerse(
          currentVerse.book,
          currentVerse.chapter,
          currentVerse.verse + 1
        );
        
        if (checkForNextVerseText(text, nextVerse)) {
          console.log('Detected next verse being read, auto-advancing...');
          processTranscript('', nextVerse);
          return;
        }
        
        // If in range and reading mode, schedule auto-advance after brief pause
        if (verseRange && currentVerse.verse < verseRange.end) {
          autoAdvanceTimer.current = setTimeout(async () => {
            const next = await BibleParser.getVerse(
              currentVerse.book,
              currentVerse.chapter,
              currentVerse.verse + 1
            );
            
            if (next && readingMode === 'reading') {
              console.log('Auto-advancing to next verse in range...');
              processTranscript('', next);
            }
          }, 2000); // Wait 2 seconds of silence before advancing
        }
      } else {
        setReadingMode('explaining');
        console.log('Speaker is explaining, staying on current verse');
      }
    }
  };

  const handleManualVerseSelect = (verse: BibleVerse) => {
    if (verseController.current) {
      verseController.current.triggerManualVerse(verse);
    } else {
      handleVerseDetected(verse, { method: 'manual' });
    }
  };

  const context = BibleParser.getCurrentContext();

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 lg:space-y-6">
        <PageHeader
          title="Cornerstone Bible"
          description="Voice-Activated Scripture Projection System"
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4 lg:space-y-6">
            <ManualSearch onVerseSelect={handleManualVerseSelect} />

            <AudioVisualizer
              isListening={audioStatus.isListening}
              volume={audioStatus.volume}
              latency={currentVerse?.latency}
              isMuted={isMicMuted}
              onToggleMute={handleToggleMute}
            />

            <TranscriptWindow
              transcript={transcript}
              highlightedText={context ? `${context.book} ${context.chapter}` : undefined}
              isListening={audioStatus.isListening}
              onStop={handleStopListening}
            />

            <VerseDisplay
              verse={currentVerse}
              timestamp={currentVerse?.timestamp}
              latency={currentVerse?.latency}
            />

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
          <div className="space-y-3 sm:space-y-4 lg:w-full xl:w-auto 2xl:min-w-[700px]">
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
                    currentBook={context?.book}
                    currentChapter={context?.chapter}
                    recentVerses={recentVerses}
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
