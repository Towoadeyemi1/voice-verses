import { RefreshCw } from 'lucide-react';
import { desktop } from '@/lib/desktop';
import { useUpdates } from '@/hooks/use-updates';
import { List, Note, Row, Section, Sq } from './kit';

const when = (t?: number) => (t ? new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '');

/**
 * Settings → Desktop app → Updates (1.19.9): the version on this computer, whether a newer one
 * is out, and the one button that moves it on. Nothing restarts or opens by itself.
 */
export function UpdatesSection() {
  const s = useUpdates();
  const updates = desktop?.updates;
  if (!updates || !s) return null;

  const percent = `${s.percent ?? 0}%`;
  const desc = (() => {
    switch (s.status) {
      case 'unsupported':
        return 'This copy can’t update itself (it isn’t an installed app).';
      case 'checking':
        return 'Looking for a newer version…';
      case 'latest':
        return `This is the latest version. Looked at ${when(s.checkedAt)}; Voice Verses looks again every 4 hours.`;
      case 'available':
        return s.how === 'installer' ? `Version ${s.version} is out. Download it, then open it to replace this one.` : `Version ${s.version} is out.`;
      case 'downloading':
        return `Downloading version ${s.version}: ${percent}. You can carry on working.`;
      case 'ready':
        return `Version ${s.version} is ready. Restart to update now, or it installs the next time Voice Verses is quit.`;
      case 'downloaded':
        return `Version ${s.version} is in your Downloads folder. Open it, drag Voice Verses to Applications and choose Replace. Quit Voice Verses first.`;
      case 'error':
        return s.error ?? 'Couldn’t check for updates.';
      default:
        return 'Voice Verses looks for a newer version when it opens and every 4 hours.';
    }
  })();

  const action = (() => {
    switch (s.status) {
      case 'available':
        return s.how === 'installer' ? (
          <button type="button" className="st-btn primary" onClick={() => void updates.download()} data-update-action="download">
            Download {s.version}
          </button>
        ) : null;
      case 'ready':
        return (
          <button type="button" className="st-btn primary" onClick={() => void updates.install()} data-update-action="restart">
            Restart to update
          </button>
        );
      case 'downloaded':
        return (
          <button type="button" className="st-btn primary" onClick={() => void updates.install()} data-update-action="open">
            Open the installer
          </button>
        );
      case 'checking':
      case 'downloading':
        return <span className="st-spin" aria-hidden="true" />;
      case 'unsupported':
        return null;
      default:
        return (
          <button type="button" className="st-btn" onClick={() => void updates.check()} data-update-action="check">
            Check now
          </button>
        );
    }
  })();

  return (
    <Section title="Updates" data-updates>
      <List>
        <Row lead={<Sq tint="teal" icon={RefreshCw} />} title={`Voice Verses ${s.current}${s.version && s.status !== 'latest' ? ` → ${s.version}` : ''}`} desc={<span data-update-status={s.status}>{desc}</span>}>
          {action}
        </Row>
      </List>
      {s.status === 'downloading' && (
        <div className="st-progress" role="progressbar" aria-valuenow={s.percent ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label="Download">
          <span style={{ width: percent }} />
        </div>
      )}
      {s.error && s.status !== 'error' && <Note warn>{s.error}</Note>}
      {s.how === 'installer' && s.status !== 'latest' && s.status !== 'unsupported' && (
        <Note>Until Voice Verses is signed by Apple, a Mac updates by opening the new installer. Do it between services, not during one.</Note>
      )}
    </Section>
  );
}
