import { ExternalLink } from 'lucide-react';
import { DisplayMonitor } from '@/components/DisplayMonitor';
import { Button } from '@/components/ui/button';
import { appUrl } from '@/lib/appUrl';
import { isDesktop } from '@/lib/desktop';
import { NetworkOutputSettings } from '@/components/NetworkOutputSettings';
import { ScreenSettings } from '@/components/ScreenSettings';
import { AppShell, Section } from '@/components/shell/AppShell';

const OUTPUTS = [
  { route: '/projection', label: 'Projector', size: 'width=1280,height=720' },
  { route: '/confidence', label: 'Stage monitor', size: 'width=1280,height=720' },
  { route: '/lower-third', label: 'Lower third', size: 'width=1280,height=720' },
];

/** The screens: what each shows now, where each goes, and screens on the network. */
const DisplayManager = () => (
  <AppShell
    title="Screens"
    subtitle={
      isDesktop
        ? 'What each screen shows right now, and where it goes. Voice Verses opens each output on its display by itself.'
        : 'What each screen shows right now. Open each output in its own window and drag it to its screen; the desktop app does this for you.'
    }
    actions={
      !isDesktop &&
      OUTPUTS.map(({ route, label, size }) => (
        <Button key={route} variant="outline" onClick={() => window.open(appUrl(route), '_blank', size)}>
          <ExternalLink className="w-4 h-4" />
          {label}
        </Button>
      ))
    }
  >
    <div className="space-y-6">
      <Section title="Right now">
        <DisplayMonitor />
      </Section>

      {isDesktop && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <ScreenSettings />
          <NetworkOutputSettings />
        </div>
      )}

      <Section title="Setting up" description="The usual ways churches connect Voice Verses to their screens.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-muted/40 p-4">
            <p className="m-0 font-semibold">Projector or TV</p>
            <p className="m-0 mt-1 text-muted-foreground">Connect it like a second monitor (HDMI), then choose it for the Projector above.</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-4">
            <p className="m-0 font-semibold">SDI to a switcher</p>
            <p className="m-0 mt-1 text-muted-foreground">An HDMI-to-SDI converter on a spare video output shows up as a display: choose it, and route its SDI to a free switcher input.</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-4">
            <p className="m-0 font-semibold">Livestream</p>
            <p className="m-0 mt-1 text-muted-foreground">Capture the Lower third in OBS or vMix and key out the green, or add its network address as a browser source with a see-through background.</p>
          </div>
        </div>
      </Section>
    </div>
  </AppShell>
);

export default DisplayManager;
