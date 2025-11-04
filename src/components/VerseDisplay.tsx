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
      <Card className="p-8 border-border bg-card">
        <div className="text-center space-y-4">
          <div className="p-4 rounded-full bg-muted/30 w-16 h-16 mx-auto flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg">No Verse Selected</h3>
            <p className="text-sm text-muted-foreground">Waiting for scripture reference...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-8 border-border bg-card animate-fade-in">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h3 className="text-2xl font-bold text-gradient">
                {verse.book} {verse.chapter}:{verse.verse}
              </h3>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {timestamp && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
                </div>
              )}
              {latency !== undefined && (
                <Badge variant="outline" className="text-success border-success">
                  {latency}ms response
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="prose prose-lg">
          <p className="text-foreground leading-relaxed text-lg italic">
            "{verse.text}"
          </p>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-right text-sm font-semibold text-muted-foreground">
            — {verse.book} {verse.chapter}:{verse.verse} (KJV)
          </p>
        </div>
      </div>
    </Card>
  );
};
