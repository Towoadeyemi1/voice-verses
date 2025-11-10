import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BibleVerse } from '@/types/bible';
import { BookOpen, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VerseDisplayProps {
  verse: BibleVerse | null;
  timestamp?: Date;
  latency?: number;
}

export const VerseDisplay = ({ verse, timestamp, latency }: VerseDisplayProps) => {
  if (!verse) {
    return (
      <Card className="p-4 sm:p-6 lg:p-8 border-border bg-card">
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="p-3 sm:p-4 rounded-full bg-muted/30 w-12 h-12 sm:w-16 sm:h-16 mx-auto flex items-center justify-center">
            <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-base sm:text-lg">No Verse Selected</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Waiting for scripture reference...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6 lg:p-8 border-border bg-card animate-fade-in">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gradient truncate">
                {verse.book} {verse.chapter}:{verse.verse}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
              {timestamp && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs sm:text-sm">{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
                </div>
              )}
              {latency !== undefined && (
                <Badge variant="outline" className="text-success border-success text-xs">
                  {latency}ms response
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none">
          <p className="text-foreground leading-relaxed text-sm sm:text-base lg:text-lg italic">
            "{verse.text}"
          </p>
        </div>

        <div className="pt-3 sm:pt-4 border-t border-border">
          <p className="text-right text-xs sm:text-sm font-semibold text-muted-foreground">
            — {verse.book} {verse.chapter}:{verse.verse} (KJV)
          </p>
        </div>
      </div>
    </Card>
  );
};
