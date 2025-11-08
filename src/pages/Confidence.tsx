import { useEffect, useState } from 'react';
import { BibleVerse } from '@/types/bible';
import { syncService } from '@/lib/syncService';
import { BibleParser } from '@/lib/bibleParser';

const Confidence = () => {
  const [currentVerse, setCurrentVerse] = useState<BibleVerse | null>(null);
  const [nextVerses, setNextVerses] = useState<{ ref: string; snippet: string }[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Subscribe to verse updates
    const unsubscribe = syncService.subscribe(async (message) => {
      if (message.type === 'VERSE_UPDATE' && message.data.verse !== undefined) {
        const verse = message.data.verse;
        setCurrentVerse(verse);
        
        if (verse) {
          // Get next verse
          const nextVerse = await BibleParser.getVerse(
            verse.book,
            verse.chapter,
            verse.verse + 1
          );
          
          if (nextVerse) {
            const words = nextVerse.text.split(' ').slice(0, 7).join(' ');
            setNextVerses([{
              ref: `${nextVerse.book} ${nextVerse.chapter}:${nextVerse.verse}`,
              snippet: words + '...'
            }]);
          } else {
            setNextVerses([]);
          }
        } else {
          setNextVerses([]);
        }
      }
    });

    // Update clock every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 flex flex-col">
      {/* Header with context and clock */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-border">
        <div className="text-2xl font-semibold">
          {currentVerse ? (
            <span className="text-muted-foreground">
              {currentVerse.book} {currentVerse.chapter}
            </span>
          ) : (
            <span className="text-muted-foreground">No verse selected</span>
          )}
        </div>
        <div className="text-3xl font-bold tabular-nums">
          {formatTime(currentTime)}
        </div>
      </div>

      {/* Current verse - large and prominent */}
      <div className="flex-1 flex flex-col justify-center mb-8">
        {currentVerse ? (
          <div className="space-y-4">
            <div className="text-4xl font-bold text-primary mb-4">
              {currentVerse.book} {currentVerse.chapter}:{currentVerse.verse}
            </div>
            <div className="text-5xl leading-relaxed">
              {currentVerse.text}
            </div>
          </div>
        ) : (
          <div className="text-4xl text-muted-foreground text-center">
            Waiting for verse selection...
          </div>
        )}
      </div>

      {/* Next verses preview */}
      {nextVerses.length > 0 && (
        <div className="border-t border-border pt-6 space-y-3">
          <div className="text-lg font-semibold text-muted-foreground mb-4">
            Coming Up:
          </div>
          {nextVerses.map((verse, index) => (
            <div
              key={index}
              className="flex items-baseline gap-3 text-2xl text-muted-foreground"
            >
              <span className="font-semibold min-w-fit">{verse.ref}</span>
              <span className="opacity-70">{verse.snippet}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Confidence;
