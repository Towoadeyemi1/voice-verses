import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, PlayCircle, RefreshCw, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { MicrophoneSettings } from '@/components/MicrophoneSettings';
import type { Pane } from '@/components/SettingsPanel';
import '@/components/settings/settings.css';
import { desktop, type DeckLinkConfig, type DisplayInfo, type NdiConfig, type ScreenConfig, type ScreenOutput } from '@/lib/desktop';
import { loadProPresenterSettings, saveProPresenterSettings } from '@/lib/proPresenter';
import { SERVICE_TYPES } from '@/lib/serviceTypes';
import { BOOTH_SETUP_CHANGED, BoothSetupState, confirmedCount, findSound, loadBoothSetup, loadChurchTypes, saveChurchTypes, SETUP_PARTS, SetupPart, SoundFound, SOUND_LEVEL, updateBoothSetup } from '@/lib/boothSetup';
import { channelCountOf, explainMicrophoneError, MAX_CHANNELS, openMicrophone } from '@/speech/audioInput';
import { loadSpeechSettings, saveSpeechSettings } from '@/speech';

/**
 * Set up your booth (1.19.0, approved mock-up docs/design/training/SetUp.dc.html):
 * what Voice Verses found on this computer and the network, one card each, for the
 * volunteer to confirm or change. Opens by itself the first time; from Settings →
 * Booth check afterwards.
 */
export function BoothSetup({ open, onClose, onSettings, onDemo }: { open: boolean; onClose: () => void; onSettings: (pane: Pane) => void; onDemo: () => void }) {
  const [state, setState] = useState<BoothSetupState>(loadBoothSetup);
  useEffect(() => {
    const sync = () => setState(loadBoothSetup());
    sync();
    window.addEventListener(BOOTH_SETUP_CHANGED, sync);
    return () => window.removeEventListener(BOOTH_SETUP_CHANGED, sync);
  }, [open]);

  const confirm = (part: SetupPart) => setState(updateBoothSetup((s) => ({ ...s, confirmed: { ...s.confirmed, [part]: new Date().toISOString() } })));
  const reopen = (part: SetupPart) =>
    setState(
      updateBoothSetup((s) => {
        const confirmed = { ...s.confirmed };
        delete confirmed[part];
        return { ...s, confirmed };
      }),
    );
  const done = confirmedCount(state);
  const all = done === SETUP_PARTS.length;
  const current = SETUP_PARTS.find((p) => !state.confirmed[p]);
  const now = (part: SetupPart): CardState => (state.confirmed[part] ? 'done' : part === current ? 'now' : 'later');

  /** Closing without finishing: it won't open by itself again (Settings → Booth check has it). */
  const later = () => {
    updateBoothSetup((s) => (s.finishedAt || s.laterAt ? s : { ...s, laterAt: new Date().toISOString() }));
    onClose();
  };
  const finish = (then?: () => void) => {
    updateBoothSetup((s) => ({ ...s, finishedAt: s.finishedAt ?? new Date().toISOString() }));
    onClose();
    then?.();
  };
  const goTo = (pane: Pane) => {
    later();
    onSettings(pane);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && later()}>
      <DialogContent
        className="vvs bs-sheet max-w-[1240px] w-[calc(100vw-48px)] max-h-[calc(100dvh-56px)] overflow-y-auto p-0 gap-0 border-0 sm:rounded-[18px] [&>button.absolute]:hidden"
        data-booth-setup
        // No button lit up on opening: the volunteer reads first
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <header className="bs-head">
          <div className="bs-title">
            <span className="bs-kicker">
              Set up your booth · {done} of {SETUP_PARTS.length} confirmed
            </span>
            <DialogTitle asChild>
              <h1>{state.firstRun && !state.finishedAt ? 'Welcome. Here is what Voice Verses found.' : 'Here is what Voice Verses found.'}</h1>
            </DialogTitle>
            <p>Check each one. Right? Say so. Wrong? Change it.</p>
          </div>
          <div className="bs-steps" role="img" aria-label={`${done} of ${SETUP_PARTS.length} confirmed`}>
            {SETUP_PARTS.map((p) => (
              <span key={p} className={state.confirmed[p] ? 'on' : ''} />
            ))}
          </div>
          {state.firstRun && !state.finishedAt ? (
            <button type="button" className="st-btn ghost" onClick={later} data-setup-later>
              Finish later
            </button>
          ) : (
            <button type="button" className="st-iconbtn" onClick={later} aria-label="Close" title="Close (Esc)">
              <X />
            </button>
          )}
        </header>

        <div className="bs-grid">
          <SoundCard state={now('sound')} onConfirm={() => confirm('sound')} onReopen={() => reopen('sound')} />
          <ScreensCard state={now('screens')} onConfirm={() => confirm('screens')} onReopen={() => reopen('screens')} onSettings={() => goTo('screens')} />
          <ProPresenterCard state={now('propresenter')} onConfirm={() => confirm('propresenter')} onReopen={() => reopen('propresenter')} onSettings={() => goTo('propresenter')} />
          <ServicesCard state={now('services')} onConfirm={() => confirm('services')} onReopen={() => reopen('services')} />
        </div>

        <footer className="bs-foot">
          <span className="text">
            <b>5 · Try it.</b> A one-minute practice sermon: watch a verse found and put up. Nothing reaches the room.
          </span>
          <button type="button" className={`st-btn ${all ? 'primary' : ''}`} disabled={!all} onClick={() => finish(onDemo)} data-setup-demo>
            <PlayCircle />
            Try the demo
          </button>
          {all && (
            <button type="button" className="st-btn" onClick={() => finish()} data-setup-done>
              Done
            </button>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}

type CardState = 'done' | 'now' | 'later';

const Card = ({ n, title, state, part, children }: { n: number; title: string; state: CardState; part: SetupPart; children: React.ReactNode }) => (
  <section className={`bs-card ${state}`} data-setup-part={part} data-state={state} aria-label={title}>
    <header>
      <h2>
        {n} · {title}
      </h2>
      <span className={`st-pill ${state === 'now' ? 'accent' : ''}`}>{state === 'done' ? '✓ Confirmed' : state === 'now' ? 'Check this one' : 'To check'}</span>
    </header>
    {children}
  </section>
);

const Actions = ({ children }: { children: React.ReactNode }) => <div className="bs-actions">{children}</div>;

// ---- 1 · The preacher's microphone ---------------------------------------------------------

/** A live level for one input (and channel), while the card is showing. */
function useMeter(choice: { deviceId: string; deviceName: string | null; channel: number | null } | null) {
  const [level, setLevel] = useState(0);
  const key = choice ? `${choice.deviceId}|${choice.channel}` : '';
  useEffect(() => {
    if (!choice) return;
    let stopped = false;
    let frame = 0;
    let stop = () => {};
    openMicrophone({ deviceId: choice.deviceId, deviceName: choice.deviceName, channel: choice.channel === null ? null : 0 })
      .then((stream) => {
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        const context = new AudioContext();
        const count = Math.min(channelCountOf(stream), MAX_CHANNELS);
        const splitter = context.createChannelSplitter(count);
        context.createMediaStreamSource(stream).connect(splitter);
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        splitter.connect(analyser, Math.min(choice.channel ?? 0, count - 1));
        const buffer = new Float32Array(1024);
        let last = 0;
        const tick = (t: number) => {
          // About 15 updates a second is plenty for a meter (listening must stay light: LESSONS)
          if (t - last > 66) {
            last = t;
            analyser.getFloatTimeDomainData(buffer);
            let sum = 0;
            for (const v of buffer) sum += v * v;
            const db = 20 * Math.log10(Math.sqrt(sum / buffer.length) + 1e-9);
            setLevel(Math.max(0, Math.min(1, (db + 60) / 60)));
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        stop = () => {
          cancelAnimationFrame(frame);
          stream.getTracks().forEach((t) => t.stop());
          context.close().catch(() => {});
        };
      })
      .catch(() => setLevel(0));
    return () => {
      stopped = true;
      stop();
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return level;
}

const channelText = (channel: number | null) => (channel === null ? '' : `, channel ${channel + 1}`);

function SoundCard({ state, onConfirm, onReopen }: { state: CardState; onConfirm: () => void; onReopen: () => void }) {
  const [found, setFound] = useState<SoundFound | null>(null);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const saved = loadSpeechSettings();
  const runs = useRef(0);

  const look = useCallback(async () => {
    const run = ++runs.current;
    setLooking(true);
    setError(null);
    try {
      await desktop?.microphone?.ask().catch(() => false);
      const result = await findSound();
      if (run === runs.current) setFound(result);
    } catch (e) {
      if (run === runs.current) setError(explainMicrophoneError(e));
    } finally {
      if (run === runs.current) setLooking(false);
    }
  }, []);

  useEffect(() => {
    if (state !== 'done') void look();
    return () => {
      runs.current++;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // What Voice Verses would listen to: what it found, else what is saved
  const choice = found?.best
    ? { deviceId: found.best.deviceId, deviceName: found.best.label, channel: found.best.channel }
    : { deviceId: saved.audioDevice || 'default', deviceName: saved.audioDeviceName ?? null, channel: saved.audioChannel ?? null };
  const name = found?.best ? found.best.label : saved.audioDeviceName || 'The computer’s default input';
  const level = useMeter(state === 'done' || looking || changing ? null : choice);
  const others = (found?.heard ?? []).filter((h) => h.deviceId !== found?.best?.deviceId);

  const confirmFound = () => {
    if (found?.best) saveSpeechSettings({ audioDevice: found.best.deviceId, audioDeviceName: found.best.label, audioChannel: found.best.channel });
    setChanging(false);
    onConfirm();
  };

  return (
    <Card n={1} title="The preacher’s microphone" state={state} part="sound">
      {state === 'done' ? (
        <>
          <p className="bs-text">
            Listening to <b>{saved.audioDeviceName || 'the computer’s default input'}</b>
            {channelText(saved.audioChannel ?? null)}.
          </p>
          <Actions>
            <button type="button" className="st-btn" onClick={onReopen}>
              Change
            </button>
          </Actions>
        </>
      ) : changing ? (
        <>
          <div className="bs-inner">
            <MicrophoneSettings />
          </div>
          <Actions>
            <button type="button" className="st-btn primary" onClick={() => (setChanging(false), onConfirm())} data-setup-confirm>
              Use this
            </button>
            <button type="button" className="st-btn ghost" onClick={() => setChanging(false)}>
              Back
            </button>
          </Actions>
        </>
      ) : (
        <>
          {looking ? (
            <p className="bs-text bs-busy">
              <Loader2 className="animate-spin" aria-hidden="true" />
              Listening to each input for sound…
            </p>
          ) : error ? (
            <p className="bs-text">{error}</p>
          ) : found?.best ? (
            <p className="bs-text" data-sound-found>
              Found <b>{found.best.label}</b>
              {channelText(found.best.channel)}. Sound is coming in on it.
            </p>
          ) : (
            <p className="bs-text" data-sound-found="none">
              No sound on any input yet. Ask someone to speak into the preacher’s microphone, then listen again. Until then: <b>{name}</b>
              {channelText(choice.channel)}.
            </p>
          )}
          {!looking && (
            <div className="bs-meter" role="meter" aria-label="Sound level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}>
              <span style={{ width: `${Math.round(level * 100)}%` }} />
            </div>
          )}
          {!looking && others.length > 0 && (
            <span className="bs-small">
              Also listened to: {others.map((h) => `${h.label || 'an input'} (${Math.max(...h.channels) >= SOUND_LEVEL ? 'quieter' : 'silent'})`).join(', ')}
            </span>
          )}
          <Actions>
            <button type="button" className="st-btn primary" onClick={confirmFound} disabled={looking} data-setup-confirm>
              Looks right
            </button>
            <button type="button" className="st-btn" onClick={() => void look()} disabled={looking}>
              <RefreshCw />
              Listen again
            </button>
            <button type="button" className="st-btn ghost" onClick={() => setChanging(true)} disabled={looking}>
              Change
            </button>
          </Actions>
        </>
      )}
    </Card>
  );
}

// ---- 2 · Screens -----------------------------------------------------------------------------

const OUTPUTS: { output: ScreenOutput; label: string }[] = [
  { output: 'projection', label: 'Projector' },
  { output: 'lowerThird', label: 'Stream lower third' },
  { output: 'confidence', label: 'Stage' },
];

function ScreensCard({ state, onConfirm, onReopen, onSettings }: { state: CardState; onConfirm: () => void; onReopen: () => void; onSettings: () => void }) {
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [config, setConfig] = useState<ScreenConfig | null>(null);
  const [sdi, setSdi] = useState<DeckLinkConfig | null>(null);
  const [ndi, setNdi] = useState<NdiConfig | null>(null);

  useEffect(() => {
    if (!desktop) return;
    const refresh = () => {
      desktop!.screens.displays().then(setDisplays).catch(() => {});
      desktop!.screens.get().then(setConfig).catch(() => {});
      desktop!.decklink?.get().then(setSdi).catch(() => {});
      desktop!.ndi?.get().then(setNdi).catch(() => {});
    };
    refresh();
    // A converter switched on, a cable moved
    const timer = window.setInterval(refresh, 3000);
    return () => window.clearInterval(timer);
  }, []);

  if (!desktop) {
    return (
      <Card n={2} title="Screens" state={state} part="screens">
        <p className="bs-text">In a browser, open each output from the Screens page and drag it to its display. The desktop app puts them there by itself.</p>
        <Actions>{state === 'done' ? <button type="button" className="st-btn" onClick={onReopen}>Change</button> : <button type="button" className="st-btn primary" onClick={onConfirm} data-setup-confirm>Got it</button>}</Actions>
      </Card>
    );
  }

  // Numbered as Identify screens numbers them: this computer's own display first
  const numbered = [...displays].sort((a, b) => Number(b.primary) - Number(a.primary));
  const numberOf = (id: number) => numbered.findIndex((d) => d.id === id) + 1;
  const external = numbered.find((d) => !d.primary);
  const nothingYet = !!config && OUTPUTS.every(({ output }) => config[output] == null && !sdi?.[output] && !ndi?.[output]);
  // A new booth with a second screen: the projector goes on it
  const proposal = nothingYet && external ? external : null;

  const where = (output: ScreenOutput): { big: string; text: string } => {
    const id = output === 'projection' && proposal ? proposal.id : config?.[output];
    const d = id != null ? displays.find((x) => x.id === id) : undefined;
    if (d) return { big: String(numberOf(d.id)), text: `${d.label || 'Screen'} · ${d.width}×${d.height}${proposal && output === 'projection' ? ' · suggested' : ''}` };
    if (id != null) return { big: '!', text: 'Its display isn’t connected now' };
    if (sdi?.[output]) return { big: 'SDI', text: sdi[output]!.device };
    if (ndi?.[output]) return { big: 'NDI', text: 'On the network' };
    return { big: '–', text: 'Not shown yet' };
  };

  const confirm = async () => {
    if (proposal && config) setConfig(await desktop!.screens.set({ ...config, projection: proposal.id }).catch(() => config));
    onConfirm();
  };

  return (
    <Card n={2} title="Screens" state={state} part="screens">
      <div className="bs-tiles">
        {OUTPUTS.map(({ output, label }) => {
          const w = where(output);
          return (
            <div key={output} className="bs-tile" data-screen-output={output}>
              <span className="pic">{w.big}</span>
              <b>{label}</b>
              <span className="bs-small">{w.text}</span>
            </div>
          );
        })}
      </div>
      {state !== 'done' && (
        <span className="bs-small">
          {displays.length <= 1 && nothingYet
            ? 'Only this computer’s own screen is connected. Plug in the projector (or its converter) and it shows here.'
            : 'Identify screens puts a big number on each one, so you can match them.'}
        </span>
      )}
      <Actions>
        {state === 'done' ? (
          <button type="button" className="st-btn" onClick={onReopen}>
            Change
          </button>
        ) : (
          <>
            <button type="button" className="st-btn primary" onClick={() => void confirm()} data-setup-confirm>
              Looks right
            </button>
            {desktop.screens.identify && (
              <button type="button" className="st-btn" onClick={() => void desktop!.screens.identify?.()} data-setup-identify>
                Identify screens
              </button>
            )}
            <button type="button" className="st-btn ghost" onClick={onSettings}>
              Change
            </button>
          </>
        )}
      </Actions>
    </Card>
  );
}

// ---- 3 · ProPresenter -----------------------------------------------------------------------

type Found = { host: string; port: number; version: string; name: string; here: boolean };
const NONE_KEY = 'voice-verses-no-propresenter';

function ProPresenterCard({ state, onConfirm, onReopen, onSettings }: { state: CardState; onConfirm: () => void; onReopen: () => void; onSettings: () => void }) {
  const [found, setFound] = useState<Found[] | null>(null);
  const [pick, setPick] = useState(0);
  const [none, setNone] = useState(() => localStorage.getItem(NONE_KEY) === '1');

  const look = useCallback(async () => {
    if (!desktop) return;
    setFound(null);
    const saved = loadProPresenterSettings();
    const list = desktop.proPresenter.search
      ? await desktop.proPresenter.search({ ports: saved.port ? [saved.port] : [] }).catch(() => [])
      : await desktop.proPresenter.find?.().then((r) => (r ? [{ ...r, here: true }] : [])).catch(() => []);
    const all = list ?? [];
    setFound(all);
    // The one already saved first, if it answered
    const i = all.findIndex((f) => f.host === saved.host && f.port === saved.port);
    setPick(i > 0 ? i : 0);
  }, []);
  useEffect(() => {
    if (state !== 'done') void look();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const label = (f: Found) => (f.here ? 'this computer' : f.name || f.host);

  if (!desktop) {
    return (
      <Card n={3} title="ProPresenter" state={state} part="propresenter">
        <p className="bs-text">Sending verses into ProPresenter needs the Voice Verses desktop app. Voice Verses’ own screens don’t need ProPresenter.</p>
        <Actions>{state === 'done' ? <button type="button" className="st-btn" onClick={onReopen}>Change</button> : <button type="button" className="st-btn primary" onClick={onConfirm} data-setup-confirm>Got it</button>}</Actions>
      </Card>
    );
  }

  /** Remembers where ProPresenter is. Sending stays as it was: how verses get there is chosen in Settings → ProPresenter. */
  const yes = () => {
    const f = found?.[pick];
    if (f) saveProPresenterSettings({ ...loadProPresenterSettings(), host: f.host, port: f.port });
    localStorage.removeItem(NONE_KEY);
    setNone(false);
    onConfirm();
  };
  const noProPresenter = () => {
    localStorage.setItem(NONE_KEY, '1');
    setNone(true);
    onConfirm();
  };

  if (state === 'done') {
    const saved = loadProPresenterSettings();
    return (
      <Card n={3} title="ProPresenter" state={state} part="propresenter">
        <p className="bs-text">
          {none ? (
            'You don’t use ProPresenter. Voice Verses’ own screens do the work.'
          ) : (
            <>
              Voice Verses knows ProPresenter is on <b>{saved.host === '127.0.0.1' || saved.host === 'localhost' ? 'this computer' : saved.host}</b>. Choose how verses get there in Settings → ProPresenter.
            </>
          )}
        </p>
        <Actions>
          <button type="button" className="st-btn" onClick={onReopen}>
            Change
          </button>
        </Actions>
      </Card>
    );
  }

  const f = found?.[pick];
  return (
    <Card n={3} title="ProPresenter" state={state} part="propresenter">
      {!found ? (
        <p className="bs-text bs-busy">
          <Loader2 className="animate-spin" aria-hidden="true" />
          Looking for ProPresenter on this computer and the network…
        </p>
      ) : f ? (
        <>
          <p className="bs-text" data-propresenter-found>
            Found <b>ProPresenter {f.version}</b> on <b>{label(f)}</b>, and it answered.
          </p>
          {found.length > 1 && (
            <div className="st-seg" role="radiogroup" aria-label="Which ProPresenter">
              {found.map((x, i) => (
                <button key={`${x.host}:${x.port}`} type="button" role="radio" aria-checked={i === pick} onClick={() => setPick(i)}>
                  {label(x)}
                </button>
              ))}
            </div>
          )}
          <p className="bs-ask">Is this the computer that runs your screens?</p>
        </>
      ) : (
        <p className="bs-text" data-propresenter-found="none">
          No ProPresenter answered. Using it? In ProPresenter, switch on Settings → Network → Enable Network, then look again.
        </p>
      )}
      <Actions>
        {f ? (
          <button type="button" className="st-btn primary" onClick={yes} data-setup-confirm>
            Yes, that’s it
          </button>
        ) : (
          <button type="button" className="st-btn" onClick={() => void look()} disabled={!found}>
            <RefreshCw />
            Look again
          </button>
        )}
        {f && (
          <button type="button" className="st-btn" onClick={onSettings}>
            Change
          </button>
        )}
        <button type="button" className="st-btn ghost" onClick={noProPresenter} data-setup-no-propresenter>
          We don’t use ProPresenter
        </button>
      </Actions>
    </Card>
  );
}

// ---- 4 · Your services ----------------------------------------------------------------------

const SHOWN = 6;

function ServicesCard({ state, onConfirm, onReopen }: { state: CardState; onConfirm: () => void; onReopen: () => void }) {
  const [chosen, setChosen] = useState<string[]>(() => {
    const saved = loadChurchTypes();
    return saved.length ? saved : ['Sunday service'];
  });
  const [all, setAll] = useState(false);
  const toggle = (t: string) => setChosen((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]));
  const first: readonly string[] = SERVICE_TYPES.slice(0, SHOWN);
  // The first few, and any already chosen from further down
  const types: string[] = all ? [...SERVICE_TYPES] : [...first, ...chosen.filter((t) => !first.includes(t))];

  return (
    <Card n={4} title="Your services" state={state} part="services">
      {state === 'done' ? (
        <>
          <p className="bs-text">
            <b>{loadChurchTypes().join(', ') || 'None chosen'}</b>. Each has a ready-made order in Services.
          </p>
          <Actions>
            <button type="button" className="st-btn" onClick={onReopen}>
              Change
            </button>
          </Actions>
        </>
      ) : (
        <>
          <p className="bs-text">Which services does your church hold? Each gets a ready-made order.</p>
          <div className="bs-chips" role="group" aria-label="Your services">
            {types.map((t) => (
              <button key={t} type="button" aria-pressed={chosen.includes(t)} onClick={() => toggle(t)} data-church-type={t}>
                {chosen.includes(t) && <Check aria-hidden="true" />}
                {t}
              </button>
            ))}
            {!all && (
              <button type="button" className="more" onClick={() => setAll(true)}>
                + {SERVICE_TYPES.length - SHOWN} more
              </button>
            )}
          </div>
          <Actions>
            <button
              type="button"
              className="st-btn primary"
              disabled={!chosen.length}
              onClick={() => {
                saveChurchTypes(chosen);
                onConfirm();
              }}
              data-setup-confirm
            >
              Looks right
            </button>
          </Actions>
        </>
      )}
    </Card>
  );
}
