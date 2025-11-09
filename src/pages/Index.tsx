import { useState } from 'react';
import { ControlPanel } from '@/components/ControlPanel';

const Index = () => {
  const [showDisplayMonitor, setShowDisplayMonitor] = useState(true);

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
