import { useState } from 'react';
import { ControlPanel } from '@/components/ControlPanel';

const Index = () => {
  const [showDisplayMonitor, setShowDisplayMonitor] = useState(false);

  const handleOpenProjection = () => {
    window.open('/projection', '_blank', 'width=1920,height=1080');
  };

  return (
    <div className="min-h-screen">
      <ControlPanel 
        onOpenProjection={handleOpenProjection}
        showDisplayMonitor={showDisplayMonitor}
        onToggleDisplayMonitor={() => setShowDisplayMonitor(!showDisplayMonitor)}
      />
    </div>
  );
};

export default Index;
