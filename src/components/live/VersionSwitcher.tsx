import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BibleParser } from '@/lib/bibleParser';
import { chosenApiBibles } from '@/lib/onlineBibles';
import { BIBLE_VERSIONS, BibleVersionType } from '@/types/bibleVersion';

interface Choice {
  id: BibleVersionType;
  short: string;
  name: string;
  online: boolean;
}

/** The translations this church can use now: the three built in, plus any set up in Settings. */
function versionChoices(): Choice[] {
  const current = BibleParser.getVersion();
  const built = BIBLE_VERSIONS.filter((v) => {
    if (v.isOffline && v.id !== 'custom') return true;
    if (v.id === 'custom') return !!localStorage.getItem('cornerstone-custom-bible') || current === 'custom';
    // ESV and NLT need their key, set in Settings → Bible
    return v.id === current || !!BibleParser.getApiKey(v.id as 'esv' | 'nlt');
  }).map((v) => ({ id: v.id, short: v.name, name: v.fullName.replace(' (Online)', ''), online: !v.isOffline }));
  const api = chosenApiBibles().map((b) => ({ id: `api:${b.id}` as BibleVersionType, short: b.abbreviation, name: b.name, online: true }));
  return [...built, ...api];
}

/**
 * The Bible translation, switched from the live screen: a small "KJV ▾"
 * beside the passage. The verse on the screens changes to the new translation
 * at once. More translations are set up in Settings → Bible.
 */
export const VersionSwitcher = ({ onChange, onMore, className = '' }: { onChange: (version: BibleVersionType) => void; onMore: () => void; className?: string }) => {
  const [current, setCurrent] = useState(BibleParser.getVersion());
  const [choices, setChoices] = useState<Choice[]>(versionChoices);

  return (
    <DropdownMenu onOpenChange={(open) => open && (setChoices(versionChoices()), setCurrent(BibleParser.getVersion()))}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`h-9 px-3 rounded-xl bg-muted/70 hover:bg-muted text-[13px] font-bold tracking-wide flex items-center gap-1.5 ${className}`}
          title="Change the Bible translation on the screens"
          aria-label={`Bible translation: ${BibleParser.getVersionLabel(current)}. Change it`}
          data-version-switcher
        >
          {BibleParser.getVersionLabel(current)}
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-[13px] text-muted-foreground font-semibold">Show verses in</DropdownMenuLabel>
        {choices.map((c) => (
          <DropdownMenuItem
            key={c.id}
            className="min-h-10 gap-3"
            onSelect={() => {
              BibleParser.setVersion(c.id);
              setCurrent(c.id);
              onChange(c.id);
            }}
          >
            <b className="w-12 text-[13px]">{c.short}</b>
            <span className="flex-1 min-w-0 truncate text-[13px]">
              {c.name}
              {c.online && <span className="text-muted-foreground"> · needs internet</span>}
            </span>
            {c.id === current && <Check className="w-4 h-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="min-h-10 text-[13px]" onSelect={onMore}>
          More translations (NKJV, NIV, ESV…)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
