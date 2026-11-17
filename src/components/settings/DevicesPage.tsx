import { useEffect, useState } from 'react';
import { Code2, KeyRound, Network, Smartphone, Webhook } from 'lucide-react';
import { toast } from 'sonner';
import { desktop, type ApiScope, type ApiStatus } from '@/lib/desktop';
import { DOWNLOAD_PAGE_URL } from '@/lib/releases';
import { configureApi, loadApiSettings } from '@/modules/localApi';
import { Hint, List, Note, Row, Section, Sq, Toggle } from './kit';

const REPO_DOCS = 'https://github.com/Towoadeyemi1/voice-verses/blob/main/docs/api/README.md';

/** "2 minutes ago" for when a device last used Voice Verses */
function ago(iso: string | null): string {
  if (!iso) return 'not used yet';
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'used just now';
  if (minutes < 60) return `used ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `used ${hours} hour${hours === 1 ? '' : 's'} ago`;
  return `used ${new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
}

const allowed = (scopes: ApiScope[]) => (scopes.includes('control') ? 'Can see what’s on and control the screens' : 'Can see what’s on');

/**
 * Settings → Other apps and devices (the local API, 1.19.5, D33): turn it on, pair a device
 * with a six-digit code, see what is paired and remove it. Desktop app only.
 */
export function DevicesPage() {
  const api = desktop?.api;
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [control, setControl] = useState(true);
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);

  const refresh = async () => {
    if (api) setStatus(await api.status());
  };

  useEffect(() => {
    if (!api) return;
    void refresh();
    return api.onChange((detail) => {
      if (detail?.paired) toast.success(`Paired with ${detail.paired}`);
      void refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The code's time left, while one is showing
  const pairing = status?.pairing && status.pairing.expires > Date.now() ? status.pairing : null;
  useEffect(() => {
    if (!pairing) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [pairing]);

  if (!api) {
    return (
      <div className="st-page">
        <div className="st-hero plain">
          <span className="st-glyph off">
            <Network />
          </span>
          <div>
            <h4>Other apps and devices need the desktop app</h4>
            <p className="sub">The desktop app for Mac and Windows lets a Stream Deck, a phone or your church’s own apps use Voice Verses over the church network.</p>
          </div>
          <a className="st-btn primary" href={DOWNLOAD_PAGE_URL} target="_blank" rel="noopener noreferrer">
            Download
          </a>
        </div>
      </div>
    );
  }

  const on = status?.enabled ?? loadApiSettings().enabled;

  const turn = async (enabled: boolean) => {
    setBusy(true);
    try {
      await configureApi(enabled);
      await refresh();
    } catch (error) {
      toast.error('Couldn’t turn it on', { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  };

  const showCode = async () => {
    await api.startPairing(control ? ['read', 'control'] : ['read']);
    await refresh();
  };

  const stopCode = async () => {
    await api.stopPairing();
    await refresh();
  };

  const remove = async (id: string, name: string) => {
    await api.removeDevice(id);
    await refresh();
    toast(`${name} can no longer use Voice Verses`);
  };

  const left = pairing ? Math.max(0, Math.ceil((pairing.expires - Date.now()) / 1000)) : 0;
  const address = status?.urls[0];

  return (
    <div className="st-page" data-devices-page>
      <div className="st-hero">
        <span className="st-glyph" style={{ background: 'var(--i-indigo)' }}>
          <Network />
        </span>
        <div>
          <h4>{on ? 'Open to paired apps and devices' : 'Closed to other apps and devices'}</h4>
          <p className="sub">
            {on
              ? 'Paired apps and devices on the church network can see what’s on the screens and follow what happens. Those you allow can control the screens.'
              : 'Let a Stream Deck, a phone, or your church’s own apps use Voice Verses over the church network. Each one is paired once with a code.'}
          </p>
        </div>
        <Toggle checked={on} onChange={(v) => void turn(v)} label="Let other apps and devices use Voice Verses" disabled={busy} id="api-switch" />
      </div>

      {on && (
        <>
          <Section title="Where they find Voice Verses">
            <List>
              <Row lead={<Sq tint="indigo" icon={Network} />} title="The address" desc={address ? <span className="st-addr" data-api-address>{address}</span> : 'Not on a network right now.'}>
                {status?.listening ? <span className="st-pill accent">{status.listening} following now</span> : null}
              </Row>
            </List>
            <Hint>Apps that look for it on the network find it by themselves, as “Voice Verses”. It uses the same port as the network screens.</Hint>
          </Section>

          <Section title="Pair a device" data-api-pair>
            {pairing ? (
              <List>
                <div className="st-pair-code" data-api-code>
                  <span className="code" aria-label={`Pairing code ${pairing.code.split('').join(' ')}`}>
                    {pairing.code.slice(0, 3)} {pairing.code.slice(3)}
                  </span>
                  <span className="t">Type this code in the other app.</span>
                  <span className="d">
                    It works once, for {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} more. {allowed(pairing.scopes)}.
                  </span>
                  <button type="button" className="st-btn ghost" onClick={() => void stopCode()}>
                    Stop
                  </button>
                </div>
              </List>
            ) : (
              <List>
                <Row lead={<Sq tint="teal" icon={Smartphone} />} title="See what’s on the screens" desc="What the screens show, what waits in Next, the services, and every change as it happens.">
                  <span className="st-pill">Always</span>
                </Row>
                <Row lead={<Sq tint="orange" icon={KeyRound} />} title="Control the screens" desc="Show a verse, put one in Next, Take, go forward or back, Clear, and the logo.">
                  <Toggle checked={control} onChange={setControl} label="Allow it to control the screens" />
                </Row>
                <div className="st-row-actions">
                  <button type="button" className="st-btn primary" onClick={() => void showCode()} data-api-pair-start>
                    Show a pairing code
                  </button>
                </div>
              </List>
            )}
          </Section>

          <Section title="Paired" aside={status?.devices.length ? `${status.devices.length}` : undefined} data-api-devices>
            <List>
              {status?.devices.length ? (
                status.devices.map((d) => (
                  <div key={d.id} data-api-device={d.name}>
                    <Row lead={<Sq tint={d.scopes.includes('control') ? 'orange' : 'teal'} icon={Smartphone} />} title={d.name} desc={`${allowed(d.scopes)} · ${ago(d.lastUsed)}`}>
                      <button type="button" className="st-btn ghost" onClick={() => void remove(d.id, d.name)}>
                        Remove
                      </button>
                    </Row>
                    {d.webhooks.map((h) => (
                      <Row key={h.id} dim={h.paused} lead={<Sq tint="slate" icon={Webhook} size="sm" />} title={<span className="st-addr">{h.url}</span>} desc={h.paused ? 'Stopped sending: the address didn’t answer 20 times in a row.' : `Sends ${h.types.join(', ') === '*' ? 'every event' : h.types.join(', ')} as it happens`}>
                        {h.paused ? <span className="st-pill warn">Stopped</span> : null}
                        <button type="button" className="st-btn ghost" onClick={async () => (await api.removeWebhook(d.id, h.id), refresh())}>
                          Stop sending
                        </button>
                      </Row>
                    ))}
                  </div>
                ))
              ) : (
                <Row dim lead={<Sq tint="slate" icon={Smartphone} />} title="Nothing paired yet" desc="Show a pairing code above, then type it in the other app." />
              )}
            </List>
          </Section>

          <Section title="For the people who make the other apps">
            <List>
              <Row lead={<Sq tint="slate" icon={Code2} />} title="How to use it" desc={address ? <span className="st-addr">{address}/openapi.json · {address}/asyncapi.json</span> : 'openapi.json and asyncapi.json, at the address above'}>
                <a className="st-btn" href={REPO_DOCS} target="_blank" rel="noopener noreferrer">
                  Open the guide
                </a>
              </Row>
            </List>
            <Note>Only paired devices can use it, each with its own key, and you can remove any of them here. The network screens stay separate: they can only show.</Note>
          </Section>
        </>
      )}
    </div>
  );
}
