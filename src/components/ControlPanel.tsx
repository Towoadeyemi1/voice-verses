import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AudioVisualizer } from './AudioVisualizer';
import { TranscriptWindow } from './TranscriptWindow';
import { VerseDisplay } from './VerseDisplay';
import { ContextTracker } from './ContextTracker';
import { SettingsPanel } from './SettingsPanel';
import { ManualSearch } from './ManualSearch';
import { DisplayMonitor } from './DisplayMonitor';
import { BibleParser } from '@/lib/bibleParser';
import { DisplayedVerse, AudioStatus, BibleVerse } from '@/types/bible';
import { Maximize2, Settings, Loader2, MonitorPlay, LayoutGrid, Monitor, ChevronDown, ExternalLink, Calendar, Music, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { syncService } from '@/lib/syncService';
import { RealtimeWebRTC } from '@/lib/realtimeWebRTC';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card } from '@/components/ui/card';

interface ControlPanelProps {
  onOpenProjection: () => void;
  showDisplayMonitor?: boolean;
  onToggleDisplayMonitor?: () => void;
}

export const ControlPanel = ({ onOpenProjection, showDisplayMonitor, onToggleDisplayMonitor }: ControlPanelProps) => {
  const navigate = useNavigate();
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
  
  // Verse range tracking
  const [verseRange, setVerseRange] = useState<{ start: number; end: number } | null>(null);
  const [lastTranscriptSegment, setLastTranscriptSegment] = useState('');
  const [readingMode, setReadingMode] = useState<'reading' | 'explaining' | 'idle'>('idle');
  
  const realtimeChat = useRef<RealtimeWebRTC | null>(null);
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);

  // Listen for API fallback events
  useEffect(() => {
    const handleFallback = (event: CustomEvent) => {
      const { reason, verse } = event.detail;
      toast.warning('Using offline KJV fallback', {
        description: `${verse} - ${reason}. Switched to KJV temporarily.`,
      });
    };

    window.addEventListener('bible-api-fallback', handleFallback as EventListener);
    return () => {
      window.removeEventListener('bible-api-fallback', handleFallback as EventListener);
    };
  }, []);

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
    try {
      setIsConnecting(true);
      setAudioStatus(prev => ({ ...prev, isListening: true, status: 'listening' }));
      
      // Initialize WebRTC Realtime Chat
      realtimeChat.current = new RealtimeWebRTC(
        (text) => {
          console.log('Transcript received:', text);
          setTranscript(text);
        },
        (verse, detectionInfo) => {
          if (verse) {
            processTranscript('', verse);
            
            // Show different notifications based on detection method
            if (detectionInfo?.method === 'description') {
              toast.success('Verse detected from description!', {
                description: `${verse.book} ${verse.chapter}:${verse.verse} - ${detectionInfo.description} (${detectionInfo.confidence} confidence)`,
                duration: 5000,
              });
            }
          }
        },
        (volume) => {
          setAudioStatus(prev => ({ ...prev, volume }));
        }
      );

      await realtimeChat.current.init();
      
      setIsConnecting(false);
      setReadingMode('idle');
      toast.success('Listening started', {
        description: 'Ready to detect Bible references',
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

  const handleStopListening = () => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    
    if (realtimeChat.current) {
      realtimeChat.current.disconnect();
      realtimeChat.current = null;
    }
    
    setAudioStatus(prev => ({ ...prev, isListening: false, status: 'idle', volume: 0 }));
    setReadingMode('idle');
    setVerseRange(null);
    toast.info('Listening stopped');
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
    processTranscript('', verse);
  };

  const context = BibleParser.getCurrentContext();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-transparent.png" alt="Cornerstone Bible Logo" className="w-16 h-16 object-contain" />
            <div>
              <h1 className="text-4xl font-bold text-gradient mb-2">
                Cornerstone Bible
              </h1>
              <p className="text-muted-foreground">
                Voice-Activated Scripture Projection System
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="outline"
              size="lg"
            >
              <Settings className="w-5 h-5 mr-2" />
              Settings
            </Button>
            <Button 
              onClick={onToggleDisplayMonitor} 
              variant={showDisplayMonitor ? "default" : "outline"}
              size="lg"
            >
              <LayoutGrid className="w-5 h-5 mr-2" />
              {showDisplayMonitor ? "Hide Monitor" : "Display Monitor"}
            </Button>
            <Button onClick={handleOpenLowerThird} variant="outline" size="lg">
              <MonitorPlay className="w-5 h-5 mr-2" />
              Lower Third
            </Button>
            <Button onClick={onOpenProjection} size="lg" className="gradient-divine">
              <Maximize2 className="w-5 h-5 mr-2" />
              Open Projection
            </Button>
          </div>
        </div>

        {/* Mode Switcher */}
        <Card className="p-4 bg-card/50 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg">
              <Button
                onClick={() => navigate('/')}
                variant="ghost"
                size="lg"
                className="h-auto p-4 gap-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                <Mic className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-semibold text-sm">Scripture Mode</div>
                  <div className="text-xs opacity-90">Voice-controlled</div>
                </div>
              </Button>
              
              <Button
                onClick={() => navigate('/service-planner')}
                variant="ghost"
                size="lg"
                className="h-auto p-4 gap-3 hover:bg-primary/10 transition-all"
              >
                <Calendar className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-semibold text-sm">Service Mode</div>
                  <div className="text-xs text-muted-foreground">Plan services</div>
                </div>
              </Button>
              
              <Button
                onClick={() => navigate('/media-library')}
                variant="ghost"
                size="lg"
                className="h-auto p-4 gap-3 hover:bg-primary/10 transition-all"
              >
                <Music className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-semibold text-sm">Media Mode</div>
                  <div className="text-xs text-muted-foreground">Manage media</div>
                </div>
              </Button>
            </div>
          </div>
        </Card>

        {/* Settings Panel */}
        {showSettings && (
          <div className="animate-fade-in">
            <SettingsPanel onClose={() => setShowSettings(false)} />
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <ManualSearch onVerseSelect={handleManualVerseSelect} />

            <AudioVisualizer
              isListening={audioStatus.isListening}
              volume={audioStatus.volume}
              latency={currentVerse?.latency}
            />

            <TranscriptWindow
              transcript={transcript}
              highlightedText={context ? `${context.book} ${context.chapter}` : undefined}
            />

            <VerseDisplay
              verse={currentVerse}
              timestamp={currentVerse?.timestamp}
              latency={currentVerse?.latency}
            />

            {/* Control Buttons */}
            <div className="flex gap-4">
              {!audioStatus.isListening ? (
                <Button 
                  onClick={handleStartListening} 
                  size="lg" 
                  className="flex-1 gradient-divine"
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Start Listening'
                  )}
                </Button>
              ) : (
                <Button onClick={handleStopListening} size="lg" variant="destructive" className="flex-1">
                  Stop Listening
                </Button>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4 lg:w-full xl:w-auto 2xl:min-w-[700px]">
            {/* Display Monitor Section */}
            {showDisplayMonitor && (
              <Card className="p-5 animate-fade-in">
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
            <Card className="p-5">
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
    </div>
  );
};
