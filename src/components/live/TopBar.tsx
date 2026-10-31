import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Mic, MicOff, Moon, Music, Search, Settings, Sun } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { SendMode } from '@/lib/sendMode';
import { Service } from '@/types/service';
import { Theme } from '@/lib/theme';

const PAGES = [
  { path: '/', label: 'Live' },
  { path: '/service-planner', label: 'Plan' },
  { path: '/media-library', label: 'Media' },
  { path: '/templates', label: 'Looks' },
];

export interface ScreenStatus {
  label: string;
  on: boolean;
}

/** Across the top: the service, one search for everything, listening, how things are sent, the screens. */
export const TopBar = ({
  services,
  serviceId,
  onService,
  onSearch,
  listening,
  connecting,
  volume,
  muted,
  inputName,
  songMode,
  sendMode,
  screens,
  theme,
  onListen,
  onStop,
  onToggleMute,
  onToggleSong,
  onSendMode,
  onTheme,
  onSettings,
}: {
  services: Service[];
  serviceId: string | null;
  onService: (id: string) => void;
  onSearch: () => void;
  listening: boolean;
  connecting: boolean;
  volume: number;
  muted: boolean;
  inputName: string;
  songMode: boolean;
  sendMode: SendMode;
  screens: ScreenStatus[];
  theme: Theme;
  onListen: () => void;
  onStop: () => void;
  onToggleMute: () => void;
  onToggleSong: () => void;
  onSendMode: (mode: SendMode) => void;
  onTheme: () => void;
  onSettings: () => void;
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const service = services.find((s) => s.id === serviceId);
  const level = muted ? 0 : Math.min(1, volume / 60);

  return (
    <header className="flex items-center gap-3 px-4 h-[60px] border-b border-border bg-card flex-shrink-0">
      <img src={`${import.meta.env.BASE_URL}cornerstone-logo.png`} alt="Voice Verses" className="w-8 h-8 rounded-lg object-contain" />

      <Select value={serviceId ?? undefined} onValueChange={onService}>
        <SelectTrigger className="h-10 w-auto min-w-[150px] max-w-[230px] border-0 bg-transparent px-2 hover:bg-muted focus:ring-0 text-left" title="Service on today">
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-sm font-bold truncate">{service?.name ?? 'No service'}</span>
            <span className="text-xs text-muted-foreground truncate">
              {service ? `${new Date(service.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })} · ${service.startTime}` : 'Plan one in Plan'}
            </span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {services.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name} · {new Date(s.date).toLocaleDateString()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <nav className="hidden lg:flex items-center gap-0.5">
        {PAGES.map((p) => (
          <button
            key={p.path}
            onClick={() => navigate(p.path)}
            className={`h-8 px-3 rounded-md text-sm font-semibold transition-colors ${pathname === p.path ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {p.label}
          </button>
        ))}
      </nav>

      <button
        onClick={onSearch}
        className="flex-1 max-w-[520px] mx-auto h-10 flex items-center gap-2.5 px-3.5 rounded-lg bg-muted border border-border text-muted-foreground text-sm hover:border-primary/50 transition-colors min-w-0"
      >
        <Search className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">Type anything: John 3:16, a song, “countdown 5”, clear</span>
        <kbd className="ml-auto text-[11px] font-sans border border-border rounded px-1.5 bg-card hidden md:inline whitespace-nowrap">Ctrl K</kbd>
      </button>

      {listening ? (
        <div className="flex items-center gap-1 rounded-full bg-primary/15 pl-3 pr-1 h-9">
          <span className="flex items-end gap-[3px] h-4" aria-hidden="true">
            {[0.5, 0.8, 1, 0.75, 0.55].map((f, i) => (
              <i key={i} className="w-[3px] rounded-sm bg-primary transition-all duration-100" style={{ height: `${Math.max(3, 16 * level * f)}px` }} />
            ))}
          </span>
          <span className="text-[13px] font-semibold ml-1.5 max-w-[130px] truncate">{muted ? 'Muted' : `Listening · ${inputName}`}</span>
          <button onClick={onToggleMute} className="h-7 w-7 rounded-full grid place-items-center hover:bg-primary/20" title={muted ? 'Unmute' : 'Mute'}>
            {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onStop} className="h-7 px-2.5 rounded-full text-xs font-semibold hover:bg-primary/20" title="Stop listening">
            Stop
          </button>
        </div>
      ) : (
        <button
          onClick={onListen}
          disabled={connecting}
          className="flex items-center gap-2 h-9 px-4 rounded-full bg-primary text-primary-foreground text-[13px] font-bold hover:opacity-90 disabled:opacity-60"
        >
          {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
          {connecting ? 'Starting…' : 'Start listening'}
        </button>
      )}

      <button
        onClick={onToggleSong}
        className={`flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold border transition-colors ${songMode ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
        title={songMode ? 'Singing: verses are not taken from the words. Click to go back to scripture.' : 'Singing now: stop finding verses in the words until a reference is said'}
      >
        <Music className="w-4 h-4" />
        {songMode ? 'Singing' : 'Song'}
      </button>

      <div className="flex p-[3px] rounded-lg bg-muted border border-border" role="group" aria-label="How detected scripture is sent">
        {(['auto', 'preview'] as const).map((m) => (
          <button
            key={m}
            aria-pressed={sendMode === m}
            onClick={() => onSendMode(m)}
            title={m === 'auto' ? 'Straight to the screens (quotes only when 99%+ sure)' : 'Everything waits in Next until you press Send'}
            className={`h-7 px-2.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${sendMode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {m === 'auto' ? 'Auto send' : 'Preview first'}
          </button>
        ))}
      </div>

      {screens.length > 0 && (
        <button onClick={() => navigate('/display-manager')} className="hidden xl:flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground" title="Screens: where each output goes">
          {screens.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <i className={`w-[7px] h-[7px] rounded-full ${s.on ? 'bg-next' : 'bg-muted-foreground/40'}`} />
              {s.label}
            </span>
          ))}
        </button>
      )}

      <button onClick={onTheme} className="h-9 w-9 rounded-lg border border-border grid place-items-center hover:bg-muted" title={theme === 'dark' ? 'Light look' : 'Dark look'}>
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
      <button onClick={onSettings} className="h-9 w-9 rounded-lg border border-border grid place-items-center hover:bg-muted" title="Settings">
        <Settings className="w-4 h-4" />
      </button>
    </header>
  );
};
