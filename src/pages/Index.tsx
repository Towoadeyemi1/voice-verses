import { useEffect, useState } from 'react';
import { ControlPanel } from '@/components/ControlPanel';
import { AppMode, loadAppMode } from '@/lib/appMode';
import ProPresenterLive from './ProPresenterLive';

const Index = () => {
  const [mode, setMode] = useState<AppMode>(loadAppMode);
  const [showDisplayMonitor, setShowDisplayMonitor] = useState(true);

  useEffect(() => {
    const update = () => setMode(loadAppMode());
    window.addEventListener('app-mode-changed', update);
    return () => window.removeEventListener('app-mode-changed', update);
  }, []);

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
