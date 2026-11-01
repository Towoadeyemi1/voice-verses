import { useEffect, useState } from 'react';
import { Check, Palette, Pencil, Plus, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  activeTeam, BUILT_IN_TEAMS, ColorTeam, loadTeams, saveTeams, setActiveTeam, setTeamsFollowMonths, TEAM_CHANGED, TEAM_COLORS, teamsFollowMonths,
} from '@/lib/colorTeams';
import { applyLookTheme, deleteLookTheme, loadLookThemes, LookTheme, saveCurrentAsTheme, THEMES_CHANGED } from '@/lib/lookThemes';
import { loadTemplates, saveTemplates } from '@/lib/templates';
import { addStarterLook, looksForTheme, STARTER_TEAMS, STARTER_THEMES, StarterTheme } from '@/lib/starters';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Dots = ({ team }: { team: ColorTeam }) => (
  <span className="flex -space-x-1">
    {TEAM_COLORS.map(({ key }) => (
      <span key={key} className="w-4 h-4 rounded-full ring-2 ring-card" style={{ background: team.colors[key] }} />
    ))}
  </span>
);

/**
 * Colour teams (the church's colours for a season or month; every look that
 * uses team colours follows them) and themes (a whole set of looks with a
 * colour team, switched in one click).
 */
export const TeamsAndThemes = () => {
  const [teams, setTeams] = useState(loadTeams);
  const [active, setActive] = useState(() => activeTeam().id);
  const [byMonth, setByMonth] = useState(teamsFollowMonths);
  const [editing, setEditing] = useState<ColorTeam | null>(null);
  const [themes, setThemes] = useState<LookTheme[]>(loadLookThemes);
  const [themeName, setThemeName] = useState('');

  useEffect(() => {
    const reload = () => {
      setTeams(loadTeams());
      setActive(activeTeam().id);
      setByMonth(teamsFollowMonths());
      setThemes(loadLookThemes());
    };
    window.addEventListener(TEAM_CHANGED, reload);
    window.addEventListener(THEMES_CHANGED, reload);
    return () => {
      window.removeEventListener(TEAM_CHANGED, reload);
      window.removeEventListener(THEMES_CHANGED, reload);
    };
  }, []);

  const saveTeam = (team: ColorTeam) => {
    const next = teams.some((t) => t.id === team.id) ? teams.map((t) => (t.id === team.id ? team : t)) : [...teams, team];
    saveTeams(next);
    setEditing(null);
  };

  const moreTeams = STARTER_TEAMS.filter((t) => !teams.some((o) => o.id === t.id));

  /** A ready-made theme: its looks and colour team are added if missing, then it is used. */
  const applyStarterTheme = (t: StarterTheme) => {
    saveTemplates(looksForTheme(t).reduce(addStarterLook, loadTemplates()));
    const team = [...BUILT_IN_TEAMS, ...STARTER_TEAMS].find((x) => x.id === t.teamId);
    if (team && !teams.some((x) => x.id === team.id)) saveTeams([...teams, team]);
    applyLookTheme({ id: t.id, name: t.name, assignments: t.assignments, teamId: t.teamId });
    toast.success(`Theme “${t.name}” in use`, { description: 'Its looks are in your list to change as you like.' });
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Palette className="w-4 h-4 text-primary" />
        <h2 className="font-semibold">Colour team</h2>
        <span className="text-xs text-muted-foreground">Looks that use team colours (the coloured chips in the colour pickers) follow the team, and so does the app.</span>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <Switch checked={byMonth} onCheckedChange={setTeamsFollowMonths} />
          Change with the month
        </label>
      </div>
      <div className="flex gap-2 flex-wrap">
        {teams.map((team) => (
          <div key={team.id} className={`flex items-center gap-2 rounded-xl border pl-2.5 pr-1 py-1.5 ${team.id === active ? 'border-primary bg-primary/10' : 'border-border'}`}>
            <button type="button" className="flex items-center gap-2" onClick={() => setActiveTeam(team.id)} title="Use this colour team">
              <Dots team={team} />
              <span className="text-sm font-medium">{team.name}</span>
              {team.months?.length ? <span className="text-[10px] text-muted-foreground">{team.months.map((m) => MONTHS[m]).join(', ')}</span> : null}
              {team.id === active && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Edit" onClick={() => setEditing(structuredClone(team))}>
              <Pencil className="w-3 h-3" />
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setEditing({ ...structuredClone(activeTeam()), id: `team-${Date.now().toString(36)}`, name: 'New colour team', months: [] })}
        >
          <Plus className="w-4 h-4" />New team
        </Button>
      </div>

      {moreTeams.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">More colour teams:</span>
          {moreTeams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => { saveTeams([...teams, team]); toast.success(`“${team.name}” added to your colour teams`); }}
              className="flex items-center gap-2 rounded-xl bg-muted/60 hover:bg-muted pl-2.5 pr-3 py-1.5 text-sm"
              title="Add this colour team"
            >
              <Dots team={team} />
              {team.name}
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      {editing && (
        <div className="rounded-xl border border-border p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="team-name" className="w-16 text-xs">Name</Label>
            <Input id="team-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-8 max-w-xs" />
          </div>
          <div className="flex gap-4 flex-wrap">
            {TEAM_COLORS.map(({ key, label }) => (
              <label key={key} className="flex flex-col items-center gap-1 text-xs cursor-pointer">
                <span className="relative w-10 h-10 rounded-full border border-border" style={{ background: editing.colors[key] }}>
                  <input type="color" value={editing.colors[key]} onChange={(e) => setEditing({ ...editing, colors: { ...editing.colors, [key]: e.target.value } })} className="absolute inset-0 opacity-0 cursor-pointer" />
                </span>
                {label}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Months:</span>
            {MONTHS.map((m, i) => {
              const on = editing.months?.includes(i);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setEditing({ ...editing, months: on ? editing.months!.filter((x) => x !== i) : [...(editing.months ?? []), i] })}
                  className={`h-7 px-2 rounded-md text-xs border ${on ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
                >
                  {m}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => saveTeam(editing)}>Save team</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            {!BUILT_IN_TEAMS.some((b) => b.id === editing.id) && teams.some((t) => t.id === editing.id) && (
              <Button size="sm" variant="ghost" className="text-destructive ml-auto gap-1" onClick={() => { saveTeams(teams.filter((t) => t.id !== editing.id)); setEditing(null); }}>
                <Trash2 className="w-3.5 h-3.5" />Delete
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Wand2 className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Themes</h2>
          <span className="text-xs text-muted-foreground">A whole set of looks for every screen, with a colour team, switched in one click.</span>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {themes.map((theme) => (
            <div key={theme.id} className="flex items-center gap-1 rounded-xl border border-border pl-3 pr-1 py-1">
              <span className="text-sm font-medium">{theme.name}</span>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { applyLookTheme(theme); toast.success(`Theme “${theme.name}” in use`); }}>Use</Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Delete" onClick={() => deleteLookTheme(theme.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 pt-1">
          {STARTER_THEMES.map((t) => {
            const team = [...teams, ...BUILT_IN_TEAMS, ...STARTER_TEAMS].find((x) => x.id === t.teamId);
            return (
              <div key={t.id} className="rounded-xl bg-muted/50 p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  {team && <Dots team={team} />}
                  <span className="text-sm font-semibold">{t.name}</span>
                </div>
                <p className="m-0 text-xs text-muted-foreground leading-snug flex-1">{t.description}</p>
                <Button size="sm" variant="outline" className="h-8" aria-label={`Use the ${t.name} theme`} onClick={() => applyStarterTheme(t)}>Use this theme</Button>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex items-center gap-1.5">
            <Input value={themeName} onChange={(e) => setThemeName(e.target.value)} placeholder="e.g. Easter" className="h-8 w-40" />
            <Button
              size="sm"
              variant="outline"
              disabled={!themeName.trim()}
              onClick={() => {
                saveCurrentAsTheme(themeName.trim());
                setThemeName('');
                toast.success('Saved: the looks in use now, with the colour team');
              }}
            >
              Save current looks as a theme
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
