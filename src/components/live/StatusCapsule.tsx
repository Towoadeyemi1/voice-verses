import { Loader2, Mic, MicOff, Music, Square } from 'lucide-react';
import { SendMode } from '@/lib/sendMode';

/**
 * The one status in the middle of the top bar: what the app is doing
 * ("Listening · following John 5"), with Start/Stop, mute, song mode and
 * whether verses go up by themselves (Auto) or wait for Take (Ask first).
 */
export const StatusCapsule = ({
  listening,
  connecting,
  volume,
  muted,
  songMode,
  doing,
  sendMode,
  onListen,
  onStop,
  onToggleMute,
  onToggleSong,
  onSendMode,
}: {
  listening: boolean;
  connecting: boolean;
  volume: number;
  muted: boolean;
  songMode: boolean;
  /** "following John 5", "following the singers"… */
  doing: string;
  sendMode: SendMode;
  onListen: () => void;
  onStop: () => void;
  onToggleMute: () => void;
  onToggleSong: () => void;
  onSendMode: (mode: SendMode) => void;
}) => {
  const level = muted ? 0 : Math.min(1, volume / 60);
  return (
    <div className="flex items-center gap-2 h-11 pl-2 pr-1.5 rounded-full bg-card/80 backdrop-blur-xl shadow-[0_0_0_1px_hsl(var(--border))]" role="status">
      {listening ? (
        <>
          <button type="button" onClick={onStop} className="w-8 h-8 rounded-full grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted" title="Stop listening" aria-label="Stop listening">
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
          <span className="flex items-center gap-[3px] h-4" aria-hidden="true">
            {[0.5, 0.8, 1, 0.75, 0.45].map((k, i) => (
              <i key={i} className="w-[3px] rounded-full bg-emerald-500 transition-[height] duration-100" style={{ height: `${Math.max(18, level * k * 100)}%` }} />
            ))}
          </span>
          <span className="text-sm font-medium whitespace-nowrap">
            {muted ? 'Muted' : 'Listening'}
            <span className="text-muted-foreground"> · {doing}</span>
          </span>
          <button type="button" onClick={onToggleMute} className={`w-8 h-8 rounded-full grid place-items-center hover:bg-muted ${muted ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'}`} title={muted ? 'Unmute the microphone' : 'Mute the microphone'} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </>
      ) : (
        <button type="button" onClick={onListen} disabled={connecting} className="h-8 px-3.5 rounded-full bg-primary/15 hover:bg-primary/25 text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
          {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
          {connecting ? 'Starting…' : 'Start listening'}
        </button>
      )}
      <button
        type="button"
        onClick={onToggleSong}
        aria-pressed={songMode}
        className={`h-8 px-3 rounded-full text-[13px] font-semibold flex items-center gap-1.5 ${songMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
        title={songMode ? 'Singing: verses wait until a reference is said. Click to go back to scripture.' : 'Singing now: follow the song and keep verses off the screen'}
      >
        <Music className="w-3.5 h-3.5" />
        Song
      </button>
      <div className="flex p-[3px] rounded-full bg-muted/70" role="group" aria-label="How verses go on screen">
        {(['auto', 'preview'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={sendMode === m}
            onClick={() => onSendMode(m)}
            className={`h-7 px-3 rounded-full text-[13px] font-semibold ${sendMode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            title={m === 'auto' ? 'Verses go on screen by themselves when the app is sure (99%+)' : 'Everything waits in Next until you press Take'}
          >
            {m === 'auto' ? 'Auto' : 'Ask first'}
          </button>
        ))}
      </div>
    </div>
  );
};
