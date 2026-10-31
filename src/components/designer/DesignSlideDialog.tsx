import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slide } from '@/types/service';
import { CONTENT_KINDS, newTemplateId, saveAssignments, saveTemplates, Template, templateFor } from '@/lib/templates';
import { useTemplates } from '@/hooks/use-templates';
import { describe } from '../OutputContent';
import { SlideDesigner } from './SlideDesigner';

/**
 * Designing one slide from the service: start from the look it has now, change
 * anything, then choose how far it goes: this slide, every slide of this item
 * (a whole song), or every slide of its kind.
 */
export const DesignSlideDialog = ({
  slide,
  itemName,
  itemSlides,
  open,
  onClose,
  onApply,
}: {
  slide: Slide;
  itemName: string;
  itemSlides: Slide[];
  open: boolean;
  onClose: () => void;
  /** Slides whose look changed (they now use the new template) */
  onApply: (slides: Slide[]) => void;
}) => {
  const { templates, assignments } = useTemplates();
  const described = describe({ slide });
  const kind = described?.kind ?? 'announcement';
  const current = templateFor(templates, assignments, 'projection', kind, slide.templateId);
  const [draft, setDraft] = useState<Template>(() => ({ ...structuredClone(current), id: newTemplateId(), name: `${slide.title || itemName} look` }));
  const kindLabel = CONTENT_KINDS.find((k) => k.id === kind)?.label.toLowerCase() ?? 'slides';

  const saveAsNew = (name: string) => {
    const created = { ...draft, name };
    saveTemplates([...templates, created]);
    return created.id;
  };

  const applyTo = (scope: 'slide' | 'item' | 'kind') => {
    if (scope === 'kind') {
      // The look every slide of this kind uses is changed in place
      const assigned = assignments.projection[kind];
      saveTemplates(templates.map((t) => (t.id === assigned ? { ...draft, id: assigned, name: t.name } : t)));
      saveAssignments(assignments);
      onApply(slide.templateId ? [{ ...slide, templateId: undefined }] : []);
    } else if (scope === 'item') {
      const id = saveAsNew(`${itemName} look`);
      onApply(itemSlides.map((s) => ({ ...s, templateId: id })));
    } else {
      const id = saveAsNew(draft.name);
      onApply([{ ...slide, templateId: id }]);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[min(1400px,96vw)] max-h-[94vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Design “{slide.title || itemName}”</DialogTitle>
          <DialogDescription>Change anything on the slide, then choose where it applies.</DialogDescription>
        </DialogHeader>
        <SlideDesigner
          template={draft}
          onChange={setDraft}
          samples={described ? [{ id: 'this', label: 'This slide', content: described.content }] : []}
          sample="this"
          onSample={() => {}}
        />
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={() => applyTo('kind')} title={`Changes the look every ${kindLabel} slide uses on the projector`}>
            Every {kindLabel} slide
          </Button>
          {itemSlides.length > 1 && (
            <Button variant="outline" onClick={() => applyTo('item')}>
              All {itemSlides.length} slides of “{itemName}”
            </Button>
          )}
          <Button onClick={() => applyTo('slide')}>This slide</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
