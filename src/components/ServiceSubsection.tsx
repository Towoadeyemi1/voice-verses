import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Copy, StickyNote, Clock } from 'lucide-react';
import { ServiceSubsection as ServiceSubsectionType } from '@/types/service';

interface ServiceSubsectionProps {
  subsection: ServiceSubsectionType;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onOpenNotes: () => void;
  onOpenCountdown: () => void;
  children: ReactNode;
}

export const ServiceSubsection = ({
  subsection,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onOpenNotes,
  onOpenCountdown,
  children,
}: ServiceSubsectionProps) => {
  return (
    <Card 
      className={`overflow-hidden transition-all cursor-pointer ${
        isSelected 
          ? 'ring-2 ring-primary bg-primary/5' 
          : 'hover:bg-muted/30'
      }`}
      onClick={onSelect}
    >
      <div className="px-3 py-2 flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{subsection.name}</h4>
          {subsection.countdown?.enabled && (
            <span title="Countdown enabled">
              <Clock className="w-3 h-3 text-primary" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenCountdown}
            className="h-7 w-7 p-0"
            title="Countdown timer"
          >
            <Clock className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenNotes}
            className="h-7 w-7 p-0"
            title="Presenter notes"
          >
            <StickyNote className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDuplicate}
            className="h-7 w-7 p-0"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>

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

      <div className="p-3">
        {children}
      </div>
    </Card>
  );
};
