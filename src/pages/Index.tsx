import { useEffect, useState } from 'react';
import { LiveWorkspace } from '@/components/LiveWorkspace';
import { AppMode, loadAppMode } from '@/lib/appMode';
import ProPresenterLive from './ProPresenterLive';

const Index = () => {
  const [mode, setMode] = useState<AppMode>(loadAppMode);

  useEffect(() => {
    const update = () => setMode(loadAppMode());
    window.addEventListener('app-mode-changed', update);
    return () => window.removeEventListener('app-mode-changed', update);
  }, []);

  if (mode === 'propresenter') return <ProPresenterLive />;

  return <LiveWorkspace />;
};

export default Index;
