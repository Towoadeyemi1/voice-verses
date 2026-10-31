import { useRef, useState } from 'react';
import { Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slide } from '@/types/service';
import { loadAiSettings } from '@/ai/settings';
import { generateSlides, SlideSource } from '@/ai/slideGenerator';
import { ScaledStage } from './ScaledStage';
import { OutputContent } from './OutputContent';

const PLACEHOLDER: Record<SlideSource, string> = {
  announcements: 'Paste this week’s bulletin or notices, e.g.\n\nYouth Night this Friday at 7pm in the main hall. Pizza provided.\nBaptism Sunday is 15 November – sign up at the welcome desk.',
  sermon: 'Paste the sermon notes, e.g.\n\nRise and Walk – Pastor James\n1. Jesus sees the one others pass by (John 5:6)\n2. He asks before He heals\n3. Obedience brings the miracle (John 5:8-9)',
};

/**
 * Make slides from the church's own words with the AI set up in Settings:
 * paste a bulletin or sermon notes, check and edit what comes back, and add
 * the slides to the service item.
 */
export const AiSlidesDialog = ({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (slides: Slide[]) => void }) => {
  const [source, setSource] = useState<SlideSource>('announcements');
  const [text, setText] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const settings = loadAiSettings();
  const ready = !!settings.model;

  const generate = async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);
    try {
      setSlides(await generateSlides(settings, source, text, controller.signal));
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const edit = (i: number, change: Partial<{ title: string; content: string }>) =>
    setSlides((prev) => prev.map((s, j) => (j === i && s.type === 'announcement' ? { ...s, ...change } : s)));

  const close = () => {
    request.current?.abort();
    setSlides([]);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Make slides with AI
          </DialogTitle>
          <DialogDescription>
            Paste your own words. The AI keeps your dates, times and places as written and adds nothing; check and edit the slides before adding them.
          </DialogDescription>
        </DialogHeader>

        {!ready && (
          <Alert>
            <AlertDescription>Set up an AI first: Settings → Speech → AI verse assistant (Claude, OpenAI or a model on this computer).</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          {(['announcements', 'sermon'] as const).map((s) => (
            <Button key={s} size="sm" variant={source === s ? 'default' : 'outline'} onClick={() => setSource(s)}>
              {s === 'announcements' ? 'Announcements from a bulletin' : 'Sermon points from notes'}
            </Button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ai-slides-text">Your text</Label>
          <Textarea id="ai-slides-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={PLACEHOLDER[source]} rows={7} />
        </div>
        <Button onClick={generate} disabled={!ready || busy || !text.trim()} className="gap-2 w-fit">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {busy ? 'Writing slides…' : slides.length ? 'Write them again' : 'Write the slides'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {slides.length > 0 && (
          <div className="space-y-3">
            {slides.map((slide, i) => (
              <div key={slide.id} className="grid grid-cols-[200px_1fr_auto] gap-3 items-start rounded-lg border border-border p-2.5">
                <ScaledStage className="aspect-video bg-black rounded">
                  <OutputContent live={{ slide }} output="projection" preview />
                </ScaledStage>
                {slide.type === 'announcement' ? (
                  <div className="space-y-1.5">
                    <Input value={slide.title} onChange={(e) => edit(i, { title: e.target.value })} aria-label="Slide title" />
                    <Textarea value={slide.content} onChange={(e) => edit(i, { content: e.target.value })} rows={2} aria-label="Slide text" />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground pt-2">Scripture: {slide.title}</p>
                )}
                <Button size="sm" variant="ghost" onClick={() => setSlides((prev) => prev.filter((_, j) => j !== i))} title="Leave this slide out">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button
            disabled={!slides.length}
            onClick={() => {
              onAdd(slides);
              close();
            }}
          >
            Add {slides.length || ''} slide{slides.length === 1 ? '' : 's'} to this item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
