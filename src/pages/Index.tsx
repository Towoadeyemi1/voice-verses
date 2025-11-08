import { useState } from 'react';
import { ControlPanel } from '@/components/ControlPanel';
import { DisplayMonitor } from '@/components/DisplayMonitor';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Monitor, ExternalLink } from 'lucide-react';

const Index = () => {
  const [showDisplayMonitor, setShowDisplayMonitor] = useState(false);

  const handleOpenProjection = () => {
    window.open('/projection', '_blank', 'width=1920,height=1080');
  };

  const handleOpenDisplayManagerWindow = () => {
    window.open('/display-manager', '_blank', 'width=1400,height=900');
  };

  return (
    <div className="min-h-screen">
      <ControlPanel 
        onOpenProjection={handleOpenProjection}
        showDisplayMonitor={showDisplayMonitor}
        onToggleDisplayMonitor={() => setShowDisplayMonitor(!showDisplayMonitor)}
      />
      
      {/* Display Monitor Section */}
      {showDisplayMonitor && (
        <div className="max-w-7xl mx-auto px-6 pb-6 animate-fade-in">
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Display Monitor</h2>
              <span className="text-xs text-muted-foreground ml-auto">Live Preview</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleOpenDisplayManagerWindow}
                className="ml-2"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Open in Window
              </Button>
            </div>
            <DisplayMonitor />
          </Card>
        </div>
      )}
    </div>
  );
};

export default Index;
