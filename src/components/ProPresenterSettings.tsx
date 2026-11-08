import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, Laptop, Monitor, Radio, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { desktop, ProPresenterConnection, ProPresenterStatus, ProPresenterThemeSlide } from '@/lib/desktop';
import { connectionOf, loadProPresenterSettings, NOT_SHOWING, ProPresenterSettings as Settings, saveProPresenterSettings } from '@/lib/proPresenter';
import { DOWNLOAD_PAGE_URL } from '@/lib/releases';
import { loadAppMode, saveAppMode } from '@/lib/appMode';
import { List, Mark, Note, Row, Section, Toggle } from './settings/kit';

const TEST_VERSE = {
  reference: 'John 3:16',
  text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
};
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

type Found = { host: string; port: number; version: string; name: string; here: boolean };
const isLocal = (host: string) => host === '127.0.0.1' || host === 'localhost';
const same = (a: ProPresenterConnection, b: ProPresenterConnection) => a.port === b.port && (a.host === b.host || (isLocal(a.host) && isLocal(b.host)));

/**
 * Settings → ProPresenter: Voice Verses can also send its verses into
 * ProPresenter. Every ProPresenter on this computer and the church network is
 * listed; one click connects and makes the "Voice Verses" message.
 */
export function ProPresenterSettings() {
  const [settings, setSettings] = useState<Settings>(loadProPresenterSettings);
  const [status, setStatus] = useState<ProPresenterStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  /** What ProPresenter says about the message, its layers, screens and Look (after a test verse, or on asking) */
  const [diagnosis, setDiagnosis] = useState<{ state: 'ok' | 'warn' | 'problem'; title: string; detail: string }[] | null>(null);
  const [found, setFound] = useState<Found[] | null>(null);
  const [searchedAt, setSearchedAt] = useState<Date | null>(null);
  const [themes, setThemes] = useState<ProPresenterThemeSlide[]>([]);
  const [theme, setTheme] = useState('');
  const [manual, setManual] = useState({ host: settings.host, port: String(settings.port || '') });

  const save = (changes: Partial<Settings>) => {
    const next = { ...settings, ...changes };
    setSettings(next);
    saveProPresenterSettings(next);
    return next;
  };

  const run = async (what: string, action: () => Promise<void>) => {
    setBusy(what);
    try {
      await action();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  /** How the saved connection is doing; offers the themes when the message is missing. */
  const check = useCallback(async (connection: ProPresenterConnection) => {
    setError(null);
    try {
      const result = await desktop!.proPresenter.status(connection);
      setStatus(result);
      if (!result.hasMessage) {
        const slides = await desktop!.proPresenter.themes(connection).catch(() => []);
        setThemes(slides);
        setTheme(slides[0]?.id.uuid ?? '');
      }
    } catch (e) {
      setStatus(null);
      setError(errorText(e));
    }
  }, []);

  const search = useCallback(async () => {
    setBusy('search');
    try {
      const saved = loadProPresenterSettings();
      const list = desktop!.proPresenter.search
        ? await desktop!.proPresenter.search({ ports: saved.port ? [saved.port] : [] })
        : await desktop!.proPresenter.find?.().then((r) => (r ? [{ ...r, here: true }] : []));
      setFound(list ?? []);
      setSearchedAt(new Date());
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    if (!desktop) return;
    const saved = loadProPresenterSettings();
    if (saved.enabled) void check(connectionOf(saved));
    void search();
  }, [check, search]);

  /** Connect to one: save it, make the "Voice Verses" message if missing, say what is ready. */
  const connect = (connection: ProPresenterConnection, label: string) =>
    run(`connect:${connection.host}:${connection.port}`, async () => {
      setError(null);
      save({ ...connection, enabled: true });
      setManual({ host: connection.host, port: String(connection.port) });
      const ready = desktop!.proPresenter.setUp ? await desktop!.proPresenter.setUp(connection) : await desktop!.proPresenter.status(connection);
      setStatus(ready);
      if (!ready.hasMessage) await check(connection);
      toast.success(`Connected to ${label}`, {
        description: 'theme' in ready && ready.theme ? `Made the “Voice Verses” message with the theme “${ready.theme}”.` : undefined,
      });
    });

  const sendTest = () =>
    run('test', async () => {
      const result = await desktop!.proPresenter.show(connectionOf(settings), { ...TEST_VERSE, stage: settings.stage, force: true });
      if (desktop!.proPresenter.diagnose) setDiagnosis((await desktop!.proPresenter.diagnose(connectionOf(settings))).checks);
      if (result && result.messagesOn === false) toast.warning('ProPresenter took John 3:16 but isn’t showing it', { description: NOT_SHOWING, duration: 12000 });
      else toast.success('Sent John 3:16 to ProPresenter', { description: 'ProPresenter is showing it on its Messages layer. If its screens still show nothing, its current Look has the Messages layer off for them.' });
    });
  const askWhy = () =>
    run('why', async () => {
      if (desktop!.proPresenter.diagnose) setDiagnosis((await desktop!.proPresenter.diagnose(connectionOf(settings))).checks);
    });
  const clearTest = () => run('clear', () => desktop!.proPresenter.clear(connectionOf(settings), { stage: settings.stage }));
  const createMessage = () =>
    run('create', async () => {
      const slide = themes.find((t) => t.id.uuid === theme);
      if (!slide) throw new Error('Choose a look for the verse.');
      setStatus(await desktop!.proPresenter.createMessage(connectionOf(settings), slide.id));
      toast.success('Made the “Voice Verses” message in ProPresenter');
    });

  if (!desktop) {
    return (
      <div className="st-page">
        <div className="st-hero plain">
          <span className="st-glyph off">
            <Radio />
          </span>
          <div>
            <h4>ProPresenter needs the desktop app</h4>
            <p className="sub">In a browser, Voice Verses can’t reach ProPresenter. The desktop app for Mac and Windows can.</p>
          </div>
          <a className="st-btn primary" href={DOWNLOAD_PAGE_URL} target="_blank" rel="noopener noreferrer">
            Download
          </a>
        </div>
      </div>
    );
  }

  const current = connectionOf(settings);
  const connected = settings.enabled && !!status;
  const where = isLocal(settings.host) ? 'this computer' : settings.host;
  const searching = busy === 'search';

  return (
    <div className="st-page" data-propresenter-page>
      <div className={`st-hero ${connected ? '' : 'plain'}`} data-propresenter-status={connected ? 'connected' : error ? 'error' : 'off'}>
        <span className={`st-glyph ${connected ? '' : 'off'}`}>
          <Radio />
        </span>
        <div style={{ minWidth: 0 }}>
          {connected ? (
            <>
              <h4>Connected to {status!.name || 'ProPresenter'}</h4>
              <p className="sub">
                <b>{status!.version || 'ProPresenter'}</b> · {where} · port {settings.port}
              </p>
              <div className="st-okline">
                <span>
                  <Check />
                  Network is on
                </span>
                <span className={status!.messageReady ? '' : 'no'}>
                  {status!.messageReady ? <Check /> : <AlertCircle />}
                  {status!.messageReady ? '“Voice Verses” message ready' : status!.hasMessage ? 'The message needs {Verse} and {Reference}' : 'No “Voice Verses” message yet'}
                </span>
              </div>
            </>
          ) : settings.enabled && error ? (
            <>
              <h4>Can’t reach ProPresenter</h4>
              <p className="sub">{error}</p>
            </>
          ) : (
            <>
              <h4>Not connected</h4>
              <p className="sub">Voice Verses works on its own. Connect ProPresenter to send the verses into its looks as well.</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[13.5px] font-semibold">Send verses</span>
          <Toggle
            label="Send verses to ProPresenter"
            checked={settings.enabled}
            onChange={(enabled) => {
              save({ enabled });
              if (enabled) void check(current);
            }}
          />
        </div>
      </div>

      <Section
        title="ProPresenter on your network"
        aside={searching ? (
          <span className="inline-flex items-center gap-2">
            <span className="st-spin" />
            Looking on this computer and the network…
          </span>
        ) : searchedAt ? (found?.length ? `Found ${found.length}` : 'None found') : null}
        action={
          <button type="button" className="st-btn ghost" onClick={() => void search()} disabled={searching}>
            <RefreshCw />
            Search again
          </button>
        }
      >
        <List label="ProPresenter found">
          {(found ?? []).map((f) => {
            const conn = { host: f.host, port: f.port };
            const isCurrent = settings.enabled && same(conn, current) && !!status;
            const label = f.here ? 'This computer' : f.name || f.host;
            return (
              <Row
                key={`${f.host}:${f.port}`}
                data-found={f.here ? 'here' : f.host}
                lead={
                  <span className="st-comp">
                    {f.here ? <Laptop /> : <Monitor />}
                  </span>
                }
                title={
                  <>
                    {label}
                    {isCurrent && <span className="st-pill accent">Connected</span>}
                  </>
                }
                desc={`${f.version || 'ProPresenter'}${f.here ? '' : ` · ${f.host}`} · port ${f.port}`}
              >
                {isCurrent ? (
                  <button type="button" className="st-btn soft" onClick={sendTest} disabled={!!busy || !status?.messageReady}>
                    Send a test verse
                  </button>
                ) : (
                  <button type="button" className="st-btn" onClick={() => connect(conn, f.here ? 'ProPresenter on this computer' : label)} disabled={!!busy}>
                    {busy === `connect:${f.host}:${f.port}` ? <span className="st-spin" /> : null}
                    Connect
                  </button>
                )}
              </Row>
            );
          })}
          {found && found.length === 0 && !searching && (
            <Row dim lead={<span className="st-comp"><Monitor /></span>} title="No ProPresenter found" desc="Not on this computer, and none answered on the church network." />
          )}
          {!found && <Row dim lead={<span className="st-spin" />} title="Looking…" desc="On this computer and the church network." />}
        </List>
      </Section>

      {connected && !status!.hasMessage && (
        <Section title="The “Voice Verses” message">
          <List plain>
            <Row title="Make the message" desc="ProPresenter shows verses through a message called “Voice Verses”. Choose the look it uses.">
              {themes.length > 0 ? (
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="st-select-trigger max-w-[220px]" aria-label="Look for the verse">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {themes.map((t) => (
                      <SelectItem key={t.id.uuid} value={t.id.uuid}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="st-aside">No themes in ProPresenter</span>
              )}
              <button type="button" className="st-btn primary" onClick={createMessage} disabled={!!busy || !theme}>
                Make it
              </button>
            </Row>
          </List>
        </Section>
      )}
      {connected && status!.hasMessage && !status!.messageReady && (
        <Note warn>
          The “Voice Verses” message needs a <b>{'{Verse}'}</b> and a <b>{'{Reference}'}</b> token. In ProPresenter’s Messages, type each name in Add Token and click the tick.
          {status!.tokens?.length ? ` It has: ${status!.tokens.join(', ')}.` : ''}
        </Note>
      )}
      {connected && status!.messageReady && status!.tokensUnconfirmed && (
        <Note>ProPresenter didn’t say which tokens the message has. Send a test verse: if it shows on ProPresenter’s output, it’s set up.</Note>
      )}

      {diagnosis && (
        <Section title="What ProPresenter says" aside="Asked just now" data-pp-diagnosis>
          <List>
            {diagnosis.map((c, i) => (
              <Row key={i} lead={<Mark state={c.state} />} title={c.title} desc={c.detail} />
            ))}
          </List>
        </Section>
      )}

      <Section title="What ProPresenter shows">
        <List plain>
          <Row title="Its look" desc="Change the theme, size and position in ProPresenter’s message called “Voice Verses”. The Look on ProPresenter’s screens needs the Messages layer on." />
          <Row title="Also on ProPresenter’s stage screens" desc="The verse appears as a stage message too.">
            <Toggle id="pp-stage" label="Also on ProPresenter’s stage screens" checked={settings.stage} onChange={(stage) => save({ stage })} />
          </Row>
          <Row title="Try it" desc="Sends John 3:16 now, then clears it when you press Clear it.">
            <button type="button" className="st-btn" onClick={sendTest} disabled={!connected || !!busy}>
              Send a test verse
            </button>
            <button type="button" className="st-btn ghost" onClick={clearTest} disabled={!connected || !!busy}>
              Clear it
            </button>
            {desktop.proPresenter.diagnose && (
              <button type="button" className="st-btn ghost" onClick={askWhy} disabled={!connected || !!busy} data-pp-why>
                Why isn’t it on the screens?
              </button>
            )}
          </Row>
          {loadAppMode() === 'screens' && (
            <Row title="Companion screen" desc="For a second operator who only sends verses to ProPresenter: listen, approve each verse, clear.">
              <button
                type="button"
                className="st-btn"
                onClick={() => {
                  save({ enabled: true });
                  saveAppMode('propresenter');
                }}
              >
                Open it
              </button>
            </Row>
          )}
        </List>
      </Section>

      <Section title="Not in the list?">
        <ol className="st-steps">
          <li>
            <i>1</i>
            <b>Open ProPresenter’s settings</b>ProPresenter → Settings → Network.
          </li>
          <li>
            <i>2</i>
            <b>Turn on Enable Network</b>Leave the port it shows as it is.
          </li>
          <li>
            <i>3</i>
            <b>Same network</b>Both computers on the church network, not guest Wi‑Fi. Then Search again.
          </li>
        </ol>
        <details className="st-more">
          <summary>Type the address yourself</summary>
          <div className="inner">
            <form
              className="grid gap-2 grid-cols-[minmax(0,1fr)_110px_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                const port = Number(manual.port.replace(/\D/g, ''));
                connect({ host: manual.host.trim() || '127.0.0.1', port }, manual.host.trim() || 'this computer');
              }}
            >
              <input id="pp-host" className="st-input" aria-label="Computer address" placeholder="192.168.1.24" value={manual.host} onChange={(e) => setManual({ ...manual, host: e.target.value })} />
              <input id="pp-port" className="st-input" aria-label="Port" inputMode="numeric" placeholder="Port" value={manual.port} onChange={(e) => setManual({ ...manual, port: e.target.value })} />
              <button type="submit" className="st-btn primary" disabled={!!busy}>
                Connect
              </button>
            </form>
            <p className="st-hint">The address and port are in ProPresenter → Settings → Network. On the same computer, use 127.0.0.1.</p>
          </div>
        </details>
      </Section>
    </div>
  );
}
