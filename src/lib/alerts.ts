/**
 * Alerts: a short message put over whatever is on screen, without changing
 * it. For the room ("Parent of child 42, please come to the nursery"), the
 * stream, or only the stage monitor, for the preacher ("Five minutes").
 * Every screen shows it until it is cleared, or until it hides itself.
 */
import { syncService } from '@/lib/syncService';

export interface ScreenAlert {
  id: string;
  text: string;
  /** Which screens show it */
  projector: boolean;
  stream: boolean;
  stage: boolean;
  /** Where on the projector and stream */
  position: 'bottom' | 'top';
  /** Amber, to stand out (a car blocking the gate) */
  urgent?: boolean;
  /** When it hides itself (ms since 1970); none: until cleared */
  until?: number;
  /** Blinks to catch the eye */
  flash?: boolean;
}

export interface AlertPreset {
  id: string;
  label: string;
  /** "{number}" or "{plate}" is filled in by the operator */
  text: string;
  field?: { key: 'number' | 'plate'; label: string; placeholder: string };
  screens: Pick<ScreenAlert, 'projector' | 'stream' | 'stage'>;
  urgent?: boolean;
}

const ROOM = { projector: true, stream: false, stage: false };
const STAGE = { projector: false, stream: false, stage: true };

export const ALERT_PRESETS: AlertPreset[] = [
  { id: 'nursery', label: 'Nursery', text: 'Parent of child {number}, please come to the nursery', field: { key: 'number', label: 'Child number', placeholder: '42' }, screens: ROOM },
  { id: 'kids', label: "Children's church", text: 'Parent of child {number}, please come to children’s church', field: { key: 'number', label: 'Child number', placeholder: '17' }, screens: ROOM },
  { id: 'lights', label: 'Car lights on', text: 'Car {plate}: your lights are on', field: { key: 'plate', label: 'Number plate', placeholder: 'AB12 CDE' }, screens: ROOM },
  { id: 'move', label: 'Move a car', text: 'Car {plate}: please move your car', field: { key: 'plate', label: 'Number plate', placeholder: 'AB12 CDE' }, screens: ROOM, urgent: true },
  { id: 'seats', label: 'Seats at the front', text: 'There are seats at the front. Please come forward', screens: ROOM },
  { id: 'five', label: 'Five minutes', text: 'Five minutes', screens: STAGE },
  { id: 'wrap', label: 'Please wrap up', text: 'Please wrap up', screens: STAGE, urgent: true },
  { id: 'louder', label: 'Speak up', text: 'A little louder, please', screens: STAGE },
  { id: 'mic', label: 'Microphone', text: 'Your microphone is off', screens: STAGE, urgent: true },
];

/** The preset's words with its blank filled in. */
export const fillAlert = (preset: AlertPreset, value: string) => (preset.field ? preset.text.replace(`{${preset.field.key}}`, value.trim() || '…') : preset.text);

export type AlertScreen = 'projector' | 'stream' | 'stage';
export const alertOn = (a: ScreenAlert, screen: AlertScreen) => a[screen] && (!a.until || Date.now() < a.until);

const publish = (alerts: ScreenAlert[]) => syncService.broadcast({ type: 'ALERT', data: { alerts, alert: alerts[0] ?? null } });

/**
 * Puts an alert on the screens it names. Alerts already up keep their other
 * screens, so the room and the stage can each show their own.
 */
export function showAlert(alert: Omit<ScreenAlert, 'id'>): ScreenAlert {
  const shown = { ...alert, id: `alert-${Date.now()}` };
  const others = syncService
    .currentAlerts()
    .filter((a) => !a.until || Date.now() < a.until)
    .map((a) => ({ ...a, projector: a.projector && !shown.projector, stream: a.stream && !shown.stream, stage: a.stage && !shown.stage }))
    .filter((a) => a.projector || a.stream || a.stage);
  publish([shown, ...others]);
  return shown;
}

/** Takes one alert off the screens, or all of them. */
export function clearAlert(id?: string): void {
  publish(id ? syncService.currentAlerts().filter((a) => a.id !== id) : []);
}
