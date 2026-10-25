import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableRowProps {
  id: string;
  children: React.ReactNode;
  /** Classes for the row (alignment) and drag handle icon (size), which differ per nesting level */
  rowClassName: string;
  handleClassName: string;
  iconClassName: string;
}

function SortableRow({ id, children, rowClassName, handleClassName, iconClassName }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className={cn('flex gap-2', rowClassName)}>
        <div {...attributes} {...listeners} className={cn('cursor-grab active:cursor-grabbing hover:text-primary', handleClassName)}>
          <GripVertical className={cn('text-muted-foreground', iconClassName)} />
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

export function SortableSection({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <SortableRow id={id} rowClassName="items-start" handleClassName="mt-4" iconClassName="w-5 h-5">
      {children}
    </SortableRow>
  );
}

export function SortableSubsection({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <SortableRow id={id} rowClassName="items-start" handleClassName="mt-3" iconClassName="w-4 h-4">
      {children}
    </SortableRow>
  );
}

export function SortableSlide({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <SortableRow id={id} rowClassName="items-center" handleClassName="" iconClassName="w-3 h-3">
      {children}
    </SortableRow>
  );
}
