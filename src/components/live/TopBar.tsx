import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Mic, MicOff, Music, Settings, Square, MonitorUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CountdownControl } from '../CountdownControl';
import { ShowLogoButton } from '../ShowLogoButton';
import { SendMode } from '@/lib/sendMode';

const NAV = [
  { path: '/', label: 'Live' },
  { path: '/service-planner', label: 'Service' },
  { path: '/presenter', label: 'Presenter' },
  { path: '/media-library', label: 'Media' },
  { path: '/templates', label: 'Templates' },
];

/** The bar across the top: pages, listening, singing, how things are sent, and the screens. */
export const TopBar = ({
  listening,
  connecting,
  volume,
  muted,
  songMode,
  sendMode,
  onListen,
  onStop,
  onToggleMute,
  onToggleSong,
  onSendMode,
  onOpenOutputs,
  onSettings,
}: {
  listening: boolean;
  connecting: boolean;
  volume: number;
  muted: boolean;
  songMode: boolean;
  sendMode: SendMode;
  onListen: () => void;
  onStop: () => void;
  onToggleMute: () => void;
  onToggleSong: () => void;
  onSendMode: (mode: SendMode) => void;
  onOpenOutputs: () => void;
  onSettings: () => void;
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <header className="flex items-center gap-2 px-3 h-14 border-b border-border bg-card/80 flex-shrink-0">
      <img src={`${import.meta.env.BASE_URL}cornerstone-logo.png`} alt="" className="w-8 h-8 object-contain" />
      <span className="font-bold text-lg mr-2 hidden 2xl:inline whitespace-nowrap">Voice Verses</span>
      <nav className="flex items-center gap-0.5">
        {NAV.map((n) => (
          <Button key={n.path} variant={pathname === n.path ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2.5 whitespace-nowrap" onClick={() => navigate(n.path)}>
            {n.label}
          </Button>
        ))}
      </nav>

      <div className="flex-1" />

      {listening ? (
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="destructive" className="h-8 gap-1.5" onClick={onStop} title="Stop listening">
            <Square className="w-3.5 h-3.5" />Stop
          </Button>
          <div className="w-20 h-2 rounded-full bg-muted overflow-hidden" title="Microphone level">
            <div className="h-full bg-emerald-500 transition-all duration-100" style={{ width: `${muted ? 0 : Math.min(100, volume)}%` }} />
          </div>
          <Button size="sm" variant={muted ? 'secondary' : 'ghost'} className="h-8 w-8 p-0" onClick={onToggleMute} title={muted ? 'Unmute' : 'Mute'}>
            {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
        </div>
      ) : (
        <Button size="sm" className="h-8 gap-1.5 gradient-divine" onClick={onListen} disabled={connecting}>
          {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
          {connecting ? 'Starting…' : 'Start listening'}
        </Button>
      )}

      <Button
        size="sm"
        variant={songMode ? 'default' : 'outline'}
        className="h-8 gap-1.5"
        onClick={onToggleSong}
        title={songMode ? 'Back to scripture' : 'Singing: no verses from the words until a reference is said'}
      >
        <Music className="w-3.5 h-3.5" />{songMode ? 'Song on' : 'Song'}
      </Button>

      <ToggleGroup type="single" size="sm" value={sendMode} onValueChange={(v) => v && onSendMode(v as SendMode)} className="border border-border rounded-md p-0.5">
        <ToggleGroupItem value="auto" className="h-7 px-2 text-xs whitespace-nowrap" title="Scripture goes straight to the screens (quotes only when 99%+ sure)">Auto send</ToggleGroupItem>
        <ToggleGroupItem value="preview" className="h-7 px-2 text-xs whitespace-nowrap" title="Everything goes to Preview first; you press Send">Preview first</ToggleGroupItem>
      </ToggleGroup>

      <CountdownControl className="h-8 hidden lg:flex" />
      <ShowLogoButton size="sm" className="h-8" />
      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={onOpenOutputs} title="Screens: where each output goes">
        <MonitorUp className="w-4 h-4" />
      </Button>
      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={onSettings} title="Settings">
        <Settings className="w-4 h-4" />
      </Button>
    </header>
  );
};
