import { CSSProperties, useEffect, useState } from 'react';
import { BibleVerse } from '@/types/bible';
import { Slide } from '@/types/service';
import { SyncMessage, syncService } from '@/lib/syncService';
import { plainVerseText } from '@/lib/verseText';
import { BibleParser } from '@/lib/bibleParser';
import { formatRemaining } from '@/lib/countdown';
import { useCountdowns } from '@/hooks/use-countdown';
import { countdownTone, TONE_COLOR } from '@/lib/countdown';
import { useAlert } from '@/hooks/use-alert';
import { VerseText } from './VerseText';
import { FitText } from './FitText';
import { SlideDisplay } from './SlideDisplay';

export interface ConfidenceSettings {
  /** The words on the screens now: the largest they may be (they shrink to fit) */
  currentVerseFontSize: number;
  /** What comes next: its lines (its name is a little smaller) */
  nextVerseFontSize: number;
  clockFontSize: number;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  clockFormat: '12h' | '24h';
  /** How many things Next shows; 0 switches Next off */
  nextVerseCount: number;
  /** 2: the layout approved 27 Nov 2026 (sizes for reading from the platform) */
  layout?: number;
}

/** What comes next on the stage (approved mock-up docs/design/stage-monitor.html) */
interface NextItem {
  /** What it is: "Verse 2", "Romans 8:29", "Baptism class" */
  name: string;
  /** What it belongs to: the song, the part of the service, "next verse" */
  of?: string;
  /** Its first lines */
  lines?: string;
  scripture?: boolean;
  /** A picture slide (an announcement graphic, a presentation page): shown, not described */
  picture?: string;
}

/** What each kind of slide is called on the stage (plain words, not the app's own names) */
const KIND: Record<string, string> = { scripture: 'Scripture', lyrics: 'Song', announcement: 'Announcement', image: 'Picture', video: 'Video', blank: 'Blank' };

/** On air and next keep their meaning on the stage too, always with their words */
const NOW_RED = '#ff453a';
const NEXT_GREEN = '#30d158';

export const defaultConfidenceSettings: ConfidenceSettings = {
  currentVerseFontSize: 96,
  nextVerseFontSize: 56,
  clockFontSize: 56,
  backgroundColor: '#000000',
  textColor: '#FFFFFF',
  accentColor: '#F5C451',
  clockFormat: '12h',
  nextVerseCount: 1,
  layout: 2,
};

const SETTINGS_KEY = 'cornerstone-confidence-settings';

/**
 * Settings saved before the 1.19.21 layout were sized for a side column read from close by (Next at
 * 20–34 px). Sizes the church never changed from a layout move to that layout's new sizes; sizes it
 * chose itself are kept, with Next raised to at least 44 px so it reads from the platform.
 */
function upgrade(saved: Partial<ConfidenceSettings>): Partial<ConfidenceSettings> {
  if (saved.layout === 2) return saved;
  const OLD: Record<string, [number, number, number]> = { classic: [60, 24, 36], large: [88, 28, 32], preacher: [52, 24, 72], singers: [64, 34, 28], contrast: [72, 28, 40] };
  const NEW: Record<string, [number, number, number]> = { classic: [96, 56, 56], large: [120, 56, 48], preacher: [84, 48, 96], singers: [96, 64, 44], contrast: [104, 56, 60] };
  const sizes = [saved.currentVerseFontSize, saved.nextVerseFontSize, saved.clockFontSize];
  const was = Object.keys(OLD).find((k) => OLD[k].every((v, i) => sizes[i] === undefined || sizes[i] === v));
  if (was) {
    const [c, n, k] = NEW[was];
    // The old Classic layout's blue becomes the gold of the new one, when the church never changed it
    const accentColor = was === 'classic' && (saved.accentColor ?? '#3B82F6').toUpperCase() === '#3B82F6' ? '#F5C451' : saved.accentColor;
    return { ...saved, currentVerseFontSize: c, nextVerseFontSize: n, clockFontSize: k, accentColor, layout: 2 };
  }
  return { ...saved, nextVerseFontSize: Math.max(44, saved.nextVerseFontSize ?? 56), layout: 2 };
}

export function loadConfidenceSettings(): ConfidenceSettings {
  try {
    return { ...defaultConfidenceSettings, ...upgrade(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')) };
  } catch {
    return defaultConfidenceSettings;
  }
}

export function saveConfidenceSettings(settings: ConfidenceSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, layout: 2 }));
}

const reference = (v: BibleVerse) => `${v.book} ${v.chapter}:${v.verse}`;
const cap = (s?: string) => (s ? s[0].toUpperCase() + s.slice(1) : '');
/** The first lines of some words, for Next */
const firstLines = (text: string, n = 2) => text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, n).join('\n');

/** A song's part as people call it: "Verse 2", "Chorus" */
const partOfSong = (slide: Slide) => (slide.type === 'lyrics' ? slide.sectionLabel || cap(slide.section) || `${slide.slideNumber} of ${slide.totalSlides}` : '');

/** What is on now, in the top line: what it is, and where it belongs */
function nowLine(slide: Slide | null, verse: BibleVerse | null, part: string | undefined): [string, string] | null {
  if (slide?.type === 'lyrics') return [slide.songTitle || slide.title, partOfSong(slide)];
  if (slide?.type === 'scripture' && slide.verse) return [reference(slide.verse), part ?? 'Scripture'];
  if (slide) return [slide.title, part ?? KIND[slide.type] ?? ''];
  if (verse) return [reference(verse), 'Scripture'];
  return null;
}

/** One thing that comes next, named by its part ("Verse 2"), with its first lines or its picture */
function nextOf(slide: Slide, part: string | undefined, fromNextPart: boolean): NextItem {
  switch (slide.type) {
    case 'lyrics':
      // A song in the next part: its title, then the part's name ("Worship"), or its first section when they are the same
      return fromNextPart
        ? { name: slide.songTitle || slide.title, of: part && part !== (slide.songTitle || slide.title) ? part : partOfSong(slide), lines: firstLines(slide.content) }
        : { name: partOfSong(slide), of: slide.songTitle || slide.title, lines: firstLines(slide.content) };
    case 'scripture':
      return { name: slide.verse ? reference(slide.verse) : slide.title, of: part ?? 'Scripture', lines: slide.verse ? plainVerseText(slide.verse.text) : undefined, scripture: true };
    case 'announcement':
      return { name: slide.title, of: part && part !== slide.title ? part : 'Announcement', lines: firstLines(slide.content), picture: slide.content ? undefined : slide.imageUrl };
    case 'image':
      return { name: slide.title, of: part && part !== slide.title ? part : 'Picture', picture: slide.imageUrl };
    case 'video':
      return { name: slide.title, of: part ? `${part} · Video` : 'Video' };
    default:
      return { name: 'A blank screen', of: part };
  }
}

/**
 * The confidence monitor (approved mock-up docs/design/stage-monitor.html): what is on now, named
 * once at the top; the words as large as they fit; what comes next along the bottom, named by its
 * part and readable from the platform; the clock, stage countdowns, stage messages and notes. The
 * confidence window and the operator's previews all draw this at 1920 × 1080, so a preview is an
 * exact miniature.
 */
export const ConfidenceScreen = ({ settings, className, style }: { settings: ConfidenceSettings; className?: string; style?: CSSProperties }) => {
  const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
  const [currentVerse, setCurrentVerse] = useState<BibleVerse | null>(null);
  /** The part of the service on now ("The reading") */
  const [part, setPart] = useState<string | undefined>(undefined);
  const [nextItems, setNextItems] = useState<NextItem[]>([]);
  /** The preacher's notes for what is on screen (stage only) */
  const [notes, setNotes] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { countdowns, now } = useCountdowns();
  const stageCountdowns = countdowns.filter((c) => c.confidence);
  const stageAlert = useAlert('stage');
  const count = Math.max(0, settings.nextVerseCount);

  useEffect(() => {
    // Opened mid-service, or reloaded: catch up first, then follow changes
    let latest = 0;
    const handle = async (message: SyncMessage) => {
      const call = ++latest;
      let verse: BibleVerse | null = null;
      let next: NextItem[] = [];
      let partNow: string | undefined;

      if (message.type === 'SLIDE_UPDATE') {
        const slide = message.data.slide ?? null;
        partNow = slide ? message.data.part : undefined;
        setCurrentSlide(slide);
        setNotes(slide ? (message.data.notes ?? null) : null);
        if (slide?.type === 'scripture' && slide.verse) verse = slide.verse;
        // In a service, "next" is the next slide in the service, not the next verse in the Bible;
        // after the last slide of a part, it is the first of the next part
        const index = message.data.slideIndex ?? message.data.index ?? -1;
        const upcoming = message.data.upcoming ?? message.data.allSlides?.slice(index + 1) ?? [];
        next = upcoming.slice(0, count).map((s) => nextOf(s, partNow, false));
        const after = message.data.nextPart;
        if (slide && next.length < count && after) next.push(...after.slides.slice(0, count - next.length).map((s) => nextOf(s, after.name, true)));
      } else if (message.type === 'VERSE_UPDATE' && message.data.verse !== undefined) {
        verse = message.data.verse ?? null;
        setCurrentSlide(null);
        setNotes(null);
        if (verse) {
          for (let i = 1; i <= count; i++) {
            const nextVerse = await BibleParser.getVerse(verse.book, verse.chapter, verse.verse + i);
            if (!nextVerse) break;
            next.push({ name: reference(nextVerse), of: 'next verse', lines: plainVerseText(nextVerse.text), scripture: true });
          }
        }
      } else if (message.type === 'LOGO') {
        setCurrentSlide(null);
        setNotes(null);
      } else {
        return;
      }

      if (call !== latest) return; // a newer message arrived while looking up verses
      setCurrentVerse(verse);
      setPart(partNow);
      setNextItems(next);
    };

    const live = syncService.current();
    if (live) handle(live);
    const unsubscribe = syncService.subscribe(handle);

    // Update clock every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [count]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: settings.clockFormat === '12h' });

  const ink = settings.textColor;
  /** Quieter words: 75% of the text colour (readable on the stage's background) */
  const quiet = `${ink}BF`;
  const line = `${ink}22`;
  const top = nowLine(currentSlide, currentVerse, part);
  const topSize = Math.round(settings.clockFontSize * 0.72);
  const tagSize = Math.round(topSize * 0.76);
  const scripture = currentSlide?.type === 'scripture' && currentSlide.verse ? currentSlide.verse : !currentSlide ? currentVerse : null;
  const words = currentSlide?.type === 'lyrics' ? currentSlide.content : currentSlide?.type === 'announcement' ? currentSlide.content : null;
  const picture = currentSlide?.type === 'image' || (currentSlide?.type === 'announcement' && !currentSlide.content && currentSlide.imageUrl) ? currentSlide : null;
  const nameSize = Math.round(settings.nextVerseFontSize * 0.82);

  return (
    <div className={`relative flex flex-col overflow-hidden ${className ?? ''}`} style={{ ...style, backgroundColor: settings.backgroundColor, color: ink }} data-stage>
      {/* A note for the people on stage: big, across the top, over everything */}
      {stageAlert && (
        <div
          key={stageAlert.id}
          data-stage-alert={stageAlert.text}
          className={`absolute left-0 right-0 top-0 z-10 flex items-center justify-center gap-4 px-8 py-6 font-bold text-center ${stageAlert.flash ? 'vv-blink' : ''}`}
          style={{
            fontSize: `${Math.round(settings.currentVerseFontSize * 0.75)}px`,
            lineHeight: 1.15,
            background: stageAlert.urgent ? '#b45309' : '#1d4ed8',
            color: '#ffffff',
            animation: 'vv-in-lift 0.4s cubic-bezier(0.4, 0, 0.2, 1) both',
          }}
        >
          {stageAlert.text}
        </div>
      )}

      {/* NOW: what it is and where it belongs, said once; the countdowns and the clock */}
      <div className="flex items-center gap-7 px-16 flex-shrink-0" style={{ minHeight: Math.round(topSize * 2.8), borderBottom: `2px solid ${line}` }}>
        <div className="flex items-center gap-[0.45em] min-w-0 font-bold" style={{ fontSize: `${topSize}px` }} data-stage-now>
          <span className="flex items-center gap-3 font-extrabold tracking-[0.06em] flex-shrink-0" style={{ fontSize: `${tagSize}px`, color: NOW_RED }}>
            <i className="rounded-full" style={{ width: tagSize * 0.6, height: tagSize * 0.6, background: NOW_RED }} />
            NOW
          </span>
          {top ? (
            <>
              <span className="truncate">{top[0]}</span>
              {top[1] && <span className="whitespace-nowrap font-semibold" style={{ color: quiet }}>· {top[1]}</span>}
            </>
          ) : (
            <span className="font-semibold" style={{ color: quiet }}>Nothing on the screens</span>
          )}
        </div>
        <div className="ml-auto flex items-baseline gap-9 tabular-nums flex-shrink-0">
          {stageCountdowns.map((countdown) => {
            const remaining = countdown.endsAt - now;
            const tone = countdownTone(countdown, remaining);
            return (
              <div
                key={countdown.id}
                data-stage-countdown={tone}
                className={`font-extrabold rounded-[10px] flex items-baseline gap-3.5 leading-none ${countdown.flash && tone !== 'normal' ? 'vv-blink' : ''}`}
                title={countdown.message}
                style={{
                  color: tone === 'over' ? '#ffffff' : TONE_COLOR[tone] ?? settings.accentColor,
                  backgroundColor: tone === 'over' ? '#c81e1e' : 'transparent',
                  padding: tone === 'over' ? '6px 18px' : undefined,
                }}
              >
                <span className="font-bold" style={{ fontSize: `${Math.round(settings.clockFontSize * 0.5)}px`, color: tone === 'over' ? '#ffffff' : quiet }}>{countdown.message}</span>
                <span style={{ fontSize: `${Math.round(settings.clockFontSize * 1.15)}px` }}>{formatRemaining(remaining, { overrun: true })}</span>
              </div>
            );
          })}
          <div className="font-bold" style={{ fontSize: `${settings.clockFontSize}px`, color: ink }}>
            {formatTime(currentTime)}
          </div>
        </div>
      </div>

      {/* The words on the screens now, as large as they fit */}
      <div className="flex-1 min-h-0 flex flex-col px-16 py-9 gap-8">
        {picture ? (
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <div className="h-full max-w-full aspect-video rounded-[10px] overflow-hidden bg-black">
              <SlideDisplay slide={picture} className="h-full w-full" />
            </div>
          </div>
        ) : currentSlide?.type === 'video' ? (
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <div className="h-full max-w-full aspect-video rounded-[10px] overflow-hidden">
              <SlideDisplay slide={currentSlide} className="h-full w-full" />
            </div>
          </div>
        ) : scripture ? (
          <FitText maxFontSize={settings.currentVerseFontSize} minFontSize={28} className="flex-1 min-h-0 font-scripture leading-[1.25] break-words" style={{ color: ink }}>
            <span className="font-sans font-extrabold align-top mr-[0.2em]" style={{ fontSize: '0.55em', color: settings.accentColor }}>
              {scripture.verse}
            </span>
            <VerseText text={scripture.text} />
          </FitText>
        ) : words !== null && words !== undefined ? (
          <FitText maxFontSize={settings.currentVerseFontSize} minFontSize={28} className="flex-1 min-h-0 font-semibold leading-[1.22] tracking-[-0.01em] whitespace-pre-line break-words" style={{ color: ink }}>
            {words}
          </FitText>
        ) : (
          <div className="flex-1 grid place-items-center text-center font-semibold" style={{ fontSize: `${Math.round(settings.currentVerseFontSize * 0.6)}px`, color: quiet }}>
            {currentSlide ? '' : 'Waiting for the first verse or slide'}
          </div>
        )}
        {notes && (
          <div
            className="flex-shrink-0 max-h-[30%] overflow-hidden whitespace-pre-line leading-[1.3]"
            style={{ color: quiet, fontSize: `${Math.round(settings.nextVerseFontSize * 0.8)}px`, borderLeft: `6px solid ${settings.accentColor}`, paddingLeft: 26 }}
            data-stage-notes
          >
            <b className="mr-3" style={{ color: ink }}>Notes</b>
            {notes}
          </div>
        )}
      </div>

      {/* NEXT, along the bottom: named by its part, readable from the platform */}
      {count > 0 && nextItems.length > 0 && (
        <div className="flex-shrink-0 flex flex-col gap-6 px-16 pt-7 pb-9" style={{ backgroundColor: `${ink}14`, borderTop: `2px solid ${line}` }} data-stage-next>
          {nextItems.map((item, i) => (
            <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-10">
              <span className="flex items-center gap-3 font-extrabold tracking-[0.06em] pt-2" style={{ fontSize: `${tagSize}px`, color: NEXT_GREEN, visibility: i ? 'hidden' : undefined }}>
                <i className="rounded-full" style={{ width: tagSize * 0.6, height: tagSize * 0.6, background: NEXT_GREEN }} />
                NEXT
              </span>
              <div className="min-w-0">
                <div className="font-extrabold truncate" style={{ fontSize: `${nameSize}px` }} data-stage-next-name>
                  {item.name}
                  {item.of && <span className="font-semibold" style={{ color: quiet }}> · {item.of}</span>}
                </div>
                {item.lines && (
                  <div
                    className={`mt-1.5 leading-[1.25] whitespace-pre-line line-clamp-2 ${item.scripture ? 'font-scripture font-medium' : 'font-semibold'}`}
                    style={{ fontSize: `${settings.nextVerseFontSize}px` }}
                  >
                    {item.lines}
                  </div>
                )}
              </div>
              {item.picture ? (
                <img src={item.picture} alt={item.name} className="h-[180px] aspect-video object-contain bg-black rounded-lg" data-stage-next-picture />
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
