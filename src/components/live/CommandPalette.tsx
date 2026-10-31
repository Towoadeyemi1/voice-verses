import { useEffect, useState } from 'react';
import { BookOpen, CalendarDays, Eraser, Image as ImageIcon, Mic, MonitorUp, Music, Settings, Timer } from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { MediaItem, Service, ServiceSubsection } from '@/types/service';

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  icon: 'clear' | 'logo' | 'mic' | 'screens' | 'settings' | 'timer' | 'song';
  run: () => void;
}

const ICONS = { clear: Eraser, logo: ImageIcon, mic: Mic, screens: MonitorUp, settings: Settings, timer: Timer, song: Music };

/**
 * ⌘K / Ctrl+K: type a reference ("John 3:16", "Psalm 23"), a song, a service
 * item or something to do, and press Enter.
 */
export const CommandPalette = ({
  open,
  onOpenChange,
  songs,
  service,
  actions,
  onReference,
  onSong,
  onServiceItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songs: MediaItem[];
  service: Service | null;
  actions: PaletteAction[];
  /** A typed reference; resolves false when it isn't one */
  onReference: (text: string) => Promise<boolean>;
  onSong: (song: MediaItem) => void;
  onServiceItem: (item: ServiceSubsection) => void;
}) => {
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const looksLikeReference = /\d/.test(query) || /^\s*(psalm|ps|prov|gen|john|matt|mark|luke|acts|rom|isa)\w*\s*$/i.test(query);
  const items = service?.sections.flatMap((s) => s.subsections.map((item) => ({ item, section: s.name }))) ?? [];
  const close = () => onOpenChange(false);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="John 3:16, a song, a service item, clear…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>Nothing found. Try a reference such as Psalm 23.</CommandEmpty>
        {looksLikeReference && query.trim() && (
          <CommandGroup heading="Bible">
            <CommandItem
              value={`bible ${query}`}
              onSelect={async () => {
                if (await onReference(query.trim())) close();
              }}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Show {query.trim()}
            </CommandItem>
          </CommandGroup>
        )}
        {items.length > 0 && (
          <CommandGroup heading={service?.name ?? 'Service'}>
            {items.map(({ item, section }) => (
              <CommandItem key={item.id} value={`service ${section} ${item.name}`} onSelect={() => { onServiceItem(item); close(); }}>
                <CalendarDays className="mr-2 h-4 w-4" />
                {item.name}
                <span className="ml-auto text-xs text-muted-foreground">{section}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {songs.length > 0 && (
          <CommandGroup heading="Songs">
            {songs.map((song) => (
              <CommandItem key={song.id} value={`song ${song.name} ${song.author ?? ''}`} onSelect={() => { onSong(song); close(); }}>
                <Music className="mr-2 h-4 w-4" />
                {song.name}
                {song.author && <span className="ml-auto text-xs text-muted-foreground truncate max-w-[40%]">{song.author}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Do">
          {actions.map((a) => {
            const Icon = ICONS[a.icon];
            return (
              <CommandItem key={a.id} value={`do ${a.label}`} onSelect={() => { a.run(); close(); }}>
                <Icon className="mr-2 h-4 w-4" />
                {a.label}
                {a.hint && <span className="ml-auto text-xs text-muted-foreground">{a.hint}</span>}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
