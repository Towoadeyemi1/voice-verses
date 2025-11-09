import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Trash2, Copy, StickyNote, Plus } from 'lucide-react';
import { ServiceSection as ServiceSectionType } from '@/types/service';

interface ServiceSectionProps {
  section: ServiceSectionType;
  isExpanded: boolean;
  onToggle: () => void;
  onAddSubsection: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onOpenNotes: () => void;
  children: ReactNode;
}

export const ServiceSection = ({
  section,
  isExpanded,
  onToggle,
  onAddSubsection,
  onDelete,
  onDuplicate,
  onOpenNotes,
  children,
}: ServiceSectionProps) => {
  return (
    <Card className="overflow-hidden border-l-4 border-l-primary/50 hover:border-l-primary transition-colors">
      <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
          
          <h3 className="font-semibold text-lg truncate">{section.name}</h3>
          
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {section.subsections.length} {section.subsections.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddSubsection}
            className="h-8 gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Item</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenNotes}
            className="h-8 w-8 p-0"
            title="Section notes"
          >
            <StickyNote className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDuplicate}
            className="h-8 w-8 p-0"
            title="Duplicate section"
          >
            <Copy className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            title="Delete section"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4">
          {children}
        </div>
      )}
    </Card>
  );
};
