import { useMemo, useState } from 'react';
import { Lock, RotateCcw, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { accuracy, canBeHandsFree, Cue, CueLevel, dismissNoticed, HANDS_FREE_AFTER, noticed, removeCue, setCueLevel, setCueTypes, switchCue, teachCue, updateSpirit } from '@/lib/spirit';
import { knownTypes } from '@/lib/serviceTypes';
import type { MomentKind } from '@/speech/momentCues';
import { colorFor } from '@/components/live/ServiceTimeline';
import { SpiritOrb } from '@/components/spirit/SpiritOrb';
import type { Service } from '@/types/service';
import { Hint, Section } from './kit';
import { useSpirit } from './SpiritPage';

const MOMENTS: { id: MomentKind; label: string; color: string }[] = [
  { id: 'prayer', label: 'Prayer', color: '#14b8a6' },
  { id: 'giving', label: 'Giving', color: '#22c55e' },
  { id: 'welcome', label: 'Welcome', color: '#f97316' },
  { id: 'notices', label: 'Notices', color: '#f59e0b' },
  { id: 'worship', label: 'Worship', color: '#8b5cf6' },
  { id: 'word', label: 'The word', color: '#3b82f6' },
  { id: 'response', label: 'Response', color: '#f43f5e' },
  { id: 'communion', label: 'Communion', color: '#f43f5e' },
  { id: 'close', label: 'Close', color: '#6366f1' },
];
const label = (m?: MomentKind) => MOMENTS.find((x) => x.id === m)?.label ?? '';

type Group = { key: string; title: string; color: string; cues: Cue[] };

/** Settings → Cues: teach spirit in one sentence, see what it noticed, and how far each cue is trusted. */
export function CuesPage({ service }: { service?: Service | null }) {
  const spirit = useSpirit();
  const [phrase, setPhrase] = useState('');
  const parts = useMemo(() => [...new Set((service?.sections ?? []).flatMap((s) => s.subsections.map((i) => i.name)))], [service]);
  const [target, setTarget] = useState<string>(parts.find((p) => /offering|giving/i.test(p)) ? `part:${parts.find((p) => /offering|giving/i.test(p))}` : 'moment:prayer');
  const [picking, setPicking] = useState(false);
  /** Which types of service the cue is for: every one, or one */
  const [forType, setForType] = useState('all');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const suggestions = noticed(spirit);

  const targetOf = (t: string) => (t === 'point' ? { point: true } : t.startsWith('part:') ? { part: t.slice(5) } : { moment: t.slice(7) as MomentKind });
  const targetName = (t: string) => (t === 'point' ? 'a sermon point' : t.startsWith('part:') ? t.slice(5) : `any ${label(t.slice(7) as MomentKind)} part`);
  const teach = () => {
    const words = phrase.trim();
    if (words.split(/\s+/).length < 2) {
      toast.error('A cue needs at least two words', { description: 'One word is said too often to mean a moment.' });
      return;
    }
    updateSpirit((s) => {
      const taught = teachCue(s, words, targetOf(target));
      const cue = taught.cues[taught.cues.length - 1];
      return forType === 'all' || !cue ? taught : setCueTypes(taught, cue.id, [forType]);
    });
    toast.success('spirit learned a new cue', {
      description: `When the preacher says “${words}”${forType === 'all' ? '' : ` in a ${forType}`}, ${targetName(target)} will be ready in Next.`,
    });
    setPhrase('');
  };

  const groups: Group[] = [
    ...parts
      .map((p) => ({ key: `part:${p}`, title: p, color: colorFor(p), cues: spirit.cues.filter((c) => c.part === p) }))
      .filter((g) => g.cues.length),
    ...[...new Set(spirit.cues.filter((c) => c.part && !parts.includes(c.part)).map((c) => c.part!))].map((p) => ({ key: `part:${p}`, title: p, color: colorFor(p), cues: spirit.cues.filter((c) => c.part === p) })),
    ...MOMENTS.map((m) => ({ key: `moment:${m.id}`, title: m.label, color: m.color, cues: spirit.cues.filter((c) => c.moment === m.id) })),
    { key: 'point', title: 'Sermon points', color: '#3b82f6', cues: spirit.cues.filter((c) => c.point) },
  ];

  const row = (c: Cue) => {
    const record = [...Array(10 - c.record.length).fill('none'), ...c.record];
    const earned = canBeHandsFree(c);
    const source = c.source === 'builtin' ? 'Built in' : c.source === 'noticed' ? 'Noticed by spirit' : 'Taught by you';
    const detail = [source, c.types?.length ? `only in ${c.types.join(', ')}` : null, c.note ? `corrected: “${c.note}”` : null, c.streak >= 2 ? `right ${c.streak} times in a row` : null].filter(Boolean).join(' · ');
    return (
      <div key={c.id} className={`sp-cue ${c.off ? 'off' : ''}`} data-cue={c.phrase}>
        <span className="p">
          {c.phrase}
          <small>{c.off ? `${source} · switched off` : detail}</small>
        </span>
        <span className="sp-record" title={`Last ${c.record.length}: ${c.record.filter((o) => o === 'right').length} right`} aria-label={`${c.record.filter((o) => o === 'right').length} of the last ${c.record.length} right`}>
          {record.map((o, i) => (
            <i key={i} className={o === 'right' ? '' : o} />
          ))}
        </span>
        {c.off ? (
          <span />
        ) : (
          <div className="sp-trust" role="radiogroup" aria-label={`How far to trust “${c.phrase}”`}>
            {(['learning', 'next'] as CueLevel[]).map((l) => (
              <button key={l} type="button" role="radio" aria-checked={c.level === l} onClick={() => updateSpirit((s) => setCueLevel(s, c.id, l))}>
                {l === 'learning' ? 'Learning' : 'Ready in Next'}
              </button>
            ))}
            <button
              type="button"
              role="radio"
              className="hf"
              aria-checked={c.level === 'handsfree'}
              disabled={!earned}
              title={earned ? 'Goes live by itself when spirit is Hands-free, after a 3-second countdown' : `Unlocks after ${HANDS_FREE_AFTER} right in a row`}
              onClick={() => updateSpirit((s) => setCueLevel(s, c.id, 'handsfree'))}
            >
              {earned ? <Zap /> : <Lock />}
              {earned ? 'Hands-free' : `${c.streak} of ${HANDS_FREE_AFTER}`}
            </button>
          </div>
        )}
        <button
          type="button"
          className="st-iconbtn"
          aria-label={c.off ? `Switch “${c.phrase}” on` : c.source === 'builtin' ? `Switch “${c.phrase}” off` : `Remove “${c.phrase}”`}
          title={c.off ? 'Switch on' : c.source === 'builtin' ? 'Switch off' : 'Remove'}
          onClick={() => updateSpirit((s) => (c.off ? switchCue(s, c.id, true) : removeCue(s, c.id)))}
        >
          {c.off ? <RotateCcw /> : <X />}
        </button>
      </div>
    );
  };

  return (
    <div className="st-page" data-cues-page>
      <div className="sp-teach">
        <div className="sp-sentence" aria-label="Teach spirit a cue">
          <span>When the preacher says</span>
          <input
            id="cue-phrase"
            className="sp-slot"
            placeholder="as the ushers make their way"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && teach()}
            aria-label="What the preacher says"
          />
          <span>get</span>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="st-select-trigger sp-slot w-auto" aria-label="What to get ready">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {parts.length > 0 && (
                <SelectGroup>
                  <SelectLabel>{service?.name ?? 'This service'}</SelectLabel>
                  {parts.map((p) => (
                    <SelectItem key={p} value={`part:${p}`}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              <SelectGroup>
                <SelectLabel>Any service</SelectLabel>
                {MOMENTS.map((m) => (
                  <SelectItem key={m.id} value={`moment:${m.id}`}>
                    any {m.label} part
                  </SelectItem>
                ))}
                <SelectItem value="point">a sermon point</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <span>ready in</span>
          <Select value={forType} onValueChange={setForType}>
            <SelectTrigger className="st-select-trigger sp-slot w-auto" aria-label="For which services" data-cue-type>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="all">every service</SelectItem>
              <SelectGroup>
                <SelectLabel>Only in</SelectLabel>
                {knownTypes(service ? [service] : []).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <span>.</span>
        </div>
        <div className="foot">
          {spirit.heard.length > 0 ? (
            <span>
              Or pick words from{' '}
              <button type="button" className="st-btn link" style={{ display: 'inline', minHeight: 0 }} onClick={() => setPicking((p) => !p)}>
                {picking ? 'hide what was said' : 'what was said lately'}
              </button>
            </span>
          ) : (
            <span>spirit also learns by watching: when you move on yourself, it notes what was said just before.</span>
          )}
          <button type="button" className="st-btn primary" onClick={teach} disabled={!phrase.trim()}>
            Teach spirit
          </button>
        </div>
        {picking && (
          <div className="st-list sp-heard" role="list" aria-label="What was said lately">
            {[...spirit.heard].reverse().slice(0, 200).map((h, i) => (
              <button
                key={i}
                type="button"
                role="listitem"
                onClick={() => {
                  setPhrase(h.text.replace(/[.?!]+$/, ''));
                  setPicking(false);
                  window.setTimeout(() => (document.getElementById('cue-phrase') as HTMLInputElement | null)?.select(), 0);
                }}
              >
                <time>{new Date(h.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
                <span>{h.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <Section title="What spirit noticed" aside="From what you did, and what was said just before">
          <div className="sp-noticed">
            {suggestions.map((n) => (
              <div key={`${n.phrase}|${n.part}`} className="sp-card" data-noticed={n.phrase}>
                <div className="who">
                  <SpiritOrb />
                  Each time you went to {n.part} · {n.times} times
                </div>
                <q>{n.phrase}</q>
                <div className="to">
                  <span className="sp-kind" style={{ background: colorFor(n.part) }} />
                  {n.part}
                </div>
                <div className="acts">
                  <button type="button" className="st-btn primary" onClick={() => updateSpirit((s) => teachCue(s, n.phrase, { part: n.part }, 'noticed'))}>
                    Make it a cue
                  </button>
                  <button type="button" className="st-btn ghost" onClick={() => updateSpirit((s) => dismissNoticed(s, n.phrase, n.part))}>
                    Not a cue
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {groups.map((g) => {
        const own = g.cues.filter((c) => c.source !== 'builtin' || c.record.length || c.off || c.level !== 'next');
        const rest = g.cues.filter((c) => !own.includes(c));
        const a = accuracy(g.cues);
        if (!g.cues.length) return null;
        return (
          <Section
            key={g.key}
            title={
              <span className="sp-parthead">
                <span className="sp-kind" style={{ background: g.color }} />
                {g.title}
              </span>
            }
            aside={a.total ? `Right ${a.right} of the last ${a.total}` : g.key === 'point' ? 'The words after the cue become the point' : undefined}
          >
            <div className="st-list">
              {own.map(row)}
              {open[g.key] && rest.map(row)}
              {rest.length > 0 && (
                <button type="button" className="st-btn ghost w-full justify-start" style={{ borderRadius: 0, minHeight: 44, paddingLeft: 16 }} onClick={() => setOpen((o) => ({ ...o, [g.key]: !o[g.key] }))}>
                  {open[g.key] ? 'Hide the built-in phrases' : `${rest.length} built-in phrase${rest.length > 1 ? 's' : ''}: ${rest.slice(0, 3).map((c) => `“${c.phrase}”`).join(', ')}${rest.length > 3 ? '…' : ''}`}
                </button>
              )}
            </div>
          </Section>
        );
      })}
      <Hint>
        Hands-free unlocks for a cue after it has been right {HANDS_FREE_AFTER} times in a row; then you choose. A correction sends it back to Ready in Next. Cues for a part go by its name, so
        “Duplicate for next Sunday” keeps them working.
      </Hint>
    </div>
  );
}
