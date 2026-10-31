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

type MacChip = 'apple' | 'intel' | null;

/**
 * Which kind of Mac this is, when the browser can tell. The Apple-chip app does
 * not open on an Intel Mac ("not supported on this Mac"), so this matters.
 * Chrome and Edge report the CPU; otherwise the graphics chip name gives it away
 * unless the browser hides it (Safari), in which case we don't guess.
 */
async function detectMacChip(): Promise<MacChip> {
  const uaData = (navigator as Navigator & {
    userAgentData?: { getHighEntropyValues(hints: string[]): Promise<{ architecture?: string }> };
  }).userAgentData;
  try {
    const { architecture } = (await uaData?.getHighEntropyValues(['architecture'])) ?? {};
    if (architecture === 'arm') return 'apple';
    if (architecture === 'x86') return 'intel';
  } catch {
    // Fall through to the graphics check
  }
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer: string = info ? gl!.getParameter(info.UNMASKED_RENDERER_WEBGL) : '';
    if (/Apple M\d/i.test(renderer)) return 'apple';
    if (/Intel|AMD|Radeon|NVIDIA/i.test(renderer)) return 'intel';
  } catch {
    // No WebGL
  }
  return null;
}

interface LatestRelease {
  version: string;
  date: string;
}

/** Download buttons for the desktop app, pointing at the latest GitHub release. */
export const DesktopDownloads = () => {
  const [latest, setLatest] = useState<LatestRelease | null>(null);
  const [macChip, setMacChip] = useState<MacChip>(null);
  const platform = detectPlatform();

  useEffect(() => {
    if (platform === 'mac') detectMacChip().then(setMacChip);
  }, [platform]);

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
    { label: 'Mac with Apple chip (M1 or later)', file: INSTALLERS.macAppleSilicon, recommended: platform === 'mac' && macChip === 'apple' },
    { label: 'Mac with Intel processor', file: INSTALLERS.macIntel, recommended: platform === 'mac' && macChip === 'intel' },
    { label: 'Windows', file: INSTALLERS.windows, recommended: platform === 'windows' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {buttons.map((b) => (
          <Button
            key={b.file}
            variant={b.recommended ? 'default' : 'outline'}
            className="gap-2"
            onClick={() => window.open(installerUrl(b.file), '_blank')}
          >
            <Download className="w-4 h-4" />
            Download for {b.label}
          </Button>
        ))}
      </div>
      {platform === 'mac' && (
        <p className="text-sm">
          {macChip === 'intel'
            ? 'This Mac has an Intel processor: use “Mac with Intel processor”.'
            : macChip === 'apple'
              ? 'This Mac has an Apple chip: use “Mac with Apple chip”.'
              : 'Check which Mac you have first: Apple menu → About This Mac. “Chip: Apple M…” means Apple chip; “Processor: … Intel …” means Intel. The wrong one says “not supported on this Mac”.'}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {latest ? `Version ${latest.version}, released ${latest.date}. ` : ''}
        One installer includes everything, including the offline speech model (about 650 MB). Requires macOS 12 or
        later, or Windows 10 or later.{' '}
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
