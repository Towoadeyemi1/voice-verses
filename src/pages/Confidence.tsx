import { useEffect, useState } from 'react';
import { BibleVerse } from '@/types/bible';
import { Slide } from '@/types/service';
import { syncService } from '@/lib/syncService';
import { BibleParser } from '@/lib/bibleParser';
import { SlideDisplay } from '@/components/SlideDisplay';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings } from 'lucide-react';

export interface ConfidenceSettings {
  currentVerseFontSize: number;
  nextVerseFontSize: number;
  clockFontSize: number;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  clockFormat: '12h' | '24h';
  nextVerseCount: number;
}

const defaultSettings: ConfidenceSettings = {
  currentVerseFontSize: 60,
  nextVerseFontSize: 24,
  clockFontSize: 36,
  backgroundColor: '#000000',
  textColor: '#FFFFFF',
  accentColor: '#3B82F6',
  clockFormat: '12h',
  nextVerseCount: 1,
};

const Confidence = () => {
  const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
  const [currentVerse, setCurrentVerse] = useState<BibleVerse | null>(null);
  const [nextItems, setNextItems] = useState<{ ref: string; snippet: string }[]>([]);
  const [allSlides, setAllSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(-1);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ConfidenceSettings>(defaultSettings);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('cornerstone-confidence-settings');
    if (savedSettings) {
      setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
    }

    // Request current slide from presenter on load
    const requestChannel = new BroadcastChannel('cornerstone-display-request');
    requestChannel.postMessage({ type: 'request-current-slide' });
    requestChannel.close();

    // Subscribe to slide updates
    const unsubscribe = syncService.subscribe(async (message) => {
      console.log('Confidence received message:', message);
      
      let verse = null;
      let slide = null;
      
      // Handle slide updates from Presenter
      if (message.type === 'SLIDE_UPDATE') {
        console.log('Confidence handling SLIDE_UPDATE:', message.data);
        
        if (message.data.slide) {
          slide = message.data.slide;
          setCurrentSlide(slide);
          
          // Store all slides and current index if provided
          if (message.data.allSlides) {
            setAllSlides(message.data.allSlides);
          }
          if (message.data.slideIndex !== undefined) {
            setCurrentSlideIndex(message.data.slideIndex);
          }
          
          // Extract verse for scripture slides
          if (slide.type === 'scripture' && slide.verse) {
            verse = slide.verse;
          }
          
          console.log('Confidence updated to show slide:', slide.title);
        } else {
          setCurrentSlide(null);
          setAllSlides([]);
          setCurrentSlideIndex(-1);
          console.log('Confidence cleared (no slide)');
        }
      }
      // Handle voice-controlled scripture (VERSE_UPDATE from Scripture page)
      else if (message.type === 'VERSE_UPDATE' && message.data.verse !== undefined) {
        console.log('Confidence handling VERSE_UPDATE (voice-controlled):', message.data.verse);
        verse = message.data.verse;
        setCurrentSlide(null);
        setAllSlides([]);
        setCurrentSlideIndex(-1);
        console.log('Confidence showing voice-controlled verse:', verse ? `${verse.book} ${verse.chapter}:${verse.verse}` : 'null');
      }
      
      setCurrentVerse(verse);
      
      // Build next items list
      const nextItemsList: { ref: string; snippet: string }[] = [];
      
      if (verse) {
        // Get next verses for scripture
        for (let i = 1; i <= settings.nextVerseCount; i++) {
          const nextVerse = await BibleParser.getVerse(
            verse.book,
            verse.chapter,
            verse.verse + i
          );
          
          if (nextVerse) {
            const words = nextVerse.text.split(' ').slice(0, 7).join(' ');
            nextItemsList.push({
              ref: `${nextVerse.book} ${nextVerse.chapter}:${nextVerse.verse}`,
              snippet: words + '...'
            });
          }
        }
      } else if (currentSlideIndex >= 0 && allSlides.length > 0) {
        // Get next slides from the service
        for (let i = 1; i <= settings.nextVerseCount && currentSlideIndex + i < allSlides.length; i++) {
          const nextSlide = allSlides[currentSlideIndex + i];
          let snippet = '';
          
          if (nextSlide.type === 'scripture' && nextSlide.verse) {
            snippet = nextSlide.verse.text.split(' ').slice(0, 7).join(' ') + '...';
          } else if (nextSlide.type === 'lyrics') {
            snippet = nextSlide.content.split('\n')[0].slice(0, 50) + '...';
          } else if (nextSlide.type === 'announcement') {
            snippet = nextSlide.content?.split('\n')[0].slice(0, 50) + '...';
          } else {
            snippet = 'Media slide';
          }
          
          nextItemsList.push({
            ref: nextSlide.title,
            snippet: snippet
          });
        }
      }
      
      setNextItems(nextItemsList);
    });

    // Update clock every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [settings.nextVerseCount]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: settings.clockFormat === '12h'
    });
  };

  const updateSettings = (newSettings: Partial<ConfidenceSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('cornerstone-confidence-settings', JSON.stringify(updated));
  };

  return (
    <>
      <div 
        className="min-h-screen flex"
        style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
      >
        {/* Main content area */}
        <div className="flex-1 p-8 flex flex-col">
          {/* Header with context and clock */}
          <div className="flex justify-between items-center mb-8 pb-4 border-b" style={{ borderColor: `${settings.textColor}20` }}>
            <div style={{ fontSize: `${settings.clockFontSize * 0.67}px` }} className="font-semibold">
              {currentSlide ? (
                <span style={{ color: `${settings.textColor}70` }}>
                  {currentSlide.title} <span className="opacity-50">• {currentSlide.type}</span>
                </span>
              ) : currentVerse ? (
                <span style={{ color: `${settings.textColor}70` }}>
                  {currentVerse.book} {currentVerse.chapter}
                </span>
              ) : (
                <span style={{ color: `${settings.textColor}70` }}>No content selected</span>
              )}
            </div>
            <div 
              className="font-bold tabular-nums"
              style={{ fontSize: `${settings.clockFontSize}px`, color: settings.textColor }}
            >
              {formatTime(currentTime)}
            </div>
          </div>

          {/* Current slide/verse - large and prominent */}
          <div className="flex-1 flex flex-col justify-center min-h-0">
            {currentSlide ? (
              <div className="space-y-4 h-full flex flex-col">
                <div 
                  className="font-bold"
                  style={{ fontSize: `${settings.currentVerseFontSize * 0.67}px`, color: settings.accentColor }}
                >
                  {currentSlide.title}
                </div>
                <div className="border rounded-lg overflow-hidden bg-black/20 flex-1 min-h-0">
                  <SlideDisplay slide={currentSlide} className="h-full" />
                </div>
              </div>
            ) : currentVerse ? (
              <div className="space-y-4">
                <div 
                  className="font-bold mb-4"
                  style={{ fontSize: `${settings.currentVerseFontSize * 0.67}px`, color: settings.accentColor }}
                >
                  {currentVerse.book} {currentVerse.chapter}:{currentVerse.verse}
                </div>
                <div 
                  className="leading-relaxed break-words"
                  style={{ fontSize: `${settings.currentVerseFontSize}px`, color: settings.textColor }}
                >
                  {currentVerse.text}
                </div>
              </div>
            ) : (
              <div 
                className="text-center"
                style={{ fontSize: `${settings.currentVerseFontSize * 0.67}px`, color: `${settings.textColor}70` }}
              >
                Waiting for content...
              </div>
            )}
          </div>
        </div>

        {/* Next items sidebar - Yellow/Gold colored */}
        {nextItems.length > 0 && (
          <div 
            className="w-96 border-l p-6 flex flex-col"
            style={{ 
              backgroundColor: '#fbbf24',
              borderColor: '#f59e0b',
              color: '#000000'
            }}
          >
            <div 
              className="font-bold mb-6 text-xl"
              style={{ color: '#000000' }}
            >
              COMING UP NEXT
            </div>
            <div className="space-y-4">
              {nextItems.map((item, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg"
                  style={{ 
                    backgroundColor: index === 0 ? '#fcd34d' : 'rgba(252, 211, 77, 0.5)',
                    border: index === 0 ? '2px solid #f59e0b' : '1px solid #fcd34d'
                  }}
                >
                  <div className="font-bold mb-2" style={{ fontSize: `${settings.nextVerseFontSize}px` }}>
                    {item.ref}
                  </div>
                  <div style={{ fontSize: `${settings.nextVerseFontSize * 0.83}px`, opacity: 0.8 }}>
                    {item.snippet}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings Toggle Button */}
      <Button
        onClick={() => setShowSettings(!showSettings)}
        className="fixed top-4 right-4 z-50"
        variant="outline"
        size="icon"
      >
        <Settings className="w-4 h-4" />
      </Button>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="fixed top-16 right-4 z-50 w-96 p-6 max-h-[calc(100vh-5rem)] overflow-y-auto bg-background/95 backdrop-blur">
          <h3 className="text-lg font-semibold mb-4">Confidence Monitor Settings</h3>
          
          <div className="space-y-6">
            {/* Background Color */}
            <div className="space-y-2">
              <Label>Background Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.backgroundColor}
                  onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                  className="w-24 px-2 py-1 text-sm border rounded"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* Text Color */}
            <div className="space-y-2">
              <Label>Text Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.textColor}
                  onChange={(e) => updateSettings({ textColor: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.textColor}
                  onChange={(e) => updateSettings({ textColor: e.target.value })}
                  className="w-24 px-2 py-1 text-sm border rounded"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <Label>Accent Color (Reference)</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => updateSettings({ accentColor: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.accentColor}
                  onChange={(e) => updateSettings({ accentColor: e.target.value })}
                  className="w-24 px-2 py-1 text-sm border rounded"
                  placeholder="#3B82F6"
                />
              </div>
            </div>

            {/* Current Verse Font Size */}
            <div className="space-y-2">
              <Label>Current Verse Font Size: {settings.currentVerseFontSize}px</Label>
              <Slider
                value={[settings.currentVerseFontSize]}
                onValueChange={([value]) => updateSettings({ currentVerseFontSize: value })}
                min={32}
                max={96}
                step={4}
              />
            </div>

            {/* Next Verse Font Size */}
            <div className="space-y-2">
              <Label>Next Verse Font Size: {settings.nextVerseFontSize}px</Label>
              <Slider
                value={[settings.nextVerseFontSize]}
                onValueChange={([value]) => updateSettings({ nextVerseFontSize: value })}
                min={16}
                max={48}
                step={2}
              />
            </div>

            {/* Clock Font Size */}
            <div className="space-y-2">
              <Label>Clock Font Size: {settings.clockFontSize}px</Label>
              <Slider
                value={[settings.clockFontSize]}
                onValueChange={([value]) => updateSettings({ clockFontSize: value })}
                min={24}
                max={64}
                step={4}
              />
            </div>

            {/* Clock Format */}
            <div className="space-y-2">
              <Label>Clock Format</Label>
              <Select
                value={settings.clockFormat}
                onValueChange={(value: '12h' | '24h') => updateSettings({ clockFormat: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                  <SelectItem value="24h">24-hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Next Verse Count */}
            <div className="space-y-2">
              <Label>Show Next Verses: {settings.nextVerseCount}</Label>
              <Slider
                value={[settings.nextVerseCount]}
                onValueChange={([value]) => updateSettings({ nextVerseCount: value })}
                min={1}
                max={5}
                step={1}
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t text-sm text-muted-foreground">
            <p>💡 Press ESC or click the settings icon to close this panel</p>
          </div>
        </Card>
      )}
    </>
  );
};

export default Confidence;
