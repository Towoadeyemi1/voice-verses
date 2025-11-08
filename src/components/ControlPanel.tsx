import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AudioVisualizer } from './AudioVisualizer';
import { TranscriptWindow } from './TranscriptWindow';
import { VerseDisplay } from './VerseDisplay';
import { ContextTracker } from './ContextTracker';
import { SettingsPanel } from './SettingsPanel';
import { ManualSearch } from './ManualSearch';
import { BibleParser } from '@/lib/bibleParser';
import { DisplayedVerse, AudioStatus, BibleVerse } from '@/types/bible';
import { Maximize2, Settings, Loader2, MonitorPlay, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { syncService } from '@/lib/syncService';
import { RealtimeWebRTC } from '@/lib/realtimeWebRTC';

interface ControlPanelProps {
  onOpenProjection: () => void;
  showDisplayMonitor?: boolean;
  onToggleDisplayMonitor?: () => void;
}

export const ControlPanel = ({ onOpenProjection, showDisplayMonitor, onToggleDisplayMonitor }: ControlPanelProps) => {
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

  const handleOpenLowerThird = () => {
    window.open('/lower-third', '_blank', 'width=1280,height=720');
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

  const processTranscript = (text: string, verseOverride?: any) => {
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
    
    const verse = verseOverride || BibleParser.parseReference(text);
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
        const nextVerse = BibleParser.getVerse(
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
          autoAdvanceTimer.current = setTimeout(() => {
            const next = BibleParser.getVerse(
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
          <div>
            <h1 className="text-4xl font-bold text-gradient mb-2">
              Cornerstone Bible
            </h1>
            <p className="text-muted-foreground">
              Voice-Activated Scripture Projection System
            </p>
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

          {/* Right Column */}
          <div className="space-y-6">
            <ContextTracker
              currentBook={context?.book}
              currentChapter={context?.chapter}
              recentVerses={recentVerses}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
