import { ReactNode, useEffect, useState } from 'react';
import { BookOpen, Download, HardDrive, Image as ImageIcon, Mic, MonitorUp, Music2, Network, Radio, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { NetworkOutputSettings } from './NetworkOutputSettings';
import { ScreenSettings } from './ScreenSettings';
import { MotionSettings } from './MotionSettings';

type Pane = 'bible' | 'listening' | 'screens' | 'network' | 'songs' | 'logo' | 'library' | 'propresenter' | 'app';

const PANES: { id: Pane; label: string; hint: string; icon: typeof Mic }[] = [
  { id: 'bible', label: 'Bible', hint: 'Translation, and more translations online', icon: BookOpen },
  { id: 'listening', label: 'Listening', hint: 'Microphone, channel, language, speech engine, AI', icon: Mic },
  { id: 'screens', label: 'Screens', hint: 'Which display each output goes to, and its shape', icon: MonitorUp },
  { id: 'network', label: 'Network', hint: 'Show any screen in a browser on another device', icon: Network },
  { id: 'songs', label: 'Songs and CCLI', hint: 'Your CCLI licence number on song slides', icon: Music2 },
  { id: 'logo', label: 'Logo', hint: 'The church logo for the screens', icon: ImageIcon },
  { id: 'library', label: 'Library and backup', hint: 'Keep services and media in a shared folder', icon: HardDrive },
  { id: 'propresenter', label: 'ProPresenter', hint: 'Optional: also send verses to ProPresenter', icon: Radio },
  { id: 'app', label: 'Desktop app', hint: 'Download for Mac and Windows', icon: Download },
];

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

const Group = ({ title, children }: { title?: string; children: ReactNode }) => (
  <div className="space-y-3">
    {title && <h3 className="m-0 text-[15px] font-semibold">{title}</h3>}
    {children}
  </div>
);

/**
 * Settings, arranged like a Mac's System Settings: the subjects on the left,
 * the chosen one on the right. Everything saves as it is changed.
 */
export const SettingsPanel = ({ onClose, initial = 'bible', framed = true }: { onClose?: () => void; initial?: Pane; framed?: boolean }) => {
  const [pane, setPane] = useState<Pane>(initial);
  const [bibleVersion, setBibleVersion] = useState<BibleVersionType>('kjv');
  const [ccliLicense, setCcliLicense] = useState<string>(() => readSettings().ccliLicense || '');
  const [language, setLanguage] = useState<string>(() => localStorage.getItem('transcription_language') || 'en');

  useEffect(() => {
    BibleParser.initializeVersion();
    setBibleVersion(BibleParser.getVersion());
  }, []);

  const current = PANES.find((p) => p.id === pane)!;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] ${framed ? 'h-[82vh] max-h-[860px]' : 'min-h-[640px] rounded-2xl bg-card shadow-[0_0_0_1px_hsl(var(--border))] overflow-hidden'}`}>
      <nav className="bg-muted/30 md:border-r border-border p-3 space-y-0.5 overflow-y-auto" aria-label="Settings">
        {framed && <p className="m-0 px-2.5 pt-2 pb-3 text-lg font-bold tracking-[-0.01em]">Settings</p>}
        {PANES.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPane(p.id)}
              aria-current={pane === p.id ? 'page' : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-left text-sm font-medium transition ${pane === p.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'}`}
            >
              <span className={`w-7 h-7 rounded-lg grid place-items-center flex-shrink-0 ${pane === p.id ? 'bg-primary/20 text-foreground' : 'bg-muted'}`}>
                <Icon className="w-4 h-4" />
              </span>
              {p.label}
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-7 pt-6 pb-4 bg-card/95 backdrop-blur">
          <div>
            <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">{current.label}</h2>
            <p className="m-0 mt-1 text-sm text-muted-foreground">{current.hint}</p>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close settings">
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        <div className="px-7 pb-8 space-y-8">
          {pane === 'bible' && (
            <>
              <BibleVersionSettings currentVersion={bibleVersion} onVersionChange={setBibleVersion} />
              <p className="m-0 text-[13px] text-muted-foreground max-w-[70ch]">
                Predictive Next uses cross-references from{' '}
                <a href="https://www.openbible.info/labs/cross-references/" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4">
                  OpenBible.info
                </a>{' '}
                (CC BY), kept on this computer so they work offline.
              </p>
            </>
          )}

          {pane === 'listening' && (
            <>
              <Group title="Microphone">
                <MicrophoneSettings />
              </Group>
              <Group title="Language">
                <Select
                  value={language}
                  onValueChange={(v) => {
                    setLanguage(v);
                    localStorage.setItem('transcription_language', v);
                  }}
                >
                  <SelectTrigger id="transcription-language" className="max-w-sm" aria-label="Language the preacher speaks">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="m-0 text-xs text-muted-foreground">The language the preacher speaks. Takes effect the next time listening starts.</p>
              </Group>
              <SpeechEngineSettings />
              <AiAssistantSettings />
            </>
          )}

          {pane === 'screens' && (
            <>
              <ScreenSettings />
              <MotionSettings />
            </>
          )}
          {pane === 'network' && <NetworkOutputSettings />}

          {pane === 'songs' && (
            <Group>
              <Label htmlFor="ccli-license">CCLI licence number</Label>
              <Input
                id="ccli-license"
                className="max-w-sm"
                placeholder="e.g. 1234567"
                value={ccliLicense}
                onChange={(e) => {
                  setCcliLicense(e.target.value);
                  saveSetting({ ccliLicense: e.target.value.trim() });
                }}
              />
              <p className="m-0 text-xs text-muted-foreground">Shown small on each song's first slide with its title, writers and copyright, as your licence requires.</p>
            </Group>
          )}

          {pane === 'logo' && <ServiceLogoSettings />}
          {pane === 'library' && <StorageSettings />}
          {pane === 'propresenter' && <ProPresenterSettings />}

          {pane === 'app' && (
            <Group>
              <p className="m-0 text-sm text-muted-foreground max-w-[70ch]">
                The desktop app is the way to run Voice Verses in church: listening runs on the computer with no internet or key
                needed, keys stay in the system keychain, outputs open on their screens by themselves, and the library can be kept in a
                folder. This website works too, with the browser's speech recognition.
              </p>
              <DesktopDownloads />
              <p className="m-0 text-sm text-muted-foreground">
                The source code is on{' '}
                <a href="https://github.com/Towoadeyemi1/voice-verses" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4">
                  GitHub
                </a>
                .
              </p>
            </Group>
          )}
        </div>
      </div>
    </div>
  );
};
