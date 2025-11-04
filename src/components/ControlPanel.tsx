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
import { Maximize2, Settings, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { syncService } from '@/lib/syncService';
import { RealtimeWebRTC } from '@/lib/realtimeWebRTC';

interface ControlPanelProps {
  onOpenProjection: () => void;
}

export const ControlPanel = ({ onOpenProjection }: ControlPanelProps) => {
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
  
  const realtimeChat = useRef<RealtimeWebRTC | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleStopListening();
    };
  }, []);

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
        (verse) => {
          if (verse) {
            processTranscript('', verse);
          }
        },
        (volume) => {
          setAudioStatus(prev => ({ ...prev, volume }));
        }
      );

      await realtimeChat.current.init();
      
      setIsConnecting(false);
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
    if (realtimeChat.current) {
      realtimeChat.current.disconnect();
      realtimeChat.current = null;
    }
    
    setAudioStatus(prev => ({ ...prev, isListening: false, status: 'idle', volume: 0 }));
    toast.info('Listening stopped');
  };

  const processTranscript = (text: string, verseOverride?: any) => {
    const startTime = performance.now();
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
