import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, Info, ListOrdered, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FileReadError, partsFrom, readForService, type Found } from '@/lib/importers';
import type { ServiceSubsection } from '@/types/service';

/** A row or tile that can be ticked: a real button, 44px tall, with its state said aloud. */
function Tick({ on }: { on: boolean }) {
  return (
    <span className={`w-[22px] h-[22px] rounded-md grid place-items-center flex-shrink-0 ${on ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/25'}`} aria-hidden="true">
      {on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
    </span>
  );
}

/**
 * Add from a file (1.19.7, approved mock-up "Add from a file"): a presentation (PDF,
 * PowerPoint) or sermon notes (Word, text) reviewed before they become parts of a section:
 * which pages, as pictures or words, notes to the stage; which scriptures and points.
 */
export function AddFromFileDialog({
  file,
  sectionName,
  serviceName,
  onClose,
  onAdd,
}: {
  file: File | null;
  sectionName: string;
  serviceName: string;
  onClose: () => void;
  onAdd: (parts: ServiceSubsection[], summary: string) => void;
}) {
  const [found, setFound] = useState<Found | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [pages, setPages] = useState<Set<number>>(new Set());
  const [as, setAs] = useState<'pictures' | 'words'>('pictures');
  const [notesToStage, setNotesToStage] = useState(true);
  const [verses, setVerses] = useState<Set<string>>(new Set());
  const [points, setPoints] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!file) return;
    let current = true;
    setFound(null);
    setError(null);
    setProgress(null);
    readForService(file, (done, total) => current && setProgress({ done, total }))
      .then((f) => {
        if (!current) return;
        setFound(f);
        if (f.kind === 'presentation') {
          setPages(new Set(f.pages.map((_, i) => i)));
          setAs(f.from === 'pdf' ? 'pictures' : 'words');
        } else {
          setVerses(new Set(f.scriptures.filter((s) => s.chosen).map((s) => s.reference)));
          setPoints(new Set(f.points));
        }
      })
      .catch((e) => current && setError(e instanceof FileReadError ? e.message : 'This file couldn’t be read.'));
    return () => {
      current = false;
    };
  }, [file]);

  const toggle = <T,>(set: Set<T>, value: T, update: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    update(next);
  };

  const hasNotes = found?.kind === 'presentation' && found.pages.some((p) => p.notes);
  const summary = useMemo(() => {
    if (!found) return '';
    if (found.kind === 'presentation') return `${pages.size} of ${found.pages.length} ${found.from === 'pdf' ? 'pages' : 'slides'}`;
    return [verses.size && `${verses.size} scripture${verses.size === 1 ? '' : 's'}`, points.size && `${points.size} point${points.size === 1 ? '' : 's'}`].filter(Boolean).join(' and ') || 'Nothing chosen';
  }, [found, pages, verses, points]);

  const add = async () => {
    if (!found) return;
    setAdding(true);
    try {
      const parts =
        found.kind === 'presentation'
          ? await partsFrom(found, { pages: [...pages].sort((a, b) => a - b), as, notesToStage })
          : await partsFrom(found, { scriptures: found.scriptures.map((s) => s.reference).filter((r) => verses.has(r)), points: found.points.filter((p) => points.has(p)), notesToStage });
      const slides = parts.reduce((t, p) => t + p.slides.length, 0);
      onAdd(parts, `${slides} slide${slides === 1 ? '' : 's'} from ${file?.name}`);
    } finally {
      setAdding(false);
    }
  };

  const nothing = !found || (found.kind === 'presentation' ? pages.size === 0 : verses.size + points.size === 0 && !notesToStage);

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1080px] w-[calc(100vw-48px)] p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col [&>button]:hidden" data-add-from-file>
        <header className="px-7 pt-6 pb-4 flex justify-between items-start gap-6">
          <div className="min-w-0">
            <p className="m-0 text-[13px] text-muted-foreground font-semibold">
              Add to {sectionName} · {serviceName}
            </p>
            <DialogTitle className="mt-1 text-2xl font-bold truncate">{file?.name}</DialogTitle>
            <DialogDescription className="mt-1 text-sm">
              {error
                ? 'This file couldn’t be added.'
                : !found
                  ? progress
                    ? `Reading page ${progress.done} of ${progress.total}…`
                    : 'Reading…'
                  : found.kind === 'presentation'
                    ? `${found.pages.length} ${found.from === 'pdf' ? 'pages' : 'slides'} found. Untick any you don’t want.`
                    : 'Here is what Voice Verses found in the notes. Untick anything that isn’t for the screens.'}
            </DialogDescription>
          </div>
          <Button variant="secondary" size="icon" className="h-10 w-10 flex-shrink-0" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </header>

        <div className="px-7 pb-2 overflow-auto min-h-0 flex-1">
          {error && (
            <div className="rounded-xl bg-muted/60 p-5 text-[15px]" role="alert" data-add-error>
              {error}
            </div>
          )}
          {!found && !error && (
            <div className="h-48 grid place-items-center text-muted-foreground text-sm">
              <span className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" aria-hidden="true" />
                {progress ? `Page ${progress.done} of ${progress.total}` : 'Opening the file'}
              </span>
            </div>
          )}

          {found?.kind === 'presentation' && (
            <>
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex-1 min-w-[320px] rounded-2xl bg-muted/50 p-4 flex flex-col gap-2.5">
                  <span className="text-sm font-semibold">How the {found.from === 'pdf' ? 'pages' : 'slides'} show</span>
                  <div role="radiogroup" aria-label="How they show" className="flex gap-1.5 bg-background/60 p-1 rounded-xl w-fit">
                    {(
                      [
                        ['pictures', 'As pictures: exactly as made'],
                        ['words', 'As words, in your church’s look'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={as === id}
                        disabled={id === 'pictures' && found.from !== 'pdf'}
                        onClick={() => setAs(id)}
                        className={`h-[38px] px-3.5 rounded-lg text-sm ${as === id ? 'bg-foreground text-background font-semibold' : 'text-muted-foreground font-medium'} disabled:opacity-40`}
                        data-add-as={id}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[13px] text-muted-foreground">Pictures keep the preacher’s design. Words use your Looks, and can be edited and shown on the stream lower third.</span>
                </div>
                {hasNotes && (
                  <div className="w-[330px] rounded-2xl bg-muted/50 p-4 flex flex-col gap-2.5">
                    <label className="flex items-center justify-between gap-3 text-sm font-semibold">
                      Notes to the stage monitor
                      <Switch checked={notesToStage} onCheckedChange={setNotesToStage} />
                    </label>
                    <span className="text-[13px] text-muted-foreground">The speaker notes under each slide show on the stage TVs when that slide is up.</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5" role="group" aria-label="Pages to add">
                {found.pages.map((p, i) => {
                  const on = pages.has(i);
                  const picture = as === 'pictures' ? p.image : p.picture;
                  return (
                    <button key={i} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(pages, i, setPages)} className="flex flex-col gap-1.5 text-left" data-add-page={i}>
                      <span className={`relative aspect-video rounded-lg overflow-hidden bg-[#141821] grid place-items-center p-2.5 ${on ? 'outline outline-2 outline-primary' : 'outline outline-1 outline-border opacity-60'}`}>
                        {picture && <img src={picture} alt="" className={`absolute inset-0 w-full h-full ${as === 'pictures' ? 'object-contain' : 'object-cover opacity-50'}`} />}
                        {as === 'words' && <span className="relative font-serif text-[14px] leading-snug text-white text-center line-clamp-3">{p.title || p.text.split('\n')[0]}</span>}
                        <span className="absolute top-1.5 left-1.5">
                          <Tick on={on} />
                        </span>
                      </span>
                      <span className="text-[13px] text-muted-foreground">
                        {found.from === 'pdf' ? 'Page' : 'Slide'} {i + 1}
                        {on ? '' : ' · left out'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {found.from === 'pptx' && (
                <div className="mt-4 rounded-xl bg-blue-500/10 px-4 py-3 flex gap-2.5 items-start text-[13px] text-blue-200/90">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-300" />
                  <span>A PowerPoint file adds its words and pictures in your look. For an exact copy of a PowerPoint, Keynote or Google Slides design, save it as a PDF first (in PowerPoint: File → Export → PDF) and add the PDF.</span>
                </div>
              )}
            </>
          )}

          {found?.kind === 'notes' && (
            <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-4">
              <section className="min-w-0 rounded-2xl bg-muted/50 p-4 flex flex-col gap-3" aria-label="Scriptures">
                <h3 className="m-0 flex items-center gap-2.5 text-base font-bold">
                  <span className="w-[30px] h-[30px] rounded-lg bg-blue-600 grid place-items-center text-white">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  Scriptures · {found.scriptures.length}
                </h3>
                {found.scriptures.length === 0 && <p className="m-0 text-sm text-muted-foreground">No Bible references were found in the notes.</p>}
                <div className="flex flex-col gap-1.5">
                  {found.scriptures.map((s) => {
                    const on = verses.has(s.reference);
                    return (
                      <button key={s.reference} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(verses, s.reference, setVerses)} className="min-h-[44px] flex items-center gap-3 px-2.5 py-1.5 rounded-lg bg-background/50 text-left" data-add-verse={s.reference}>
                        <Tick on={on} />
                        <span className="text-[15px] font-semibold w-[150px] flex-shrink-0">{s.reference}</span>
                        <span className="min-w-0 text-[13px] text-muted-foreground truncate">{s.chapterOnly ? `Mentioned in passing? ${s.preview}` : s.preview}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="m-0 text-[13px] text-muted-foreground leading-snug">They go in the sermon as scripture slides. Listening finds them more easily, though a verse still goes up by itself only when it is said outright. Loading them puts the first in Next.</p>
              </section>

              <div className="min-w-0 flex flex-col gap-4">
                <section className="rounded-2xl bg-muted/50 p-4 flex flex-col gap-2.5" aria-label="Points">
                  <h3 className="m-0 flex items-center gap-2.5 text-base font-bold">
                    <span className="w-[30px] h-[30px] rounded-lg bg-amber-600 grid place-items-center text-white">
                      <ListOrdered className="w-4 h-4" />
                    </span>
                    Points · {found.points.length}
                    <span className="ml-auto text-[13px] font-normal text-muted-foreground">Each becomes a slide</span>
                  </h3>
                  {found.points.length === 0 && <p className="m-0 text-sm text-muted-foreground">No headings or numbered points were found.</p>}
                  {found.points.map((p) => {
                    const on = points.has(p);
                    return (
                      <button key={p} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(points, p, setPoints)} className="min-h-[44px] flex items-center gap-3 px-2.5 py-1.5 rounded-lg bg-background/50 text-left" data-add-point>
                        <Tick on={on} />
                        <span className="text-[15px]">{p}</span>
                      </button>
                    );
                  })}
                </section>
                <section className="rounded-2xl bg-muted/50 p-4 flex flex-col gap-2" aria-label="The rest of the notes">
                  <label className="flex items-center justify-between gap-3 text-base font-bold">
                    The rest of the notes
                    <Switch checked={notesToStage} onCheckedChange={setNotesToStage} aria-label="Show the notes on the stage monitor" />
                  </label>
                  <span className="text-[13px] text-muted-foreground leading-snug">On the stage monitor during the sermon, for the preacher. Never on the projector or the stream.</span>
                </section>
              </div>
            </div>
          )}
        </div>

        <footer className="mt-4 px-7 py-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground" data-add-summary>
            {found?.kind === 'presentation'
              ? `${summary}${found.scriptures.length ? ` · ${found.scriptures.length} scripture${found.scriptures.length === 1 ? '' : 's'} found in them (${found.scriptures
                  .slice(0, 3)
                  .map((s) => s.reference)
                  .join(', ')}${found.scriptures.length > 3 ? '…' : ''}) also go in the sermon` : ''}`
              : summary}
          </span>
          <div className="flex gap-2.5">
            <Button variant="secondary" className="h-11 px-5" onClick={onClose}>
              Cancel
            </Button>
            <Button className="h-11 px-5 font-bold" disabled={nothing || adding} onClick={() => void add()} data-add-confirm>
              {found?.kind === 'presentation' ? `Add ${pages.size} slide${pages.size === 1 ? '' : 's'} to ${sectionName}` : `Add to ${sectionName}`}
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
