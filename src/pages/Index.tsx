import { useEffect, useState } from 'react';
import { MonitorPlay, Projector } from 'lucide-react';
import { ControlPanel } from '@/components/ControlPanel';
import { Card } from '@/components/ui/card';
import { AppMode, loadAppMode, saveAppMode } from '@/lib/appMode';
import { loadProPresenterSettings, saveProPresenterSettings } from '@/lib/proPresenter';
import ProPresenterLive from './ProPresenterLive';

/** First start of the desktop app: how does this church show scripture? */
const ChooseMode = () => {
  const choose = (mode: AppMode) => {
    if (mode === 'propresenter') saveProPresenterSettings({ ...loadProPresenterSettings(), enabled: true });
    saveAppMode(mode);
  };
  const option = 'p-6 text-left space-y-3 cursor-pointer hover:border-primary transition-colors';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-3xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to Voice Verses</h1>
          <p className="text-muted-foreground">How does your church put scripture on screen?</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Card role="button" tabIndex={0} className={option} onClick={() => choose('propresenter')}>
            <MonitorPlay className="w-8 h-8 text-primary" />
            <h2 className="text-xl font-semibold">We use ProPresenter</h2>
            <p className="text-sm text-muted-foreground">
              Voice Verses listens to the preacher and sends each verse to ProPresenter, which shows it on your
              projector and stream. Nothing else changes in your setup.
            </p>
          </Card>
          <Card role="button" tabIndex={0} className={option} onClick={() => choose('screens')}>
            <Projector className="w-8 h-8 text-primary" />
            <h2 className="text-xl font-semibold">Voice Verses shows it</h2>
            <p className="text-sm text-muted-foreground">
              Use Voice Verses' own projector, confidence monitor and lower-third screens, and plan services in it.
            </p>
          </Card>
        </div>
        <p className="text-center text-xs text-muted-foreground">You can change this later.</p>
      </div>
    </div>
  );
};

const Index = () => {
  const [mode, setMode] = useState<AppMode | null>(loadAppMode);
  const [showDisplayMonitor, setShowDisplayMonitor] = useState(true);

  useEffect(() => {
    const update = () => setMode(loadAppMode());
    window.addEventListener('app-mode-changed', update);
    return () => window.removeEventListener('app-mode-changed', update);
  }, []);

  if (mode === null) return <ChooseMode />;
  if (mode === 'propresenter') return <ProPresenterLive />;

  return (
    <div className="min-h-screen">
      <ControlPanel
        showDisplayMonitor={showDisplayMonitor}
        onToggleDisplayMonitor={() => setShowDisplayMonitor(!showDisplayMonitor)}
      />
    </div>
  );
};

export default Index;
