import { useEffect, useState } from 'react';
import { activeTeam, ColorTeam, TEAM_CHANGED } from '@/lib/colorTeams';

/** The colour team in use, kept current in every window (outputs included). */
export function useColorTeam(): ColorTeam {
  const [team, setTeam] = useState(activeTeam);
  useEffect(() => {
    const reload = () => setTeam(activeTeam());
    window.addEventListener(TEAM_CHANGED, reload);
    window.addEventListener('storage', reload);
    // A team that follows the calendar changes at midnight on the 1st
    const timer = setInterval(reload, 60_000);
    return () => {
      window.removeEventListener(TEAM_CHANGED, reload);
      window.removeEventListener('storage', reload);
      clearInterval(timer);
    };
  }, []);
  return team;
}
