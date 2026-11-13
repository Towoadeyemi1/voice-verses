import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Hand, PlayCircle, Wand2 } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import '@/components/settings/settings.css';
import { loadProgress, startLesson, TRAINING_CHANGED, TrainingProgress } from '@/lib/guide';
import { COMING, GROUPS, LessonCard, LESSONS, lessonById } from '@/lib/lessons';
import { showBoothSetup } from '@/lib/boothSetup';

/**
 * Training (1.19.1, approved mock-up docs/design/training/Main.dc.html): every
 * lesson by who needs it. Show me: Voice Verses does each step on the real
 * screens, with a pointer and a voice. Let me try: you do it, it waits and
 * checks. Everything runs in practice: nothing reaches the room.
 */
const Training = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<TrainingProgress>(loadProgress);
  useEffect(() => {
    const sync = () => setProgress(loadProgress());
    window.addEventListener(TRAINING_CHANGED, sync);
    return () => window.removeEventListener(TRAINING_CHANGED, sync);
  }, []);

  const open = (card: LessonCard, mode: 'show' | 'try' = 'show') => {
    if (card.kind === 'booth-setup') {
      showBoothSetup();
      navigate('/');
      return;
    }
    // Lessons happen on the live screen; the guide takes it from there
    navigate('/');
    startLesson(card.lesson.id, mode);
  };

  const last = progress.last && lessonById(progress.last.id) && !progress.done[progress.last.id] ? progress.last : null;
  const lastCard = last ? lessonById(last.id)! : null;
  const total = LESSONS.length;
  const finished = LESSONS.filter((c) => progress.done[c.lesson.id]).length;

  return (
    <AppShell
      title="Training"
      subtitle="Short lessons on the real screens. Watch it done, with a voice and a pointer, or do it yourself."
      actions={<span className="text-sm text-muted-foreground">{finished} of {total} done on this computer</span>}
      wide
    >
      <div className="vvs tr-page" data-training>
        <div className="tr-main">
          {last && lastCard && (
            <div className="tr-carry" data-training-carry>
              <span className="ring" role="img" aria-label={`${last.step} of ${last.of} steps done`} style={{ background: `conic-gradient(var(--s-accent) 0 ${Math.round((last.step / last.of) * 100)}%, var(--s-fill-2) 0 100%)` }}>
                <b>
                  {last.step}/{last.of}
                </b>
              </span>
              <span className="text">
                <b>Carry on: {lastCard.lesson.title}</b>
                <span>{lastCard.lesson.steps[last.step]?.say ?? ''}</span>
              </span>
              <button type="button" className="st-btn primary" onClick={() => (navigate('/'), startLesson(last.id, last.mode, last.step))}>
                Carry on
              </button>
            </div>
          )}

          {GROUPS.map((g) => {
            const cards = LESSONS.filter((c) => c.group === g.id);
            const coming = COMING.filter((c) => c.group === g.id);
            return (
              <section key={g.id} className="tr-group">
                <header>
                  <h2>{g.title}</h2>
                  <span>{g.who}</span>
                </header>
                <div className="tr-grid">
                  {cards.map((card) => {
                    const done = !!progress.done[card.lesson.id];
                    const steps = card.lesson.steps.length;
                    return (
                      <div key={card.lesson.id} className="tr-card" data-lesson={card.lesson.id}>
                        <div className="top">
                          <b>{card.lesson.title}</b>
                          <span className={`st-pill ${done ? '' : 'accent'}`}>{done ? '✓ Done' : 'New'}</span>
                        </div>
                        <p>{card.lesson.desc}</p>
                        <span className="meta">
                          {steps ? `${steps} steps · ` : ''}
                          {card.lesson.minutes} min
                        </span>
                        <div className="acts">
                          {card.kind === 'demo' ? (
                            <button type="button" className="st-btn soft" onClick={() => open(card)} data-lesson-show>
                              <PlayCircle />
                              Watch
                            </button>
                          ) : card.kind === 'booth-setup' ? (
                            <button type="button" className="st-btn soft" onClick={() => open(card)} data-lesson-show>
                              <Wand2 />
                              Open
                            </button>
                          ) : (
                            <>
                              <button type="button" className="st-btn soft" onClick={() => open(card, 'show')} data-lesson-show>
                                <Eye />
                                Show me
                              </button>
                              <button type="button" className="st-btn" onClick={() => open(card, 'try')} data-lesson-try>
                                <Hand />
                                Let me try
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {coming.map((c) => (
                    <div key={c.title} className="tr-card soon">
                      <div className="top">
                        <b>{c.title}</b>
                        <span className="st-pill">Coming soon</span>
                      </div>
                      <p>{c.desc}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="tr-side">
          <div className="tr-box">
            <b>Practice</b>
            <p>Every lesson runs in practice. Live, Next and Take work as usual, but nothing reaches the projector, stream, stage or ProPresenter.</p>
            <span className="tr-band">Practice: nothing goes to the room</span>
            <span className="small">The voice is your computer’s own, so it works offline. Turn it off on any lesson card.</span>
          </div>
          <div className="tr-box">
            <b>Stuck during a service?</b>
            <p>
              Every warning has a button that takes you straight to the fix. <b>When something goes wrong</b> shows where.
            </p>
          </div>
          <div className="tr-box">
            <b>New computer?</b>
            <p>Set up your booth opens by itself the first time Voice Verses starts. Run it again any time.</p>
            <button type="button" className="st-btn" onClick={() => open(LESSONS.find((c) => c.kind === 'booth-setup')!)}>
              <Wand2 />
              Set up your booth
            </button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
};

export default Training;
