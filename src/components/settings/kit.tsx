import { ReactNode } from 'react';
import { AlertCircle, Check, type LucideIcon } from 'lucide-react';
import './settings.css';

/**
 * The parts every Settings page is built from (docs/design/settings-redesign.html):
 * coloured icon squares, sections of grouped rows on one soft surface, switches,
 * segmented choices and status marks. Styles are in settings.css, under `.vvs`.
 */

export type Tint = 'gold' | 'blue' | 'violet' | 'teal' | 'indigo' | 'orange' | 'rose' | 'slate' | 'pink' | 'spirit';

export const Sq = ({ tint, icon: Icon, size }: { tint: Tint; icon: LucideIcon; size?: 'sm' | 'lg' }) => (
  <span className={`st-sq ${size ?? ''}`} style={{ background: `var(--i-${tint})` }} aria-hidden="true">
    <Icon strokeWidth={2.2} />
  </span>
);

export const Section = ({ title, aside, action, children, ...rest }: { title?: ReactNode; aside?: ReactNode; action?: ReactNode; children: ReactNode } & Record<`data-${string}`, unknown>) => (
  <section className="st-section" {...rest}>
    {(title || aside || action) && (
      <header>
        <h3>{title}</h3>
        {aside && <span className="st-aside">{aside}</span>}
        {action}
      </header>
    )}
    {children}
  </section>
);

export const List = ({ plain, children, label }: { plain?: boolean; children: ReactNode; label?: string }) => (
  <div className={`st-list ${plain ? 'plain' : ''}`} role={label ? 'group' : undefined} aria-label={label}>
    {children}
  </div>
);

export const Row = ({
  lead,
  title,
  desc,
  children,
  dim,
  attention,
  onClick,
  ...rest
}: {
  lead?: ReactNode;
  title: ReactNode;
  desc?: ReactNode;
  children?: ReactNode;
  dim?: boolean;
  attention?: boolean;
  onClick?: () => void;
} & Record<`data-${string}`, unknown>) => (
  <div
    className={`st-row ${dim ? 'dim' : ''} ${attention ? 'attention' : ''} ${onClick ? 'clickable' : ''}`}
    onClick={onClick}
    onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), onClick()) : undefined}
    tabIndex={onClick ? 0 : undefined}
    role={onClick ? 'button' : undefined}
    {...rest}
  >
    {lead}
    <span className="text">
      <span className="t">{title}</span>
      {desc && <span className="d">{desc}</span>}
    </span>
    {children}
  </div>
);

export const Toggle = ({ checked, onChange, label, disabled, id }: { checked: boolean; onChange: (on: boolean) => void; label: string; disabled?: boolean; id?: string }) => (
  <button
    type="button"
    role="switch"
    id={id}
    className="st-switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      onChange(!checked);
    }}
  />
);

export function Seg<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T | null; onChange: (id: T) => void; label: string }) {
  return (
    <div className="st-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Hint = ({ children }: { children: ReactNode }) => <p className="st-hint">{children}</p>;

export const Note = ({ icon: Icon = AlertCircle, warn, children }: { icon?: LucideIcon; warn?: boolean; children: ReactNode }) => (
  <div className={`st-note ${warn ? 'warn' : ''}`}>
    <Icon aria-hidden="true" />
    <span>{children}</span>
  </div>
);

/** A round mark: a grey tick when fine, amber when it needs looking at (never red or green: those mean On Air and Next). */
export const Mark = ({ state }: { state: 'ok' | 'warn' | 'problem' }) => (
  <span className={`st-st ${state}`} aria-hidden="true">
    {state === 'ok' ? <Check strokeWidth={2.8} /> : <AlertCircle strokeWidth={2.4} />}
  </span>
);

/** A ring filled to `done / total` in the team colour. */
export const Ring = ({ done, total, big, children }: { done: number; total: number; big?: boolean; children: ReactNode }) => {
  const share = total ? Math.round((done / total) * 100) : 100;
  return (
    <span className={big ? 'st-big-ring' : 'st-ring'} style={{ background: `conic-gradient(var(--s-accent) 0 ${share}%, var(--s-fill-2) ${share}% 100%)` }}>
      {children}
    </span>
  );
};
