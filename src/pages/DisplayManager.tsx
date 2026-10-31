import { DisplayMonitor } from '@/components/DisplayMonitor';
import { Card } from '@/components/ui/card';
import { Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appUrl } from '@/lib/appUrl';
import { isDesktop } from '@/lib/desktop';
import { NetworkOutputSettings } from '@/components/NetworkOutputSettings';

const OUTPUTS = [
  { route: '/projection', label: 'Projection', size: 'width=1280,height=720' },
  { route: '/confidence', label: 'Confidence monitor', size: 'width=1280,height=720' },
  { route: '/lower-third', label: 'Lower third', size: 'width=1280,height=720' },
];

const DisplayManager = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Display Manager</h1>
          <p className="text-muted-foreground">Monitor all outputs from one interface</p>
        </div>

        {/* Display Grid */}
        <DisplayMonitor />

        {/* Instructions */}
        <Card className="p-6 bg-muted/50">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Setting up the screens
          </h3>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>
              Open the output windows: <strong>Open Windows</strong> in the Presenter, or the buttons below.
            </li>
            <li>
              Drag each window to its screen (projector, stage monitor) and <strong>double-click</strong> it to fill the
              screen. Double-click again to make it a window again.
            </li>
            {isDesktop ? (
              <li>
                The desktop app remembers where each window goes. With a projector connected, the projection opens on
                it, full screen, by itself.
              </li>
            ) : (
              <li>The desktop app remembers where each window goes; in a browser, place them again each time.</li>
            )}
            <li>
              For a livestream, capture the <strong>Lower third</strong> window in OBS or vMix (window capture) and key
              out the green, or use a screen on the network (below) as a browser source with a see-through background.
              Using ProPresenter too? Settings → ProPresenter sends the verses there as well.
            </li>
          </ol>
          <div className="flex flex-wrap gap-2 mt-4 mb-2">
            {OUTPUTS.map(({ route, label, size }) => (
              <Button key={route} variant="outline" size="sm" onClick={() => window.open(appUrl(route), '_blank', size)}>
                {label}
              </Button>
            ))}
          </div>
        </Card>

        {isDesktop && <NetworkOutputSettings />}
      </div>
    </div>
  );
};

export default DisplayManager;
