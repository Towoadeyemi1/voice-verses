import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type NotesTarget = 'section' | 'subsection' | 'slide';

const COPY: Record<NotesTarget, { title: string; description: string }> = {
  section: { title: 'Operator Notes (Private)', description: 'Private notes for operators only' },
  subsection: { title: 'Presenter Notes (Confidence Monitor)', description: 'Visible on confidence monitor' },
  slide: { title: 'Slide Notes', description: 'Notes for this specific slide' },
};

interface NotesDialogProps {
  target: NotesTarget;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function NotesDialog({ target, value, onChange, onSave, onCancel }: NotesDialogProps) {
  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{COPY[target].title}</DialogTitle>
          <DialogDescription>{COPY[target].description}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter notes..."
          className="min-h-[200px]"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave}>Save Notes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
