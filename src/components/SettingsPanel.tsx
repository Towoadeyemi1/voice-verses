import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioLines, BookOpen, Download, FolderSync, Image as ImageIcon, Mic, MonitorUp, Music2, Radio, SlidersHorizontal, Sparkles, Workflow, X, type LucideIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BibleVersionSettings } from './BibleVersionSettings';
import { StorageSettings } from './StorageSettings';
import { ServiceLogoSettings } from './ServiceLogoSettings';
import { BibleParser } from '@/lib/bibleParser';
import { BibleVersionType } from '@/types/bibleVersion';
import { SpeechEngineSettings } from './SpeechEngineSettings';
import { DesktopDownloads } from './DesktopDownloads';
import { AiAssistantSettings } from './AiAssistantSettings';
import { ProPresenterSettings } from './ProPresenterSettings';
import { MicrophoneSettings } from './MicrophoneSettings';
import { ScreenSettings } from './ScreenSettings';
import { FeatureSettings } from './FeatureSettings';
import { BoothCheckPage } from './settings/BoothCheckPage';
import { SpiritPage, useSpirit } from './settings/SpiritPage';
import { CuesPage } from './settings/CuesPage';
import { MovesPage } from './settings/MovesPage';
import { MOVES, moveCanBeHandsFree, moveTrust, noticed } from '@/lib/spirit';
import { List, Ring, Row, Section, Sq, Tint } from './settings/kit';
import { BoothCheckItem, needsAttention, runBoothCheck } from '@/lib/boothCheck';
import { desktop } from '@/lib/desktop';
import type { BoothFix } from './live/BoothCheck';
import type { Service } from '@/types/service';

export type Pane = 'booth' | 'spirit' | 'moves' | 'cues' | 'features' | 'bible' | 'listening' | 'screens' | 'network' | 'songs' | 'logo' | 'library' | 'propresenter' | 'app';

const GROUPS: { label: string; panes: { id: Pane; label: string; hint: string; icon: LucideIcon; tint: Tint }[] }[] = [
  {
    label: 'spirit',
    panes: [
      { id: 'spirit', label: 'How spirit runs', hint: 'Gets each part of the service ready, and learns how your church runs.', icon: Sparkles, tint: 'spirit' },
      { id: 'moves', label: 'What spirit does', hint: 'Every move spirit can make in a service, and how far each is trusted.', icon: Workflow, tint: 'violet' },
      { id: 'cues', label: 'Cues', hint: 'What the preacher says that gets the next part ready.', icon: AudioLines, tint: 'teal' },
    ],
  },
  {
    label: 'This service',
    panes: [
      { id: 'features', label: 'Features', hint: 'Choose what Voice Verses does by itself.', icon: SlidersHorizontal, tint: 'gold' },
      { id: 'bible', label: 'Bible', hint: 'The translation on the screens, and more translations online.', icon: BookOpen, tint: 'blue' },
      { id: 'songs', label: 'Songs and CCLI', hint: 'Your CCLI licence on song slides.', icon: Music2, tint: 'violet' },
      { id: 'logo', label: 'Logo', hint: 'The church logo for the screens.', icon: ImageIcon, tint: 'pink' },
    ],
  },
  {
    label: 'In the booth',
    panes: [
      { id: 'listening', label: 'Listening', hint: 'The microphone, the language, and how speech is heard.', icon: Mic, tint: 'rose' },
      { id: 'screens', label: 'Screens and outputs', hint: 'What each screen in the room shows, and how it gets there.', icon: MonitorUp, tint: 'indigo' },
      { id: 'propresenter', label: 'ProPresenter', hint: 'Optional. Also send the verses into ProPresenter, on this computer or another.', icon: Radio, tint: 'orange' },
    ],
  },
  {
    label: 'This computer',
    panes: [
      { id: 'library', label: 'Library and backup', hint: 'Keep services and media in a shared folder, and back them up.', icon: FolderSync, tint: 'slate' },
      { id: 'app', label: 'Desktop app', hint: 'Voice Verses for Mac and Windows.', icon: Download, tint: 'teal' },
    ],
  },
];
const PANES = GROUPS.flatMap((g) => g.panes);

const LANGUAGES: [string, string][] = [
  ['en', 'English'], ['es', 'Spanish (Español)'], ['fr', 'French (Français)'], ['de', 'German (Deutsch)'], ['it', 'Italian (Italiano)'],
  ['pt', 'Portuguese (Português)'], ['nl', 'Dutch (Nederlands)'], ['pl', 'Polish (Polski)'], ['ru', 'Russian (Русский)'],
  ['zh', 'Chinese (中文)'], ['ja', 'Japanese (日本語)'], ['ko', 'Korean (한국어)'],
];

const readSettings = () => {
  try {
    return JSON.parse(localStorage.getItem('cornerstone-settings') || '{}');
  } catch {
    return {};
  }
};
/** Changes save as they are made: no Save button to forget. */
const saveSetting = (change: Record<string, unknown>) => {
  const settings = { ...readSettings(), ...change };
  localStorage.setItem('cornerstone-settings', JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('settings-updated', { detail: settings }));
};

/** Which sidebar item a booth check problem belongs to */
const paneOf = (id: string): Pane | null =>
  id.startsWith('mic') || id === 'speech' ? 'listening' : id.startsWith('screen') || id.startsWith('sdi-') || id.startsWith('ndi-') ? 'screens' : id === 'propresenter' ? 'propresenter' : id === 'bible' ? 'bible' : null;

/**
 * Settings (docs/design/settings-redesign.html): the booth check at the top, the
 * subjects grouped down the side with coloured icons, one page at a time.
 * Everything saves as it is changed.
 */
export const SettingsPanel = ({
  onClose,
  initial = 'features',
  framed = true,
  service,
  serviceIsToday,
}: {
  onClose?: () => void;
  initial?: Pane;
  framed?: boolean;
  service?: Service | null;
  serviceIsToday?: boolean;
}) => {
  const spirit = useSpirit();
  const newNoticed = noticed(spirit).length;
  const earnedMoves = MOVES.filter((m) => m.works && moveTrust(spirit, m.id).level !== 'handsfree' && moveCanBeHandsFree(spirit, m.id)).length;
  const navigate = useNavigate();
  const [pane, setPane] = useState<Pane>(initial === 'network' ? 'screens' : initial);
  const [bibleVersion, setBibleVersion] = useState<BibleVersionType>('kjv');
  const [ccliLicense, setCcliLicense] = useState<string>(() => readSettings().ccliLicense || '');
  const [language, setLanguage] = useState<string>(() => localStorage.getItem('transcription_language') || 'en');
  const [booth, setBooth] = useState<BoothCheckItem[] | null>(null);

  useEffect(() => {
    BibleParser.initializeVersion();
    setBibleVersion(BibleParser.getVersion());
  }, []);
  useEffect(() => {
    let stopped = false;
    const check = () => runBoothCheck({ service, serviceIsToday }).then((items) => !stopped && setBooth(items)).catch(() => {});
    void check();
    const timer = window.setInterval(check, 30_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [service, serviceIsToday, pane]);

  const fix = (f: BoothFix) => {
    if (f.action === 'microphone') void desktop?.microphone?.openSettings();
    else if (f.action === 'plan') {
      onClose?.();
      navigate('/service-planner');
    } else if (f.pane) setPane(f.pane === 'network' ? 'screens' : f.pane);
  };

  const todo = booth ? needsAttention(booth) : [];
  const badge = (id: Pane) => todo.filter((c) => paneOf(c.id) === id).length;
  const current = pane === 'booth' ? { label: 'Booth check', hint: 'Everything the service needs, checked every minute.' } : PANES.find((p) => p.id === pane)!;

  return (
    <div
      className={`vvs st-window ${framed ? 'h-full' : 'min-h-[720px] rounded-[18px] shadow-[0_0_0_1px_rgba(255,245,255,.07)]'}`}
      data-settings
    >
      <nav className="st-side" aria-label="Settings">
        {framed && <h1>Settings</h1>}
        <button type="button" className="st-ready" aria-current={pane === 'booth' ? 'page' : undefined} onClick={() => setPane('booth')} data-settings-booth>
          <Ring done={booth ? booth.length - todo.length : 0} total={booth?.length || 1}>
            <b style={{ color: todo.length ? 'var(--s-warn)' : 'var(--s-ink)' }}>{booth ? todo.length || '✓' : '…'}</b>
          </Ring>
          <span>
            <strong>{!booth ? 'Checking the booth…' : todo.length ? `${todo.length} ${todo.length === 1 ? 'thing' : 'things'} to check` : 'Ready for the service'}</strong>
            <span className="sub">Booth check</span>
          </span>
        </button>
        <div className="st-groups">
          {GROUPS.map((g) => (
            <div key={g.label} className="st-group">
              <p className={`st-group-label ${g.label === 'spirit' ? 'as-named' : ''}`}>{g.label}</p>
              {g.panes.map((p) => (
                <button key={p.id} type="button" className="st-nav" aria-current={pane === p.id ? 'page' : undefined} onClick={() => setPane(p.id)} data-pane={p.id}>
                  <Sq tint={p.tint} icon={p.icon} />
                  <span className="name">{p.label}</span>
                  {badge(p.id) > 0 && <span className="st-badge" aria-label={`${badge(p.id)} to check`}>{badge(p.id)}</span>}
                  {p.id === 'moves' && earnedMoves > 0 && <span className="st-badge" style={{ color: 'var(--s-accent)', background: 'var(--s-accent-soft)' }}>{earnedMoves} earned</span>}
                  {p.id === 'cues' && newNoticed > 0 && <span className="st-badge" style={{ color: 'var(--s-accent)', background: 'var(--s-accent-soft)' }}>{newNoticed} new</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      </nav>

      <main className="st-main" key={pane}>
        <div className="st-top">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{current.label}</h2>
            <p>{current.hint}</p>
          </div>
          {onClose && (
            <button type="button" className="st-iconbtn" onClick={onClose} aria-label="Close settings" title="Close (Esc)">
              <X />
            </button>
          )}
        </div>

        {pane === 'booth' && <BoothCheckPage service={service} serviceIsToday={serviceIsToday} onFix={fix} />}
        {pane === 'spirit' && <SpiritPage onCues={() => setPane('cues')} />}
        {pane === 'moves' && <MovesPage onCues={() => setPane('cues')} />}
        {pane === 'cues' && <CuesPage service={service} />}
        {pane === 'features' && <FeatureSettings />}
        {pane === 'screens' && <ScreenSettings onGo={setPane} />}
        {pane === 'propresenter' && <ProPresenterSettings />}

        {pane === 'bible' && (
          <div className="st-page">
            <BibleVersionSettings currentVersion={bibleVersion} onVersionChange={setBibleVersion} />
            <p className="st-hint">
              Predictive Next uses cross-references from{' '}
              <a href="https://www.openbible.info/labs/cross-references/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                OpenBible.info
              </a>{' '}
              (CC BY), kept on this computer so they work offline.
            </p>
          </div>
        )}

        {pane === 'listening' && (
          <div className="st-page">
            <Section title="Microphone">
              <MicrophoneSettings />
            </Section>
            <Section title="Language">
              <List plain>
                <Row title="The language the preacher speaks" desc="Takes effect the next time listening starts.">
                  <Select
                    value={language}
                    onValueChange={(v) => {
                      setLanguage(v);
                      localStorage.setItem('transcription_language', v);
                    }}
                  >
                    <SelectTrigger id="transcription-language" className="st-select-trigger" aria-label="Language the preacher speaks">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>
              </List>
            </Section>
            <SpeechEngineSettings />
            <AiAssistantSettings />
          </div>
        )}

        {pane === 'songs' && (
          <div className="st-page">
            <Section title="CCLI">
              <List plain>
                <Row title="CCLI licence number" desc="Shown small on each song’s first slide with its title, writers and copyright, as your licence requires.">
                  <input
                    id="ccli-license"
                    className="st-input w-40"
                    placeholder="e.g. 1234567"
                    aria-label="CCLI licence number"
                    value={ccliLicense}
                    onChange={(e) => {
                      setCcliLicense(e.target.value);
                      saveSetting({ ccliLicense: e.target.value.trim() });
                    }}
                  />
                </Row>
              </List>
            </Section>
          </div>
        )}

        {pane === 'logo' && (
          <div className="st-page">
            <ServiceLogoSettings />
          </div>
        )}
        {pane === 'library' && (
          <div className="st-page">
            <StorageSettings />
          </div>
        )}

        {pane === 'app' && (
          <div className="st-page">
            <p className="st-hint">
              The desktop app is the way to run Voice Verses in church: listening runs on the computer with no internet or key needed, keys stay in the system keychain,
              outputs open on their screens by themselves, and the library can be kept in a folder. This website works too, with the browser’s speech recognition.
            </p>
            <DesktopDownloads />
            <p className="st-hint">
              The source code is on{' '}
              <a href="https://github.com/Towoadeyemi1/voice-verses" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                GitHub
              </a>
              . NDI® is a registered trademark of Vizrt NDI AB (
              <a href="https://ndi.video/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                ndi.video
              </a>
              ).
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
