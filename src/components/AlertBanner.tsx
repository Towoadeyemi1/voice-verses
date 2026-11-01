import { useAlert } from '@/hooks/use-alert';
import { useColorTeam } from '@/hooks/use-color-team';
import { useStageSize } from './ScaledStage';
import type { ScreenAlert } from '@/lib/alerts';

/**
 * The alert over whatever is on the projector or the stream: a clear bar at
 * the bottom (or top) with the team's colour along its edge, amber when
 * urgent. Draws on the stage canvas, so previews show exactly the same.
 */
export const AlertBanner = ({ output, alert: given }: { output: 'projection' | 'stream'; alert?: ScreenAlert | null }) => {
  const current = useAlert();
  const alert = given === undefined ? current : given;
  const team = useColorTeam();
  const { width, height } = useStageSize();
  if (!alert || !(output === 'projection' ? alert.projector : alert.stream)) return null;
  const accent = alert.urgent ? '#f59e0b' : team.colors.primary;
  const inset = Math.round(width * 0.04);
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ width, height }} data-alert={alert.text}>
      <div
        key={alert.id}
        className="absolute flex items-center gap-6"
        style={{
          left: inset,
          right: inset,
          [alert.position === 'top' ? 'top' : 'bottom']: Math.round(height * 0.05),
          padding: '26px 40px',
          borderRadius: 22,
          background: alert.urgent ? 'rgba(60, 36, 4, 0.94)' : 'rgba(12, 12, 16, 0.9)',
          boxShadow: `inset 10px 0 0 ${accent}, 0 18px 50px rgba(0,0,0,0.5)`,
          animation: 'vv-in-lift 0.5s cubic-bezier(0.4, 0, 0.2, 1) both',
        }}
      >
        <span style={{ width: 22, height: 22, borderRadius: 999, background: accent, flexShrink: 0, boxShadow: `0 0 24px ${accent}` }} />
        <span style={{ fontFamily: "'Figtree Variable', 'Avenir Next', 'Segoe UI', sans-serif", fontSize: 54, fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>{alert.text}</span>
      </div>
    </div>
  );
};
