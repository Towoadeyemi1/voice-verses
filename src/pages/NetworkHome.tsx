import { MonitorPlay, Monitor, TvMinimalPlay } from 'lucide-react';

const OUTPUTS = [
  { route: '#/projection', label: 'Projector', description: 'The main screen', icon: MonitorPlay },
  { route: '#/confidence', label: 'Confidence monitor', description: 'For the preacher or stage', icon: Monitor },
  { route: '#/lower-third', label: 'Lower third (green)', description: 'For keying over the camera', icon: TvMinimalPlay },
  { route: '#/lower-third?transparent=1', label: 'Lower third (see-through)', description: 'For OBS or vMix browser sources', icon: TvMinimalPlay },
];

/** What a network viewer sees at the address's start: which screen to show here. */
const NetworkHome = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-6">
    <div className="max-w-xl w-full space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Voice Verses</h1>
        <p className="text-muted-foreground">Which screen should this device show?</p>
      </div>
      <div className="grid gap-3">
        {OUTPUTS.map(({ route, label, description, icon: Icon }) => (
          <a key={route} href={route} className="flex items-center gap-4 rounded-lg border p-4 hover:border-primary transition-colors">
            <Icon className="w-6 h-6 text-primary" />
            <div>
              <div className="font-semibold">{label}</div>
              <div className="text-sm text-muted-foreground">{description}</div>
            </div>
          </a>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">Double-click the screen to fill it. It follows the operator's computer automatically.</p>
    </div>
  </div>
);

export default NetworkHome;
