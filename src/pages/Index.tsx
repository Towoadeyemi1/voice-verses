import { useState } from 'react';
import { ControlPanel } from '@/components/ControlPanel';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

const Index = () => {
  const [showProjection, setShowProjection] = useState(false);

  const handleOpenProjection = () => {
    window.open('/projection', '_blank', 'width=1920,height=1080');
  };

  return (
    <div className="min-h-screen">
      <ControlPanel onOpenProjection={handleOpenProjection} />
    </div>
  );
};

export default Index;
