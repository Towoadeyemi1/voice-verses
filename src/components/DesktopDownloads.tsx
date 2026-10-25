import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';
import { DOWNLOAD_PAGE_URL, INSTALLERS, RELEASES_REPO, installerUrl } from '@/lib/releases';

type Platform = 'mac' | 'windows' | 'other';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/Mac OS X|Macintosh/.test(ua)) return 'mac';
  if (/Windows/.test(ua)) return 'windows';
  return 'other';
}

interface LatestRelease {
  version: string;
  date: string;
}

/** Download buttons for the desktop app, pointing at the latest GitHub release. */
export const DesktopDownloads = () => {
  const [latest, setLatest] = useState<LatestRelease | null>(null);
  const platform = detectPlatform();

  useEffect(() => {
    fetch(`https://api.github.com/repos/${RELEASES_REPO}/releases/latest`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tag_name) {
          setLatest({ version: data.tag_name.replace(/^v/, ''), date: new Date(data.published_at).toLocaleDateString() });
        }
      })
      .catch(() => {});
  }, []);

  const buttons = [
    { label: 'Mac (Apple chip)', file: INSTALLERS.macAppleSilicon, for: 'mac' },
    { label: 'Mac (Intel)', file: INSTALLERS.macIntel, for: 'mac' },
    { label: 'Windows', file: INSTALLERS.windows, for: 'windows' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {buttons.map((b) => (
          <Button
            key={b.file}
            variant={b.for === platform ? 'default' : 'outline'}
            className="gap-2"
            onClick={() => window.open(installerUrl(b.file), '_blank')}
          >
            <Download className="w-4 h-4" />
            Download for {b.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {latest ? `Version ${latest.version}, released ${latest.date}. ` : ''}
        One installer includes everything, including the offline speech model (about 700 MB). Requires macOS 12 or
        later, or Windows 10 or later. Not sure which Mac you have? Apple menu → About This Mac: “Chip: Apple M…” means
        Apple chip; “Processor: Intel” means Intel.{' '}
        <a href={DOWNLOAD_PAGE_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
          All downloads <ExternalLink className="w-3 h-3" />
        </a>
      </p>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Opening it the first time</summary>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>
            <strong>Mac:</strong> open the .dmg and drag Voice Verses to Applications. If macOS says it can’t verify the
            app, open System Settings → Privacy &amp; Security and click <em>Open Anyway</em>.
          </li>
          <li>
            <strong>Windows:</strong> if SmartScreen says “Windows protected your PC”, click <em>More info</em> →{' '}
            <em>Run anyway</em>.
          </li>
          <li>Allow microphone access when asked. Updates install automatically after that.</li>
        </ul>
      </details>
    </div>
  );
};
