import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, Images, MonitorUp, Palette, Radio, Settings } from 'lucide-react';
import { CountdownControl } from '../CountdownControl';
import { AlertControl } from '../AlertControl';
import { showLogo } from '@/lib/showLogo';

const PAGES = [
  { path: '/', label: 'Live', icon: Radio },
  { path: '/service-planner', label: 'Services', icon: CalendarDays, also: ['/service-builder', '/presenter'] },
  { path: '/media-library', label: 'Media', icon: Images },
  { path: '/templates', label: 'Looks', icon: Palette },
  { path: '/display-manager', label: 'Screens', icon: MonitorUp },
  { path: '/settings', label: 'Settings', icon: Settings },
];

/**
 * The frame around every page except the live screen and the output windows:
 * the same quiet top bar (pages as one pill, countdown and logo on the right),
 * then the page's title, what it is for and its main actions, then its content.
 */
export const AppShell = ({
  title,
  subtitle,
  actions,
  children,
  wide = false,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** The page's own buttons, top right; the main one last */
  actions?: ReactNode;
  children: ReactNode;
  /** Use the whole width (editors) instead of a reading width */
  wide?: boolean;
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isOn = (p: (typeof PAGES)[number]) => (p.path === '/' ? pathname === '/' : pathname.startsWith(p.path) || p.also?.some((a) => pathname.startsWith(a)));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 h-16 grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 bg-background/80 backdrop-blur-xl shadow-[0_1px_0_hsl(var(--border))]">
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2.5 w-fit rounded-xl px-1.5 py-1 hover:bg-muted" title="Back to the live screen">
          <img src={`${import.meta.env.BASE_URL}cornerstone-logo.png`} alt="" className="w-8 h-8 object-contain" />
          <span className="text-[15px] font-semibold tracking-[-0.01em] hidden md:inline">Voice Verses</span>
        </button>

        <nav className="flex p-1 rounded-full bg-muted/70" aria-label="Pages">
          {PAGES.map((p) => {
            const Icon = p.icon;
            const on = isOn(p);
            return (
              <button
                key={p.path}
                type="button"
                onClick={() => navigate(p.path)}
                aria-current={on ? 'page' : undefined}
                className={`h-9 px-3.5 rounded-full flex items-center gap-2 text-sm font-semibold transition ${on ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden lg:inline">{p.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-1.5">
          <AlertControl className="h-9 hidden md:flex" />
          <CountdownControl className="h-9 hidden md:flex" />
          <button type="button" onClick={() => showLogo()} className="h-9 px-3 rounded-[10px] text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground" title="Show the church logo on every screen">
            Logo
          </button>
        </div>
      </header>

      <div className={`mx-auto px-6 md:px-10 ${wide ? 'max-w-[1800px]' : 'max-w-[1360px]'}`}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-9 pb-7">
          <div className="min-w-0">
            <h1 className="m-0 text-[32px] leading-tight font-bold tracking-[-0.025em]">{title}</h1>
            {subtitle && <p className="m-0 mt-1.5 text-[15px] text-muted-foreground max-w-[70ch]">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
        <main className="pb-16">{children}</main>
      </div>
    </div>
  );
};

/** A content block on a page: a soft surface with an optional title line. */
export const Section = ({
  title,
  description,
  actions,
  children,
  className = '',
  padded = true,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) => (
  <section className={`rounded-2xl bg-card shadow-[0_0_0_1px_hsl(var(--border))] ${padded ? 'p-5 md:p-6' : ''} ${className}`}>
    {(title || actions) && (
      <div className={`flex flex-wrap items-start justify-between gap-3 ${padded ? 'mb-4' : 'px-5 md:px-6 pt-5 md:pt-6 mb-4'}`}>
        <div className="min-w-0">
          {title && <h2 className="m-0 text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>}
          {description && <p className="m-0 mt-1 text-sm text-muted-foreground max-w-[75ch]">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);
