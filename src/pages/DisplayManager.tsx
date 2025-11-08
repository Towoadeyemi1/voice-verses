import { useState, useEffect } from 'react';
import { BibleVerse } from '@/types/bible';
import { syncService } from '@/lib/syncService';
import { Card } from '@/components/ui/card';
import { Monitor, MonitorPlay, TvMinimalPlay } from 'lucide-react';

const DisplayManager = () => {
  const [verse, setVerse] = useState<BibleVerse | null>(null);
  const [lowerThirdSettings, setLowerThirdSettings] = useState<any>(null);
  const [projectionSettings, setProjectionSettings] = useState<any>(null);

  useEffect(() => {
    // Load settings
    const loadSettings = () => {
      const lowerThird = localStorage.getItem('cornerstone-lowerthird-settings');
      const projection = localStorage.getItem('cornerstone-settings');
      
      if (lowerThird) setLowerThirdSettings(JSON.parse(lowerThird));
      if (projection) setProjectionSettings(JSON.parse(projection));
    };

    loadSettings();

    // Subscribe to verse updates
    const unsubscribe = syncService.subscribe((message) => {
      if (message.type === 'VERSE_UPDATE' && message.data.verse) {
        setVerse(message.data.verse);
      }
    });

    // Listen for settings updates
    const handleSettingsUpdate = () => loadSettings();
    window.addEventListener('settings-updated', handleSettingsUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('settings-updated', handleSettingsUpdate);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Display Manager</h1>
          <p className="text-muted-foreground">Monitor all outputs from one interface</p>
        </div>

        {/* Display Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projection Display Preview */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b">
              <MonitorPlay className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Main Projection</h2>
            </div>
            <div className="aspect-video bg-projection-bg rounded-lg overflow-hidden border-2 border-border">
              <div className="h-full flex flex-col items-center justify-center p-8 text-projection-text">
                {verse ? (
                  <div className="space-y-6 text-center">
                    <p 
                      className="font-serif leading-relaxed"
                      style={{ fontSize: `${(projectionSettings?.fontSize || 72) / 4}px` }}
                    >
                      "{verse.text}"
                    </p>
                    {(projectionSettings?.showReference ?? true) && (
                      <div className="pt-4 border-t border-projection-accent/20">
                        <p 
                          className="font-semibold text-projection-accent"
                          style={{ fontSize: `${(projectionSettings?.fontSize || 72) / 8}px` }}
                        >
                          {verse.book} {verse.chapter}:{verse.verse}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <Monitor className="w-12 h-12 mx-auto text-projection-accent/60" />
                    <p className="text-projection-text/60 text-sm">Waiting for verse...</p>
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Output: SDI 1 • Resolution: 1920x1080
            </div>
          </Card>

          {/* Lower Third Preview */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b">
              <TvMinimalPlay className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Lower Third</h2>
            </div>
            <div className="aspect-video bg-[#00FF00] rounded-lg overflow-hidden border-2 border-border relative">
              <div className="absolute inset-0 flex items-end justify-center p-4">
                {verse && lowerThirdSettings?.showBackground ? (
                  <div 
                    className="rounded-lg px-6 py-4 max-w-4xl"
                    style={{
                      backgroundColor: `${lowerThirdSettings.backgroundColor}${Math.round((lowerThirdSettings.backgroundOpacity || 90) * 2.55).toString(16).padStart(2, '0')}`,
                    }}
                  >
                    <p 
                      className="font-semibold text-center"
                      style={{ 
                        fontSize: `${(lowerThirdSettings?.fontSize || 48) / 4}px`,
                        color: lowerThirdSettings?.textColor || '#FFFFFF'
                      }}
                    >
                      {verse.book} {verse.chapter}:{verse.verse}
                    </p>
                    <p 
                      className="text-center mt-1"
                      style={{ 
                        fontSize: `${(lowerThirdSettings?.fontSize || 48) / 6}px`,
                        color: lowerThirdSettings?.textColor || '#FFFFFF',
                        opacity: 0.9
                      }}
                    >
                      {verse.text.substring(0, 100)}...
                    </p>
                  </div>
                ) : (
                  verse && (
                    <div className="text-center">
                      <p 
                        className="font-bold"
                        style={{ 
                          fontSize: `${(lowerThirdSettings?.fontSize || 48) / 4}px`,
                          color: lowerThirdSettings?.textColor || '#FFFFFF',
                          textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                        }}
                      >
                        {verse.book} {verse.chapter}:{verse.verse}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Output: SDI 2 • Chroma Key: Green (#00FF00)
            </div>
          </Card>

          {/* Confidence Monitor Preview */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Monitor className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Confidence Monitor</h2>
            </div>
            <div className="aspect-video bg-background rounded-lg overflow-hidden border-2 border-border">
              <div className="h-full flex items-center justify-center p-4">
                {verse ? (
                  <div className="text-center space-y-2">
                    <p className="font-bold text-lg">
                      {verse.book} {verse.chapter}:{verse.verse}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {verse.text}
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <Monitor className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">No verse selected</p>
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Output: SDI 3 • Resolution: 1920x1080
            </div>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="p-6 bg-muted/50">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Setup Instructions
          </h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li><strong>Step 1:</strong> Open three separate browser windows</li>
            <li><strong>Step 2:</strong> Navigate to: <code className="bg-background px-2 py-1 rounded">/projection</code>, <code className="bg-background px-2 py-1 rounded">/lower-third</code>, <code className="bg-background px-2 py-1 rounded">/confidence</code></li>
            <li><strong>Step 3:</strong> Drag each window to its assigned DeckLink display (SDI output)</li>
            <li><strong>Step 4:</strong> Press F11 (or Cmd+Ctrl+F) to make each window fullscreen</li>
            <li><strong>Step 5:</strong> Use this Display Manager on your main screen to monitor all outputs</li>
          </ol>
        </Card>
      </div>
    </div>
  );
};

export default DisplayManager;
