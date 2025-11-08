import { ControlPanel } from '@/components/ControlPanel';
import { DisplayMonitor } from '@/components/DisplayMonitor';
import { Card } from '@/components/ui/card';
import { Monitor } from 'lucide-react';

const Index = () => {
  const handleOpenProjection = () => {
    window.open('/projection', '_blank', 'width=1920,height=1080');
  };

  return (
    <div className="min-h-screen">
      <ControlPanel onOpenProjection={handleOpenProjection} />
      
      {/* Display Monitor Section */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Display Monitor</h2>
            <span className="text-xs text-muted-foreground ml-auto">Live Preview</span>
          </div>
          <DisplayMonitor />
        </Card>
      </div>
    </div>
  );
};

export default Index;
