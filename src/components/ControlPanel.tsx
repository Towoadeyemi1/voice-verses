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
        ...verseAssistantOptions((verse) => verseController.current?.triggerManualVerse(verse)),
      });

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
    setRecentVerses(prev => [displayedVerse, ...prev].slice(0, 5));
    verseController.current?.setCurrentVerse(verse);

    syncService.broadcast({
      type: 'VERSE_UPDATE',
      data: {
        verse: displayedVerse,
        timestamp: displayedVerse.timestamp,
      },
    });
    sendVerseToProPresenter(verse);

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
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 lg:space-y-6">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4 lg:space-y-6">
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
            />

            <VerseDisplay
              verse={currentVerse}
              timestamp={currentVerse?.timestamp}
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
                    currentBook={currentVerse?.book}
                    currentChapter={currentVerse?.chapter}
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
