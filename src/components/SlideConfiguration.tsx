import { ReactNode, useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Slide, MediaItem } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { loadAssignments, loadTemplates, templateFor } from '@/lib/templates';
import { cleanTransition, TransitionSpec, TRANSITIONS } from '@/lib/transitions';
import { TransitionPicker } from './TransitionPicker';

interface SlideConfigurationProps {
  slide: Slide;
  onUpdate: (slide: Slide) => void;
}

const Part = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <section className="space-y-3 rounded-xl bg-muted/40 p-4">
    <div>
      <h3 className="m-0 text-[15px] font-semibold">{title}</h3>
      {hint && <p className="m-0 mt-0.5 text-[13px] text-muted-foreground">{hint}</p>}
    </div>
    {children}
  </section>
);

const KIND = { scripture: 'scripture', lyrics: 'lyrics', announcement: 'announcement' } as const;

/** One slide's own settings: its look, how it arrives, a picture behind it and its words. */
export const SlideConfiguration = ({ slide, onUpdate }: SlideConfigurationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState(slide.backgroundMedia?.url || 'none');
  const [backgroundOpacity, setBackgroundOpacity] = useState(slide.backgroundMedia?.opacity || 0.3);
  const [linesPerSlide, setLinesPerSlide] = useState(slide.textFormatting?.linesPerSlide || 4);
  const [fontSize, setFontSize] = useState(slide.textFormatting?.fontSize || 'large');
  const [alignment, setAlignment] = useState(slide.textFormatting?.alignment || 'center');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [templateId, setTemplateId] = useState(slide.templateId || 'assigned');
  const [transition, setTransition] = useState<TransitionSpec | undefined>(slide.transition);
  const [loop, setLoop] = useState(slide.type === 'video' ? slide.loop : false);
  const [sound, setSound] = useState(slide.type === 'video' ? slide.sound : true);
  const templates = loadTemplates();

  // The transition this slide gets from its look, if it doesn't choose one
  const kind = KIND[slide.type as keyof typeof KIND] ?? 'scripture';
  const look = templateFor(templates, loadAssignments(), 'projection', kind, templateId === 'assigned' ? undefined : templateId);
  const fromLook = cleanTransition(look.transition);
  const fromLookLabel = `Same as its look (${TRANSITIONS.find((t) => t.id === fromLook.kind)?.label}${fromLook.kind === 'cut' ? '' : `, ${fromLook.duration.toFixed(1)}s`})`;

  useEffect(() => {
    if (isOpen) {
      ServiceStorage.getMedia().then((items) => {
        setMedia(items.filter((m) => m.type === 'image' && m.url));
      });
    }
  }, [isOpen]);

  const handleSave = () => {
    const updatedSlide: Slide = {
      ...slide,
      ...(slide.type === 'video' ? { loop, sound } : {}),
      backgroundMedia:
        backgroundUrl && backgroundUrl !== 'none'
          ? {
              type: 'image',
              url: backgroundUrl,
              opacity: backgroundOpacity,
            }
          : undefined,
      templateId: templateId === 'assigned' ? undefined : templateId,
      transition,
      textFormatting: {
        linesPerSlide,
        fontSize: fontSize as NonNullable<Slide['textFormatting']>['fontSize'],
        alignment: alignment as NonNullable<Slide['textFormatting']>['alignment'],
      },
    };
    onUpdate(updatedSlide);
    setIsOpen(false);
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setIsOpen(true)} title="Slide settings: look, transition, picture behind it" aria-label="Slide settings">
        <Settings2 className="w-4 h-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Slide settings</DialogTitle>
            <DialogDescription>Changes for this slide only. Everything else comes from its look.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {slide.type === 'video' && (
              <Part title="Video">
                <div className="flex items-center justify-between">
                  <Label htmlFor="video-loop">Play it again when it ends</Label>
                  <Switch id="video-loop" checked={loop} onCheckedChange={setLoop} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="video-sound">Play its sound</Label>
                  <Switch id="video-sound" checked={sound} onCheckedChange={setSound} />
                </div>
              </Part>
            )}

            <Part title="Look" hint="The design this slide uses on the projector.">
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger aria-label="Look">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assigned">The look set on the Looks page</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Part>

            <Part title="Transition" hint="How this slide arrives on the screens.">
              <TransitionPicker value={transition} onChange={setTransition} inherit={fromLookLabel} />
            </Part>

            {slide.type !== 'video' && (
              <Part title="Picture behind it" hint="Shows behind the words instead of the look's background.">
                <Select value={backgroundUrl} onValueChange={setBackgroundUrl}>
                  <SelectTrigger aria-label="Picture behind the slide">
                    <SelectValue placeholder="None: use the look's background" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None: use the look's background</SelectItem>
                    {media.map((m) => (
                      <SelectItem key={m.id} value={m.url!}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {backgroundUrl && backgroundUrl !== 'none' && (
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-muted-foreground w-24 flex-shrink-0">How strong</span>
                    <Slider value={[backgroundOpacity]} onValueChange={([value]) => setBackgroundOpacity(value)} min={0} max={1} step={0.1} className="flex-1" aria-label="How strong the picture is" />
                    <span className="text-[13px] tabular-nums w-10 text-right">{Math.round(backgroundOpacity * 100)}%</span>
                  </div>
                )}
              </Part>
            )}

            {(slide.type === 'lyrics' || slide.type === 'scripture') && (
              <Part title="Words">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="slide-lines">Lines on each slide</Label>
                    <Input id="slide-lines" type="number" min={1} max={20} value={linesPerSlide} onChange={(e) => setLinesPerSlide(parseInt(e.target.value) || 4)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Size</Label>
                    <Select value={fontSize} onValueChange={(val) => setFontSize(val as typeof fontSize)}>
                      <SelectTrigger aria-label="Size of the words">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                        <SelectItem value="xlarge">Extra large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Line up</Label>
                    <Select value={alignment} onValueChange={(val) => setAlignment(val as typeof alignment)}>
                      <SelectTrigger aria-label="Line up the words">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Centre</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Part>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
