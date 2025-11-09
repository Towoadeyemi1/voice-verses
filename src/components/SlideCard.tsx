import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slide } from '@/types/service';
import { Book, Music, Image, MessageSquare, FileQuestion, Pencil, Trash2, Settings, StickyNote } from 'lucide-react';

interface SlideCardProps {
  slide: Slide;
  onEdit: () => void;
  onDelete: () => void;
  onConfigure: () => void;
  onOpenNotes: () => void;
}

export const SlideCard = ({
  slide,
  onEdit,
  onDelete,
  onConfigure,
  onOpenNotes,
}: SlideCardProps) => {
  const getIcon = () => {
    switch (slide.type) {
      case 'scripture':
        return <Book className="w-4 h-4" />;
      case 'lyrics':
        return <Music className="w-4 h-4" />;
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'announcement':
        return <MessageSquare className="w-4 h-4" />;
      case 'blank':
        return <FileQuestion className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getPreview = () => {
    if (slide.type === 'scripture') {
      return (
        <div className="text-xs text-muted-foreground">
          {slide.verse.book} {slide.verse.chapter}:{slide.verse.verse}
        </div>
      );
    }
    if (slide.type === 'lyrics') {
      return (
        <div className="text-xs text-muted-foreground line-clamp-2">
          {slide.content}
        </div>
      );
    }
    if (slide.type === 'image' && slide.imageUrl) {
      return (
        <img
          src={slide.imageUrl}
          alt={slide.title}
          className="w-full h-20 object-cover rounded"
        />
      );
    }
    if (slide.type === 'announcement') {
      return (
        <div className="text-xs text-muted-foreground line-clamp-2">
          {slide.content}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="group overflow-hidden hover-lift cursor-pointer transition-all">
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="text-primary flex-shrink-0">
              {getIcon()}
            </div>
            <div className="font-medium text-sm truncate">{slide.title}</div>
          </div>
          
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenNotes}
              className="h-7 w-7 p-0"
              title="Slide notes"
            >
              <StickyNote className="w-3.5 h-3.5" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onConfigure}
              className="h-7 w-7 p-0"
              title="Configure"
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>

            {(slide.type === 'lyrics' || slide.type === 'announcement' || slide.type === 'blank') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-7 w-7 p-0"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {getPreview()}
      </div>
    </Card>
  );
};
