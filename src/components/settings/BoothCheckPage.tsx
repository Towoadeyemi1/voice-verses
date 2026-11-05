import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, Mic, MonitorUp, RefreshCw, X } from 'lucide-react';
import { BoothCheckItem, needsAttention, runBoothCheck } from '@/lib/boothCheck';
import type { BoothFix } from '@/components/live/BoothCheck';
import { List, Mark, Ring, Row, Section } from './kit';

const GROUPS: { title: string; ids: (id: string) => boolean }[] = [
  { title: 'Sound', ids: (id) => id.startsWith('mic') || id === 'speech' },
  { title: 'Screens', ids: (id) => id.startsWith('screen') || id.startsWith('sdi-') || id.startsWith('ndi-') },
  { title: 'Connections and today', ids: (id) => ['propresenter', 'bible', 'service'].includes(id) },
];

/** Settings → Booth check: everything the service needs, each with a Fix button. */
export function BoothCheckPage({ service, serviceIsToday, onFix }: { service?: { name: string } | null; serviceIsToday?: boolean; onFix: (fix: BoothFix) => void }) {
  const [items, setItems] = useState<BoothCheckItem[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [at, setAt] = useState<Date | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      setItems(await runBoothCheck({ service, serviceIsToday }));
      setAt(new Date());
    } finally {
      setChecking(false);
    }
  }, [service, serviceIsToday]);
  useEffect(() => {
    void check();
  }, [check]);

  const todo = items ? needsAttention(items) : [];
  const ready = items ? items.length - todo.length : 0;

  return (
    <div className="st-page" data-booth-page>
      <div className="st-hero plain">
        <Ring big done={ready} total={items?.length ?? 1}>
          <b>{items ? `${ready}/${items.length}` : '…'}</b>
        </Ring>
        <div style={{ minWidth: 0 }}>
          <h4>{!items ? 'Checking…' : todo.length ? `${todo.length} ${todo.length === 1 ? 'thing' : 'things'} to check before the service` : 'Ready for the service'}</h4>
          <p className="sub">
            {at ? `Checked at ${at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.` : ''}{' '}
            {todo.length ? `The other ${ready} ${ready === 1 ? 'is' : 'are'} ready.` : 'Checked again every minute while the live screen is open.'}
          </p>
        </div>
        <button type="button" className="st-btn" onClick={() => void check()} disabled={checking}>
          <RefreshCw className={checking ? 'animate-spin' : ''} />
          Check again
        </button>
      </div>

      {GROUPS.map((g) => {
        const list = (items ?? []).filter((i) => g.ids(i.id));
        if (!list.length) return null;
        return (
          <Section key={g.title} title={g.title}>
            <List>
              {list.map((item) => (
                <Row key={item.id} lead={<Mark state={item.state} />} title={item.label} desc={item.detail} attention={item.state !== 'ok'} data-check={item.id} data-state={item.state}>
                  {item.fix && item.state !== 'ok' && (
                    <button type="button" className="st-btn soft" onClick={() => onFix(item.fix!)}>
                      {item.fix.label}
                    </button>
                  )}
                </Row>
              ))}
            </List>
          </Section>
        );
      })}

      <Section title="How it shows on the live screen">
        <div className="grid gap-3.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <div className="st-mini">
            <span className="st-cap">Top bar</span>
            <span className="self-start inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13.5px] font-bold" style={{ background: 'var(--s-warn-soft)', color: 'var(--s-warn)' }}>
              <AlertCircle className="w-4 h-4" />2 to check
            </span>
            <span className="self-start inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13.5px] font-bold" style={{ background: 'var(--s-fill-2)', color: 'var(--s-ink-2)' }}>
              <Check className="w-4 h-4" />
              Ready
            </span>
          </div>
          <div className="st-mini">
            <span className="st-cap">During the service (Settings → Features → Warnings)</span>
            {[
              { icon: MonitorUp, label: 'Projector', text: 'its display was unplugged. Plug it back in, or choose another screen.', fix: 'Screens' },
              { icon: Mic, label: 'Microphone', text: 'no sound for 20 seconds. Check the desk channel.', fix: 'Listening' },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-3 pl-3.5 pr-2 py-2 rounded-[14px]" style={{ background: 'var(--s-raised)', boxShadow: 'var(--s-lift), inset 0 0 0 1px rgba(245,165,36,.45)' }}>
                <span className="st-st warn">
                  <b.icon />
                </span>
                <span className="flex-1 min-w-0 text-[13.5px]">
                  <b>{b.label}:</b> {b.text}
                </span>
                <span className="st-btn soft" aria-hidden="true">
                  {b.fix}
                </span>
                <span className="st-iconbtn" aria-hidden="true">
                  <X />
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
