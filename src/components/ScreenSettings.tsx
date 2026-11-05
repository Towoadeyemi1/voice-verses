import { useEffect, useState } from 'react';
import { Cable, Copy, Layers, MonitorUp, Plus, Radio, Share2, TvMinimal, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DeckLinkConfig, DeckLinkDevices, DeckLinkStatus, desktop, DisplayInfo, NetworkStatus, ScreenConfig, ScreenOutput } from '@/lib/desktop';
import { DECKLINK_MODES, DEFAULT_DECKLINK_MODE, decklinkModeLabel } from '@/lib/decklinkModes';
import { configureNetwork, loadNetworkSettings } from '@/lib/networkPublisher';
import { loadProPresenterSettings } from '@/lib/proPresenter';
import type { Output } from '@/lib/templates';
import { ScreenShapePicker } from './ScreenShapePicker';
import { MotionSettings } from './MotionSettings';
import { Note, Section, Seg, Sq } from './settings/kit';
import { OutputPreview } from './settings/OutputPreview';
import type { Pane } from './SettingsPanel';

const OUTPUTS: { output: ScreenOutput; label: string; note: string; path: string }[] = [
  { output: 'projection', label: 'Projector', note: 'for the room', path: '#/projection' },
  { output: 'lowerThird', label: 'Lower third', note: 'for the stream', path: '#/lower-third' },
  { output: 'confidence', label: 'Stage monitor', note: 'for the platform', path: '#/confidence' },
];
const NAME: Record<ScreenOutput, string> = { projection: 'Projector', lowerThird: 'Lower third', confidence: 'Stage monitor' };
/** Outputs drawn from looks have a shape; the stage monitor fills any screen by itself. */
const SHAPED: Partial<Record<ScreenOutput, Output>> = { projection: 'projection', lowerThird: 'stream' };
const NOTHING = 'nothing';

type Device =
  | { kind: 'display'; key: string; display: DisplayInfo; number: number; missing?: false }
  | { kind: 'missing'; key: string; id: number }
  | { kind: 'sdi'; key: string; name: string }
  | { kind: 'net'; key: 'net' };

/**
 * Settings → Screens and outputs: a picture of the room (each display, DeckLink
 * port and the network, with what it shows, drawn by the real renderer), each
 * output with every place it goes, and the ways to connect a screen.
 */
export function ScreenSettings({ onGo }: { onGo?: (pane: Pane) => void }) {
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [config, setConfig] = useState<ScreenConfig | null>(null);
  const [decklink, setDeckLink] = useState<DeckLinkDevices | null>(null);
  const [dlConfig, setDlConfig] = useState<DeckLinkConfig | null>(null);
  const [dlStatus, setDlStatus] = useState<DeckLinkStatus | null>(null);
  const [network, setNetwork] = useState(loadNetworkSettings);
  const [netStatus, setNetStatus] = useState<NetworkStatus | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!desktop) return;
    const dl = desktop.decklink;
    const refresh = () => {
      desktop!.screens.displays().then(setDisplays).catch(() => {});
      dl?.devices().then(setDeckLink).catch(() => {});
      dl?.status().then(setDlStatus).catch(() => {});
      desktop!.network.status().then(setNetStatus).catch(() => {});
    };
    refresh();
    desktop.screens.get().then(setConfig).catch(() => {});
    dl?.get().then(setDlConfig).catch(() => {});
    // Displays come and go (a converter switched on later, a cable moved)
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, []);

  if (!desktop) {
    return (
      <div className="st-page">
        <Note icon={MonitorUp}>
          Putting each output on its own screen by itself needs the Voice Verses desktop app. In a browser, open each output window and drag it to its screen.
        </Note>
        <Section title="Screen shapes">
          <div className="st-list p-4 grid gap-4">
            <ScreenShapePicker output="projection" label="Projector" />
            <ScreenShapePicker output="stream" label="Lower third" />
          </div>
        </Section>
        <MotionSettings />
      </div>
    );
  }

  const ports = decklink?.available ? decklink.devices.filter((d) => d.canOutput) : [];
  const devices: Device[] = [
    ...[...displays].sort((a, b) => Number(b.primary) - Number(a.primary)).map((d, i) => ({ kind: 'display' as const, key: `d:${d.id}`, display: d, number: i + 1 })),
    ...[...new Set(OUTPUTS.map(({ output }) => config?.[output]).filter((id): id is number => id != null && !displays.some((d) => d.id === id)))].map((id) => ({ kind: 'missing' as const, key: `d:${id}`, id })),
    ...ports.map((p) => ({ kind: 'sdi' as const, key: `dl:${p.name}`, name: p.name })),
    { kind: 'net' as const, key: 'net' as const },
  ];
  const firstExternal = devices.find((d) => d.kind === 'display' && !d.display.primary) ?? devices.find((d) => d.kind === 'sdi') ?? devices[0];
  const current = devices.find((d) => d.key === selected) ?? firstExternal;

  /** The outputs a device shows now */
  const showsOn = (d: Device): ScreenOutput[] =>
    OUTPUTS.map(({ output }) => output).filter((o) =>
      d.kind === 'display' ? config?.[o] === d.display.id : d.kind === 'missing' ? config?.[o] === d.id : d.kind === 'sdi' ? dlConfig?.[o]?.device === d.name : network.enabled,
    );

  const setDisplay = async (displayId: number, output: ScreenOutput | null) => {
    if (!config) return;
    const next = { ...config };
    for (const { output: o } of OUTPUTS) if (next[o] === displayId) next[o] = null;
    if (output) next[output] = displayId;
    setConfig(next);
    setConfig(await desktop!.screens.set(next));
  };
  const setPort = async (name: string, output: ScreenOutput | null) => {
    const dl = desktop!.decklink;
    if (!dl || !dlConfig) return;
    const next = { ...dlConfig };
    for (const { output: o } of OUTPUTS) if (next[o]?.device === name) next[o] = null;
    if (output) next[output] = { device: name, mode: dlConfig[output]?.mode ?? DEFAULT_DECKLINK_MODE };
    setDlConfig(next);
    setDlConfig(await dl.set(next));
    window.setTimeout(() => dl.status().then(setDlStatus).catch(() => {}), 1200);
  };
  const setFormat = async (output: ScreenOutput, mode: string) => {
    const dl = desktop!.decklink;
    const now = dlConfig?.[output];
    if (!dl || !dlConfig || !now) return;
    const next = { ...dlConfig, [output]: { ...now, mode } };
    setDlConfig(next);
    setDlConfig(await dl.set(next));
  };
  const setSharing = async (enabled: boolean, port = network.port) => {
    const next = { ...network, enabled, port };
    setNetwork(next);
    try {
      setNetStatus(await configureNetwork(next));
    } catch (e) {
      toast.error('Could not share the screens on the network', { description: e instanceof Error ? e.message : String(e) });
    }
  };
  const copy = (url: string) => navigator.clipboard.writeText(url).then(() => toast.success('Address copied'));
  const base = netStatus?.running ? netStatus.urls[0] : undefined;

  return room();

  // ---- The picture of the room ------------------------------------------------------------

  function room() {
    return (
      <div className="st-page" data-screens-page>
        <div className="st-room">
          <div className="st-devices" role="group" aria-label="Your screens">
            {devices.map((d) => deviceButton(d))}
          </div>
          <div className="st-room-foot">
            <p className="st-hint">
              {displays.length <= 1 && !ports.length
                ? 'Only this computer’s own screen is connected. A projector, TV or HDMI‑to‑SDI converter appears here as soon as it is plugged in and switched on.'
                : 'Click a screen to choose what it shows. Plug in a display or a DeckLink port and it appears here by itself.'}
            </p>
            {desktop!.screens.identify && (
              <button type="button" className="st-btn" onClick={() => desktop!.screens.identify?.()} title="A big number on every display for a few seconds">
                <MonitorUp />
                Identify screens
              </button>
            )}
          </div>
        </div>
        {current && inspector(current)}
        {outputs()}
        {ways()}
        <MotionSettings />
      </div>
    );
  }

  function deviceButton(d: Device) {
    const shows = showsOn(d);
    const pressed = current?.key === d.key;
    const tags = shows.length ? shows.map((o) => <span key={o} className="st-tag">{NAME[o]}</span>) : <span className="st-tag none">{d.kind === 'display' && d.display.primary ? 'Voice Verses' : d.kind === 'net' ? 'Off' : 'Nothing'}</span>;
    const common = { type: 'button' as const, 'aria-pressed': pressed, onClick: () => setSelected(d.key), 'data-device': d.key };
    if (d.kind === 'display' && d.display.primary && !shows.length)
      return (
        <button key={d.key} className="st-dev laptop" {...common}>
          <span className="st-bezel">
            <span className="num">{d.number}</span>
            <span className="ui">
              <i />
              <i />
            </span>
          </span>
          <span className="base" />
          <span className="label">
            <b>This computer</b>
            <span>Where you work · {d.display.width}×{d.display.height}</span>
          </span>
          <span className="shows">{tags}</span>
        </button>
      );
    if (d.kind === 'display' || d.kind === 'missing')
      return (
        <button key={d.key} className="st-dev monitor" {...common}>
          <span className="st-bezel" style={d.kind === 'missing' ? { opacity: 0.45 } : undefined}>
            {d.kind === 'display' && <span className="num">{d.number}</span>}
            <OutputPreview output={shows[0] ?? null} />
          </span>
          <span className="stand" />
          <span className="label">
            <b>{d.kind === 'display' ? d.display.label : 'A display'}</b>
            <span>{d.kind === 'display' ? `${d.display.width}×${d.display.height}${d.display.primary ? ' · where you work' : ''}` : 'Not connected now'}</span>
          </span>
          <span className="shows">{d.kind === 'missing' ? <span className="st-tag warn">Not connected</span> : tags}</span>
        </button>
      );
    if (d.kind === 'sdi') {
      const out = shows[0];
      const st = out ? dlStatus?.[out] : undefined;
      return (
        <button key={d.key} className="st-dev sdi" {...common}>
          <span className="st-bezel">
            <OutputPreview output={out ?? null} />
            <span className="bnc">
              <i />
              <i />
              <i />
              <i />
              <em>SDI</em>
            </span>
          </span>
          <span className="label">
            <b>{d.name}</b>
            <span>{out && dlConfig?.[out] ? `SDI · ${decklinkModeLabel(dlConfig[out]!.mode)}` : 'SDI out'}</span>
          </span>
          <span className="shows">{st?.state === 'error' ? <span className="st-tag warn">Not sending</span> : tags}</span>
        </button>
      );
    }
    return (
      <button key={d.key} className="st-dev net" {...common}>
        <span className="st-bezel">
          <OutputPreview output={network.enabled ? 'confidence' : null} />
          <span className="phone">
            <i />
          </span>
        </span>
        <span className="label">
          <b>On the network</b>
          <span>{!network.enabled ? 'Any browser, when switched on' : netStatus?.viewers ? `${netStatus.viewers} device${netStatus.viewers > 1 ? 's' : ''} watching` : 'No device watching yet'}</span>
        </span>
        <span className="shows">{network.enabled ? <span className="st-tag">Any output</span> : <span className="st-tag none">Off</span>}</span>
      </button>
    );
  }

  // ---- The chosen screen ------------------------------------------------------------------

  function inspector(d: Device) {
    const shows = showsOn(d);
    if (d.kind === 'net') return networkInspector();
    const name = d.kind === 'display' ? (d.display.primary ? 'This computer' : d.display.label) : d.kind === 'missing' ? 'A display that isn’t connected' : d.name;
    const meta =
      d.kind === 'display'
        ? `Display ${d.number} · ${d.display.width}×${d.display.height}${d.display.primary ? ' · where you work' : ''}`
        : d.kind === 'missing'
          ? 'Its output comes back on it by itself when it is plugged in again.'
          : 'Blackmagic DeckLink · SDI out';
    const choose = (v: string) => {
      const output = v === NOTHING ? null : (v as ScreenOutput);
      if (d.kind === 'display') void setDisplay(d.display.id, output);
      else if (d.kind === 'missing') void setDisplay(d.id, output);
      else void setPort(d.name, output);
    };
    const out = shows[0];
    const sdi = d.kind === 'sdi' && out ? dlConfig?.[out] : null;
    const st = d.kind === 'sdi' && out ? dlStatus?.[out] : undefined;
    return (
      <div className="st-inspector" data-inspector={d.key}>
        <OutputPreview output={out ?? null} className="rounded-lg" />
        <div style={{ minWidth: 0 }}>
          <h4>{name}</h4>
          <p className="meta">{meta}</p>
          <div className="st-field">
            <span className="lbl">Shows</span>
            <Seg
              label={`What ${name} shows`}
              value={out ?? NOTHING}
              onChange={choose}
              options={[...OUTPUTS.map(({ output }) => ({ id: output as string, label: NAME[output] })), { id: NOTHING, label: 'Nothing' }]}
            />
          </div>
          {d.kind === 'display' && d.display.primary && out && (
            <div className="st-field">
              <Note warn>The {NAME[out].toLowerCase()} covers the screen you work on. Press Esc on it to get back, or choose another screen.</Note>
            </div>
          )}
          {sdi && (
            <div className="st-field" data-decklink-output={out}>
              <span className="lbl">Format</span>
              <Select value={sdi.mode} onValueChange={(m) => void setFormat(out!, m)}>
                <SelectTrigger className="st-select-trigger" aria-label="Video format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DECKLINK_MODES.map((m) => (
                    <SelectItem key={m.key} value={m.key}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button type="button" className="st-btn" disabled={st?.state !== 'sending'} onClick={() => desktop!.decklink?.test(out!)} title="Colour bars on this port for 8 seconds">
                Show test colours
              </button>
              <span className="st-hint w-full">The format your switcher runs at (on an ATEM: Settings → Video standard), or its input stays black.</span>
            </div>
          )}
          {st && (
            <div className="st-field" role="status">
              <span className="lbl">Now</span>
              {st.state === 'sending' ? (
                <span className="inline-flex items-center gap-2 text-[13px]">
                  <span className="st-dot" />
                  Sending · {decklinkModeLabel(st.mode)} · {st.framesPerSecond} pictures a second
                </span>
              ) : st.state === 'error' ? (
                <span className="inline-flex items-center gap-2 text-[13px]" style={{ color: 'var(--s-warn)' }}>
                  <span className="st-dot warn" />
                  {st.message}
                </span>
              ) : null}
            </div>
          )}
          {d.kind === 'display' && desktop!.screens.identify && (
            <div className="st-field">
              <span className="lbl">Find it</span>
              <button type="button" className="st-btn" onClick={() => desktop!.screens.identify?.()}>
                Show its number
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  function networkInspector() {
    const screens = [...OUTPUTS.map((o) => ({ label: NAME[o.output], path: o.path })), { label: 'Lower third, see-through (OBS, vMix)', path: '#/lower-third?transparent=1' }];
    return (
      <div className="st-inspector" data-inspector="net">
        <OutputPreview output={network.enabled ? 'confidence' : null} className="rounded-lg" />
        <div style={{ minWidth: 0 }}>
          <h4>On the network</h4>
          <p className="meta">Any browser on the church network: a smart TV, a tablet on stage, another computer, or OBS and vMix as a browser source.</p>
          <div className="st-field">
            <span className="lbl">Share</span>
            <button type="button" role="switch" aria-checked={network.enabled} aria-label="Share the screens on the network" className="st-switch" onClick={() => void setSharing(!network.enabled)} />
            <span className="text-[13px]" style={{ color: 'var(--s-ink-2)' }}>
              {network.enabled ? (netStatus?.viewers ? `${netStatus.viewers} device${netStatus.viewers > 1 ? 's' : ''} watching` : 'On. No device is watching yet.') : 'Off'}
            </span>
          </div>
          <div className="st-field">
            <span className="lbl">Port</span>
            <input
              className="st-input w-24"
              inputMode="numeric"
              aria-label="Port"
              defaultValue={network.port}
              onBlur={(e) => {
                const port = Number(e.target.value.replace(/\D/g, ''));
                if (port && port !== network.port) void setSharing(network.enabled, port);
              }}
            />
          </div>
          {network.enabled && netStatus?.running && !netStatus.urls.length && (
            <div className="st-field">
              <Note warn>This computer isn’t connected to a network.</Note>
            </div>
          )}
          {base &&
            screens.map((s) => (
              <div key={s.path} className="st-field">
                <span className="lbl">{s.label.split(',')[0]}</span>
                <span className="st-addr flex-1 min-w-[200px]">{`${base}${s.path}`}</span>
                <button type="button" className="st-iconbtn" aria-label={`Copy the ${s.label} address`} title="Copy the address" onClick={() => copy(`${base}${s.path}`)}>
                  <Copy />
                </button>
              </div>
            ))}
          {network.enabled && <p className="st-hint mt-2">If the computer asks whether Voice Verses may accept incoming connections, choose Allow.</p>}
        </div>
      </div>
    );
  }

  // ---- Each output and where it goes ----------------------------------------------------

  function outputs() {
    return (
      <Section title="Each output, and where it goes">
        <p className="st-hint">An output can go to several places at once: the projector on a screen and to a browser, the lower third to the switcher and to OBS.</p>
        <div className="st-outputs">
          {OUTPUTS.map(({ output, label, note }) => {
            const display = config?.[output];
            const shown = display != null ? displays.find((x) => x.id === display) : undefined;
            const sdi = dlConfig?.[output];
            const st = dlStatus?.[output];
            const freeDisplays = displays.filter((x) => config && config[output] !== x.id);
            const freePorts = ports.filter((p) => !OUTPUTS.some(({ output: o }) => dlConfig?.[o]?.device === p.name));
            const none = display == null && !sdi && !network.enabled;
            return (
              <div key={output} className="st-out" data-output={output}>
                <OutputPreview output={output} className="rounded-lg" />
                <h4>
                  {label} <small>{note}</small>
                </h4>
                <div className="st-dests">
                  {display != null && (
                    <div className="st-dest">
                      <Sq tint="indigo" icon={Cable} size="sm" />
                      <span className="text">
                        {shown ? (shown.primary ? 'This computer’s screen' : shown.label) : 'A display'} <em>{shown ? `${shown.width}×${shown.height}` : 'not connected now'}</em>
                      </span>
                      <span className={`st-dot ${shown ? '' : 'warn'}`} title={shown ? 'Showing' : 'Not connected'} />
                    </div>
                  )}
                  {sdi && (
                    <div className="st-dest">
                      <Sq tint="orange" icon={TvMinimal} size="sm" />
                      <span className="text">
                        {sdi.device} <em>SDI · {decklinkModeLabel(sdi.mode)}</em>
                      </span>
                      <span className={`st-dot ${st?.state === 'sending' ? '' : 'warn'}`} title={st?.state === 'sending' ? 'Sending' : 'Not sending'} />
                    </div>
                  )}
                  {network.enabled && (
                    <div className="st-dest">
                      <Sq tint="teal" icon={Wifi} size="sm" />
                      <span className="text">
                        Any browser <em>{base ? base.replace(/^https?:\/\//, '') : 'on the network'}</em>
                      </span>
                      <span className="st-dot" title="Shared" />
                    </div>
                  )}
                  {none && <p className="st-hint">Not on any screen yet.</p>}
                  {SHAPED[output] && (
                    <div className="pt-1">
                      <ScreenShapePicker output={SHAPED[output]!} label="" ariaLabel={`${label} screen shape`} />
                    </div>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="st-btn link self-start">
                        <Plus />
                        {none ? 'Choose where it goes' : 'Send it somewhere else too'}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      {freeDisplays.length > 0 && <DropdownMenuLabel>A screen</DropdownMenuLabel>}
                      {freeDisplays.map((x) => (
                        <DropdownMenuItem key={x.id} onSelect={() => void setDisplay(x.id, output)}>
                          {x.primary ? 'This computer’s screen' : x.label} · {x.width}×{x.height}
                        </DropdownMenuItem>
                      ))}
                      {freePorts.length > 0 && <DropdownMenuLabel>A DeckLink port (SDI)</DropdownMenuLabel>}
                      {freePorts.map((p) => (
                        <DropdownMenuItem key={p.name} onSelect={() => void setPort(p.name, output)}>
                          {p.name}
                        </DropdownMenuItem>
                      ))}
                      {!network.enabled && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => void setSharing(true).then(() => setSelected('net'))}>Any browser on the network</DropdownMenuItem>
                        </>
                      )}
                      {(display != null || sdi) && (
                        <>
                          <DropdownMenuSeparator />
                          {display != null && <DropdownMenuItem onSelect={() => void setDisplay(display, null)}>Take it off its screen</DropdownMenuItem>}
                          {sdi && <DropdownMenuItem onSelect={() => void setPort(sdi.device, null)}>Stop sending to {sdi.device}</DropdownMenuItem>}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    );
  }

  // ---- Ways to connect a screen ---------------------------------------------------------

  function ways() {
    const externals = displays.filter((x) => !x.primary).length;
    const pp = loadProPresenterSettings();
    const dlState = decklink?.available
      ? { cls: 'on', text: `${ports.length} port${ports.length === 1 ? '' : 's'}` }
      : decklink?.reason === 'drivers'
        ? { cls: 'off', text: 'Needs Desktop Video' }
        : { cls: 'off', text: 'Mac app' };
    const tiles = [
      { key: 'cable', icon: Cable, tint: 'indigo' as const, title: 'A display cable', state: { cls: externals ? 'on' : 'off', text: externals ? `${externals} connected` : 'None yet' }, body: 'HDMI, DisplayPort, USB‑C or Thunderbolt, and adapters such as HDMI‑to‑SDI. AirPlay to an Apple TV works too.' },
      { key: 'sdi', icon: TvMinimal, tint: 'orange' as const, title: 'Blackmagic DeckLink', state: dlState, body: decklink?.reason === 'drivers' ? 'SDI straight into the switcher. Install Blackmagic Desktop Video (it comes with the card) and its ports appear above.' : 'SDI straight into the switcher, with no converter. On Mac now, Windows next.' },
      { key: 'net', icon: Wifi, tint: 'teal' as const, title: 'The network', state: { cls: network.enabled ? 'on' : 'off', text: network.enabled ? 'On' : 'Off' }, body: 'Any browser on the church network: a smart TV, a tablet on stage, OBS or vMix.', go: () => setSelected('net') },
      { key: 'pp', icon: Radio, tint: 'orange' as const, title: 'ProPresenter', state: { cls: pp.enabled ? 'on' : 'off', text: pp.enabled ? 'On' : 'Off' }, body: 'Verses go into your ProPresenter looks, on this computer or another one.', go: onGo ? () => onGo('propresenter') : undefined },
      { key: 'ndi', icon: Share2, tint: 'violet' as const, title: 'NDI', state: { cls: 'soon', text: 'Coming next' }, body: 'Each output as an NDI source for vMix, OBS, TriCaster and NDI converters, over a network cable.' },
      { key: 'syphon', icon: Layers, tint: 'slate' as const, title: 'Syphon and Spout', state: { cls: 'soon', text: 'Planned' }, body: 'Share the outputs with other apps on this computer, such as OBS or Resolume.' },
    ];
    return (
      <Section title="Ways to connect a screen">
        <div className="st-ways">
          {tiles.map((t) => (
            <div key={t.key} className="st-way" data-way={t.key}>
              <div className="head">
                <Sq tint={t.tint} icon={t.icon} />
                <b>{t.title}</b>
                <span className={`st-state ${t.state.cls}`}>{t.state.text}</span>
              </div>
              <p>{t.body}</p>
              {t.key === 'net' && base && <span className="st-addr">{base}</span>}
              {t.go && (
                <button type="button" className="st-btn link self-start" onClick={t.go}>
                  {t.key === 'pp' ? 'ProPresenter settings' : 'Show the addresses'}
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>
    );
  }
}
