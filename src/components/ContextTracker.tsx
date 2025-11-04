import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DisplayedVerse } from '@/types/bible';
import { BookMarked, History } from 'lucide-react';

interface ContextTrackerProps {
  currentBook?: string;
  currentChapter?: number;
  recentVerses: DisplayedVerse[];
}

export const ContextTracker = ({ currentBook, currentChapter, recentVerses }: ContextTrackerProps) => {
  return (
    <Card className="p-6 border-border bg-card">
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Active Context</h3>
              <p className="text-sm text-muted-foreground">Current book and chapter</p>
            </div>
          </div>

          {currentBook && currentChapter ? (
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2">
                <Badge className="gradient-divine text-primary-foreground px-3 py-1">
                  {currentBook} {currentChapter}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Context active - verse numbers only needed
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-border">
              <p className="text-sm text-muted-foreground text-center">
                No context set - speak full reference
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Recent Verses</h3>
              <p className="text-sm text-muted-foreground">Last 5 displayed</p>
            </div>
          </div>

          <ScrollArea className="h-48">
            {recentVerses.length > 0 ? (
              <div className="space-y-2">
                {recentVerses.map((verse, index) => (
                  <div
                    key={`${verse.book}-${verse.chapter}-${verse.verse}-${index}`}
                    className="p-3 rounded-lg bg-muted/30 border border-border hover:border-primary/50 transition-smooth cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-foreground text-sm">
                        {verse.book} {verse.chapter}:{verse.verse}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {verse.latency}ms
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {verse.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">No verses displayed yet</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </Card>
  );
};
