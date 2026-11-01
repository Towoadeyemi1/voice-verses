import { CSSProperties, useEffect, useState } from 'react';
import { BibleVerse } from '@/types/bible';
import { Slide } from '@/types/service';
import { SyncMessage, syncService } from '@/lib/syncService';
import { plainVerseText } from '@/lib/verseText';
import { BibleParser } from '@/lib/bibleParser';
import { formatRemaining } from '@/lib/countdown';
import { useCountdown } from '@/hooks/use-countdown';
import { useAlert } from '@/hooks/use-alert';
import { VerseText } from './VerseText';
import { FitText } from './FitText';
import { SlideDisplay } from './SlideDisplay';

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

export const defaultConfidenceSettings: ConfidenceSettings = {
  currentVerseFontSize: 60,
  nextVerseFontSize: 24,
  clockFontSize: 36,
  backgroundColor: '#000000',
  textColor: '#FFFFFF',
  accentColor: '#3B82F6',
  clockFormat: '12h',
  nextVerseCount: 1,
};


const SETTINGS_KEY = 'cornerstone-confidence-settings';

export function loadConfidenceSettings(): ConfidenceSettings {
  try {
    return { ...defaultConfidenceSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return defaultConfidenceSettings;
  }
}

export function saveConfidenceSettings(settings: ConfidenceSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * The confidence monitor: the verse or slide on screen, what comes next, the
 * clock and timers. The confidence window and the operator's preview both draw
 * this, so the preview is an exact miniature.
 */
export const ConfidenceScreen = ({ settings, className, style }: { settings: ConfidenceSettings; className?: string; style?: CSSProperties }) => {
  const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
  const [currentVerse, setCurrentVerse] = useState<BibleVerse | null>(null);
  const [nextItems, setNextItems] = useState<{ ref: string; snippet: string }[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { countdown, remaining } = useCountdown();
  const alert = useAlert();
  const stageAlert = alert?.stage ? alert : null;

  useEffect(() => {
    const snippetOf = (slide: Slide) => {
      if (slide.type === 'scripture' && slide.verse) return plainVerseText(slide.verse.text).split(' ').slice(0, 7).join(' ') + '...';
      if (slide.type === 'lyrics' || slide.type === 'announcement') return (slide.content?.split('\n')[0] ?? '').slice(0, 50) + '...';
      return 'Media slide';
    };

    // Opened mid-service, or reloaded: catch up first, then follow changes
    let latest = 0;
    const handle = async (message: SyncMessage) => {
      const call = ++latest;
      let verse: BibleVerse | null = null;
      let nextItemsList: { ref: string; snippet: string }[] = [];

      if (message.type === 'SLIDE_UPDATE') {
        const slide = message.data.slide ?? null;
        setCurrentSlide(slide);
        if (slide?.type === 'scripture' && slide.verse) verse = slide.verse;
        // In a service, "next" is the next slide in the service, not the next verse in the Bible
        const index = message.data.slideIndex ?? message.data.index ?? -1;
        const upcoming = message.data.upcoming ?? message.data.allSlides?.slice(index + 1) ?? [];
        nextItemsList = upcoming.slice(0, settings.nextVerseCount).map((next) => ({ ref: next.title, snippet: snippetOf(next) }));
      } else if (message.type === 'VERSE_UPDATE' && message.data.verse !== undefined) {
        verse = message.data.verse ?? null;
        setCurrentSlide(null);
        if (verse) {
          for (let i = 1; i <= settings.nextVerseCount; i++) {
            const nextVerse = await BibleParser.getVerse(verse.book, verse.chapter, verse.verse + i);
            if (!nextVerse) break;
            nextItemsList.push({
              ref: `${nextVerse.book} ${nextVerse.chapter}:${nextVerse.verse}`,
              snippet: plainVerseText(nextVerse.text).split(' ').slice(0, 7).join(' ') + '...',
            });
          }
        }
      } else if (message.type === 'LOGO') {
        setCurrentSlide(null);
      } else {
        return;
      }

      if (call !== latest) return; // a newer message arrived while looking up verses
      setCurrentVerse(verse);
      setNextItems(nextItemsList);
    };

    const live = syncService.current();
    if (live) handle(live);
    const unsubscribe = syncService.subscribe(handle);

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

  return (
      <div
        className={`relative flex overflow-hidden ${className ?? ''}`}
        style={{ ...style, backgroundColor: settings.backgroundColor, color: settings.textColor }}
      >
        {/* A note for the people on stage: big, across the top, over everything */}
        {stageAlert && (
          <div
            key={stageAlert.id}
            data-stage-alert={stageAlert.text}
            className="absolute left-0 right-0 top-0 z-10 flex items-center justify-center gap-4 px-8 py-6 font-bold text-center"
            style={{
              fontSize: `${Math.round(settings.currentVerseFontSize * 0.9)}px`,
              lineHeight: 1.15,
              background: stageAlert.urgent ? '#b45309' : '#1d4ed8',
              color: '#ffffff',
              animation: 'vv-in-lift 0.4s cubic-bezier(0.4, 0, 0.2, 1) both',
            }}
          >
            {stageAlert.text}
          </div>
        )}
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
            <div className="flex items-center gap-8">
              {countdown?.confidence && (
                <div
                  className="font-bold tabular-nums rounded-lg px-4"
                  title={countdown.message}
                  style={{
                    fontSize: `${settings.clockFontSize * 1.6}px`,
                    color: remaining < 0 ? '#ffffff' : remaining <= (countdown.warnSeconds ?? 60) * 1000 ? '#fbbf24' : settings.textColor,
                    backgroundColor: remaining < 0 ? '#dc2626' : 'transparent',
                  }}
                >
                  {formatRemaining(remaining, { overrun: true })}
                </div>
              )}
              <div
                className="font-bold tabular-nums"
                style={{ fontSize: `${settings.clockFontSize}px`, color: settings.textColor }}
              >
                {formatTime(currentTime)}
              </div>
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
              <div className="h-full flex flex-col">
                <div 
                  className="font-bold mb-4"
                  style={{ fontSize: `${settings.currentVerseFontSize * 0.67}px`, color: settings.accentColor }}
                >
                  {currentVerse.book} {currentVerse.chapter}:{currentVerse.verse}
                </div>
                <FitText
                  maxFontSize={settings.currentVerseFontSize}
                  className="leading-relaxed break-words"
                  style={{ color: settings.textColor }}
                >
                  <VerseText text={currentVerse.text} />
                </FitText>
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
            className="w-[26%] min-w-48 max-w-md border-l p-6 flex flex-col"
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
  );
};
