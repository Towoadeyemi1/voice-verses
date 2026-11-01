import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScaledStage } from '../ScaledStage';
import { OutputContent } from '../OutputContent';
import { chipClass } from '../ScreenPicker';
import { useTemplates } from '@/hooks/use-templates';
import { usePreviewStage } from '@/hooks/use-screen-shape';
import { Slide } from '@/types/service';
import { plainVerseText } from '@/lib/verseText';

/** The words a slide shows, for editing (none for scripture: that comes from the Bible). */
const bodyOf = (s: Slide): string | null =>
  s.type === 'lyrics' || s.type === 'announcement' ? s.content : s.type === 'image' ? s.caption ?? '' : s.type === 'blank' ? s.placeholder ?? '' : null;

const withBody = (s: Slide, body: string): Slide =>
  s.type === 'lyrics' || s.type === 'announcement' ? { ...s, content: body } : s.type === 'image' ? { ...s, caption: body } : s.type === 'blank' ? { ...s, placeholder: body } : s;

/**
 * Quick edit, from a slide in the strip or the Live and Next pictures: fix a
 * word, a title or the look on the go, with a preview of how the room will
 * see it. Saved to the service the slide belongs to (or for now, for a song
 * from the library), and the screens update at once if it is showing.
 */
export const QuickEdit = ({
  slide,
  where,
  live,
  onClose,
  onSave,
  onDesigner,
}: {
  slide: Slide | null;
  /** "Saved to Sunday Celebration" or "For this time only…" */
  where: string;
  /** It is on the screens now */
  live: boolean;
  onClose: () => void;
  onSave: (slide: Slide) => void;
  /** Opens the full designer */
  onDesigner?: () => void;
}) => {
  const { templates } = useTemplates();
  const stage = usePreviewStage('projection');
  const [draft, setDraft] = useState<Slide | null>(slide);
  useEffect(() => setDraft(slide), [slide]);

  if (!draft) return <Dialog open={false} />;
  const body = bodyOf(draft);
  const titled = draft.type !== 'lyrics' && draft.type !== 'scripture';

  return (
    <Dialog open={!!slide} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Quick edit</DialogTitle>
          <DialogDescription>{where}</DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5">
          <div className="space-y-4 min-w-0">
            {titled && (
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">Title</span>
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </label>
            )}
            {draft.type === 'lyrics' && (
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">Section</span>
                <Input value={draft.sectionLabel ?? ''} placeholder="Verse 1, Chorus…" onChange={(e) => setDraft({ ...draft, sectionLabel: e.target.value })} />
              </label>
            )}
            {body !== null ? (
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">{draft.type === 'image' ? 'Words over the picture' : 'Words'}</span>
                <Textarea autoFocus rows={draft.type === 'lyrics' ? 5 : 6} value={body} onChange={(e) => setDraft(withBody(draft, e.target.value))} className="text-[15px] leading-relaxed" />
              </label>
            ) : draft.type === 'scripture' ? (
              <p className="m-0 text-[13px] text-muted-foreground rounded-xl bg-muted/60 p-3">
                {draft.verse.book} {draft.verse.chapter}:{draft.verse.verse}: “{plainVerseText(draft.verse.text).slice(0, 120)}…” The words come from the Bible, so only the look changes here. To show another verse, find it with ⌘K.
              </p>
            ) : null}
            <div className="space-y-1.5">
              <p className="m-0 text-sm font-semibold">Look</p>
              <div className="flex flex-wrap gap-1.5 max-h-[188px] overflow-y-auto pr-1">
                <button type="button" className={chipClass(!draft.templateId)} onClick={() => setDraft({ ...draft, templateId: undefined })}>
                  The usual look
                </button>
                {templates.map((t) => (
                  <button key={t.id} type="button" className={chipClass(draft.templateId === t.id)} onClick={() => setDraft({ ...draft, templateId: t.id })}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <p className="m-0 mb-1.5 text-[13px] font-semibold text-muted-foreground">How the room will see it</p>
            <ScaledStage stage={stage} fitShape className="rounded-xl bg-black overflow-hidden">
              <OutputContent live={{ slide: draft }} output="projection" preview />
            </ScaledStage>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {onDesigner && (
            <Button variant="ghost" className="mr-auto" onClick={onDesigner}>
              Open the full designer
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(draft)}>{live ? 'Save and update the screens' : 'Save'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
