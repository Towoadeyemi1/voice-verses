import { Music, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LyricsSlide } from '@/types/service';

/** The song on screen: its slides in sung order, the one showing, and following the singing. */
export const SongFollowPanel = ({
  title,
  slides,
  index,
  follow,
  onFollowChange,
  onSelect,
  onClose,
}: {
  title: string;
  slides: LyricsSlide[];
  index: number;
  follow: boolean;
  onFollowChange: (on: boolean) => void;
  onSelect: (index: number) => void;
  onClose: () => void;
}) => (
  <Card className="p-4 sm:p-5 border-primary/40 animate-fade-in space-y-3">
    <div className="flex items-center gap-2">
      <Music className="w-4 h-4 text-primary" />
      <h3 className="font-semibold text-sm sm:text-base flex-1 truncate">{title}</h3>
      <div className="flex items-center gap-2">
        <Switch id="follow-singing" checked={follow} onCheckedChange={onFollowChange} />
        <Label htmlFor="follow-singing" className="text-xs">Follow the singing</Label>
      </div>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose} title="Take the song off the screen">
        <X className="w-4 h-4" />
      </Button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
      {slides.map((slide, i) => (
        <button
          key={slide.id}
          onClick={() => onSelect(i)}
          className={`text-left rounded-md border p-2 transition-colors ${
            i === index ? 'border-primary bg-primary/15' : 'border-border hover:bg-muted/50'
          }`}
        >
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{slide.sectionLabel ?? `Slide ${i + 1}`}</p>
          <p className="text-xs text-foreground whitespace-pre-line line-clamp-2">{slide.content}</p>
        </button>
      ))}
    </div>
  </Card>
);
