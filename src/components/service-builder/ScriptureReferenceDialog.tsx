import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ScriptureReferenceDialogProps {
  open: boolean;
  reference: string;
  onReferenceChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ScriptureReferenceDialog({ open, reference, onReferenceChange, onSubmit, onCancel }: ScriptureReferenceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Scripture</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter a scripture reference. Examples: John 3:16, John 3:1-16, or John 3 (full chapter)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="scripture-ref" className="text-sm font-medium text-foreground">
              Scripture Reference
            </Label>
            <Input
              id="scripture-ref"
              value={reference}
              onChange={(e) => onReferenceChange(e.target.value)}
              placeholder="e.g., John 3:16"
              className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSubmit();
              }}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} className="border-border">
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!reference.trim()}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
