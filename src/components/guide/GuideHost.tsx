import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pause, Play, Volume2, VolumeX, X } from 'lucide-react';
import '@/components/settings/settings.css';
import './guide.css';
import { find, GuideMode, GuideStep, Lesson, lessonAsked, NARRATE, Narration, pressKey, saveProgress, setVoiceOn, speak, START_LESSON, stopSpeaking, typeInto, until, voiceOn } from '@/lib/guide';
import { lessonById } from '@/lib/lessons';
import { PRACTICE_CHANGED, practising, setPractice } from '@/lib/practice';

export const PLAY_DEMO = 'voice-verses-play-demo';

type Box = { x: number; y: number; w: number; h: number };
const PAD = 8;
const CARD_W = 400;

const boxOf = (el: HTMLElement | null): Box | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width || r.height ? { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 } : null;
};

/** What a wrong click landed on, in the volunteer's words ("Settings", "Take") */
const nameOf = (x: number, y: number, overlay: HTMLElement | null): string => {
  const under = document.elementsFromPoint(x, y).find((el) => !overlay?.contains(el));
  const el = under?.closest<HTMLElement>('button, a, [role="button"], [data-guide], input');
  const label = el?.getAttribute('aria-label') || el?.getAttribute('title') || el?.textContent || '';
  return label.replace(/\s+/g, ' ').trim().slice(0, 40);
};

/**
 * Where the card goes, never over what it is about: beside a control on the right-hand side
 * (the screens column), else under it if it fits, else above; `above` for a search box, whose
 * results show underneath. Always on screen.
 */
function cardPlace(box: Box | null, height: number, prefer?: 'above'): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!box) return { left: Math.max(16, (vw - CARD_W) / 2), top: Math.max(16, vh / 2 - height / 2) };
  const left = Math.min(Math.max(16, box.x + box.w / 2 - CARD_W / 2), vw - CARD_W - 16);
  const top = (y: number) => Math.min(Math.max(16, y), vh - height - 70);
  if (prefer === 'above' && box.y - 16 - height > 16) return { left, top: box.y - 16 - height };
  if (box.x + box.w / 2 > vw * 0.6 && box.x - 24 - CARD_W > 16) return { left: box.x - 24 - CARD_W, top: top(box.y + box.h / 2 - height / 2) };
  if (box.y + box.h + 16 + height < vh - 60) return { left, top: box.y + box.h + 16 };
  if (box.y - 16 - height > 16) return { left, top: box.y - 16 - height };
  const beside = box.x - 16 - CARD_W > 16 ? box.x - 16 - CARD_W : Math.min(box.x + box.w + 16, vw - CARD_W - 16);
  return { left: beside, top: top(box.y) };
}

/**
 * The guide (1.19.1): Training's lessons and the demo's narration, over the
 * real screens. A spotlight on one control, a pointer that moves there and
 * clicks, and a card with one short line that is also said aloud.
 */
export function GuideHost() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [mode, setMode] = useState<GuideMode>('show');
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [tap, setTap] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);
  const [hint, setHint] = useState<{ text: string; offerShow: boolean } | null>(null);
  const [paused, setPaused] = useState(false);
  const [voice, setVoice] = useState(voiceOn);
  const [narration, setNarration] = useState<Narration | null>(null);
  const [cardH, setCardH] = useState(220);
  const overlay = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const run = useRef(0);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const wrong = useRef(0);
  const target = useRef<string | undefined>();

  const step: GuideStep | undefined = lesson?.steps[index];

  // Follow the spotlit control as the page moves (a dialog opening, a list scrolling)
  useEffect(() => {
    if (!lesson && !narration) return;
    const follow = () => setBox(boxOf(find(target.current)));
    follow();
    const timer = window.setInterval(follow, 120);
    return () => window.clearInterval(timer);
  }, [lesson, narration, index]);

  useEffect(() => {
    if (card.current && card.current.offsetHeight !== cardH) setCardH(card.current.offsetHeight);
  });

  const pointAt = (el: HTMLElement | null) => {
    const b = boxOf(el);
    if (b) setPointer({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
  };

  // ---- Running a lesson ---------------------------------------------------------------------

  const lessonRef = useRef<Lesson | null>(null);
  lessonRef.current = lesson;
  const end = useCallback((finished: boolean) => {
    run.current++;
    stopSpeaking();
    const l = lessonRef.current;
    lessonRef.current = null;
    if (l) {
      if (finished)
        saveProgress((p) => {
          const { last: _last, ...rest } = p;
          return { ...rest, done: { ...p.done, [l.id]: new Date().toISOString() } };
        });
      if (l.practice !== false && practising()) setPractice(false);
    }
    setLesson(null);
    target.current = undefined;
    setPointer(null);
    setSuccess(null);
    setHint(null);
    setPaused(false);
  }, []);

  const go = useCallback(
    async (l: Lesson, m: GuideMode, from: number) => {
      const me = ++run.current;
      const alive = () => run.current === me;
      const whilePaused = () => until(() => !pausedRef.current, 24 * 3600_000, alive);
      const wait = (ms: number) => until(() => false, ms, alive);
      for (let i = from; i < l.steps.length; i++) {
        if (!alive()) return;
        const s = l.steps[i];
        setIndex(i);
        setSuccess(null);
        setHint(null);
        wrong.current = 0;
        saveProgress((p) => ({ ...p, last: { id: l.id, step: i, of: l.steps.length, mode: m } }));
        if (s.route && window.location.hash.replace(/^#/, '').split('?')[0] !== s.route) {
          navigate(s.route);
          await wait(700);
        }
        if (s.skip?.()) continue;
        target.current = s.target;
        const el = s.target ? (await until(() => !!find(s.target), 6000, alive)) && find(s.target) : null;
        if (!alive()) return;
        setBox(boxOf(el));
        const show = m === 'show' || s.watchOnly;
        await whilePaused();
        if (show) {
          pointAt(el);
          await wait(el ? 750 : 200);
          await speak(s.say);
          await whilePaused();
          if (!alive()) return;
          const now = (s.target && find(s.target)) || el;
          if (s.click && now) {
            setTap((t) => t + 1);
            await wait(250);
            now.click();
          }
          if (s.type && now) await typeInto(now, s.type, alive);
          if (s.key) pressKey(now ?? (document.activeElement as HTMLElement | null) ?? document.body, s.key);
          if (s.done) await until(s.done, 5000, alive);
        } else {
          pointAt(el);
          void speak(s.say);
          // Let me try: wait for the volunteer; the check is what the app really did
          await until(() => !!s.done?.(), 24 * 3600_000, alive);
        }
        if (!alive()) return;
        const said = typeof s.doneSay === 'function' ? s.doneSay() : s.doneSay;
        if (said || !show) {
          setSuccess(said ?? 'That’s it.');
          await speak(said ?? 'That’s it.');
        }
        await wait(450);
      }
      if (alive()) end(true);
    },
    [end, navigate],
  );

  const start = useCallback(
    (id: string, m: GuideMode, from = 0) => {
      const card = lessonById(id);
      if (!card) return;
      // The demo plays on the live screen, narrated by the guide
      if (card.kind === 'demo') {
        end(false);
        navigate('/');
        void until(() => !!find('[data-guide="live"]'), 6000).then(() => window.dispatchEvent(new CustomEvent(PLAY_DEMO, { detail: { practice: true } })));
        saveProgress((p) => ({ ...p, done: { ...p.done, demo: new Date().toISOString() } }));
        return;
      }
      const l = card.lesson;
      if (l.practice !== false) setPractice(true, l.title);
      lessonRef.current = l;
      setLesson(l);
      setMode(m);
      setPaused(false);
      void go(l, m, from);
    },
    [end, go, navigate],
  );

  useEffect(() => {
    const asked = lessonAsked();
    if (asked) start(asked.id, asked.mode, asked.step);
    const onStart = (e: Event) => {
      lessonAsked();
      const d = (e as CustomEvent<{ id: string; mode: GuideMode; step: number }>).detail;
      start(d.id, d.mode, d.step ?? 0);
    };
    // Ending practice from its band ends the lesson too
    const onPractice = () => {
      if (!practising() && lessonRef.current && lessonRef.current.practice !== false) end(false);
    };
    window.addEventListener(START_LESSON, onStart);
    window.addEventListener(PRACTICE_CHANGED, onPractice);
    return () => {
      window.removeEventListener(START_LESSON, onStart);
      window.removeEventListener(PRACTICE_CHANGED, onPractice);
    };
  }, [start, end]);

  // Esc leaves the lesson (and doesn't also clear the screens)
  useEffect(() => {
    if (!lesson) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !e.isTrusted) return;
      if (document.querySelector('[cmdk-input]')) return; // Esc closes the search first
      e.preventDefault();
      e.stopPropagation();
      end(false);
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [lesson, end]);

  // ---- The demo's narration -----------------------------------------------------------------

  useEffect(() => {
    const onNarrate = (e: Event) => {
      const n = (e as CustomEvent<Narration | null>).detail;
      setNarration(n);
      target.current = n?.target;
      const el = find(n?.target);
      setBox(boxOf(el));
      if (!n || !el) return setPointer(null);
      pointAt(el);
      if (n.click) window.setTimeout(() => setTap((t) => t + 1), 800);
    };
    window.addEventListener(NARRATE, onNarrate);
    return () => window.removeEventListener(NARRATE, onNarrate);
  }, []);

  // A lesson started on another page continues on the right page; leaving the app's pages ends nothing
  useEffect(() => {
    if (narration && pathname !== '/') setNarration(null);
  }, [pathname, narration]);

  if (!lesson && !narration) return null;

  const restart = (m: GuideMode, i = index) => {
    stopSpeaking();
    setMode(m);
    setPaused(false);
    void go(lesson!, m, i);
  };
  const toggleVoice = () => {
    setVoiceOn(!voice);
    setVoice(!voice);
  };
  /** Let me try: a click off the spotlight is stopped, and named */
  const missed = (e: React.MouseEvent) => {
    if (!lesson || mode === 'show' || step?.watchOnly) return;
    wrong.current++;
    const name = nameOf(e.clientX, e.clientY, overlay.current);
    setHint({ text: `${name ? `Nearly. That’s ${name}.` : 'Nearly.'} The lit one is the one to click.`, offerShow: wrong.current >= 2 });
  };

  const trying = !!lesson && mode === 'try' && !step?.watchOnly;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
  const dim = lesson ? 'rgba(8,7,10,.62)' : 'transparent';

  return createPortal(
    // Clicks on the guide never count as clicks outside an open dialog (the search stays open)
    <div ref={overlay} className="vv-guide" data-guide-overlay={lesson ? mode : 'narration'} onPointerDown={(e) => e.stopPropagation()}>
      {/* The dim, with a hole where the spotlit control is (clicks there reach it in Let me try) */}
      {lesson &&
        (box ? (
          <>
            <div className="dim" style={{ left: 0, top: 0, width: vw, height: Math.max(0, box.y), background: dim }} onClick={missed} />
            <div className="dim" style={{ left: 0, top: box.y + box.h, width: vw, height: Math.max(0, vh - box.y - box.h), background: dim }} onClick={missed} />
            <div className="dim" style={{ left: 0, top: box.y, width: Math.max(0, box.x), height: box.h, background: dim }} onClick={missed} />
            <div className="dim" style={{ left: box.x + box.w, top: box.y, width: Math.max(0, vw - box.x - box.w), height: box.h, background: dim }} onClick={missed} />
            {/* In Show me the app does the step: the volunteer's clicks wait */}
            {!trying && <div className="dim" style={{ left: box.x, top: box.y, width: box.w, height: box.h, background: 'transparent' }} />}
          </>
        ) : (
          <div className="dim" style={{ inset: 0, background: dim }} onClick={missed} />
        ))}
      {box && <div className={`spot ${trying ? 'waiting' : ''}`} style={{ left: box.x, top: box.y, width: box.w, height: box.h }} aria-hidden="true" />}

      {pointer && (
        <div className={`pointer ${trying ? 'beckon' : ''}`} style={{ transform: `translate(${pointer.x}px, ${pointer.y}px)` }} aria-hidden="true">
          <span key={tap} className={tap ? 'tap' : ''} />
          <svg width="28" height="32" viewBox="0 0 26 30">
            <path d="M2 2 L2 24 L8 18.5 L12.5 28 L16.5 26 L12 16.8 L20 16.5 Z" fill="#fff" stroke="#111" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {lesson && step ? (
        <div ref={card} className="vvs card" role="dialog" aria-label="Lesson step" aria-live="polite" style={cardPlace(box, cardH, step.target === '[cmdk-input]' ? 'above' : undefined)} data-guide-card>
          <div className="row">
            <span className={`st-pill ${mode === 'show' || step.watchOnly ? 'accent' : ''}`}>{mode === 'show' ? 'Show me' : 'Let me try'}</span>
            <span className="where">
              Step {index + 1} of {lesson.steps.length} · {lesson.title}
            </span>
            <button type="button" className="st-iconbtn" onClick={toggleVoice} aria-label={voice ? 'Turn the voice off' : 'Turn the voice on'} title={voice ? 'Voice on' : 'Voice off'}>
              {voice ? <Volume2 /> : <VolumeX />}
            </button>
            <button type="button" className="st-iconbtn" onClick={() => end(false)} aria-label="Leave the lesson" title="Leave the lesson (Esc)" data-guide-leave>
              <X />
            </button>
          </div>
          <b className="say" data-guide-say>
            {step.say}
          </b>
          {step.why && (
            <details className="why">
              <summary>Why?</summary>
              {step.why}
            </details>
          )}
          {success && (
            <p className="ok" data-guide-success>
              ✓ {success}
            </p>
          )}
          {hint && (
            <div className="hint" role="status" data-guide-hint>
              {hint.text}
              {hint.offerShow && (
                <button type="button" className="st-btn soft" onClick={() => restart('show')}>
                  Show me this step
                </button>
              )}
            </div>
          )}
          <div className="dashes" role="img" aria-label={`Step ${index + 1} of ${lesson.steps.length}`}>
            {lesson.steps.map((_, i) => (
              <span key={i} className={i <= index ? 'on' : ''} />
            ))}
          </div>
          <div className="row">
            <button type="button" className="st-btn" onClick={() => restart(mode, Math.max(0, index - 1))} disabled={index === 0}>
              <ArrowLeft />
              Back
            </button>
            {mode === 'show' && (
              <button type="button" className="st-btn" onClick={() => setPaused((p) => !p)} data-guide-pause>
                {paused ? <Play /> : <Pause />}
                {paused ? 'Carry on' : 'Pause'}
              </button>
            )}
            <span className="grow" />
            {step.watchOnly ? null : mode === 'show' ? (
              <button type="button" className="st-btn primary" onClick={() => restart('try')} data-guide-try>
                Let me try this step
              </button>
            ) : (
              <span className="waiting-text">Waiting for you…</span>
            )}
          </div>
        </div>
      ) : narration ? (
        <div ref={card} className="vvs card narration" role="status" aria-live="polite" style={cardPlace(box, cardH)} data-guide-narration>
          <div className="row">
            <span className="st-pill accent">{narration.label ?? 'Demo'}</span>
            <span className="grow" />
            <button type="button" className="st-iconbtn" onClick={toggleVoice} aria-label={voice ? 'Turn the voice off' : 'Turn the voice on'} title={voice ? 'Voice on' : 'Voice off'}>
              {voice ? <Volume2 /> : <VolumeX />}
            </button>
          </div>
          <b className="say">{narration.say}</b>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
