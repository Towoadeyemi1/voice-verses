import { DisplayMonitor } from '@/components/DisplayMonitor';
import { Card } from '@/components/ui/card';
import { Monitor } from 'lucide-react';

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
            Setup Instructions
          </h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li><strong>Step 1:</strong> Open three separate browser windows</li>
            <li><strong>Step 2:</strong> Navigate to: <code className="bg-background px-2 py-1 rounded">/projection</code>, <code className="bg-background px-2 py-1 rounded">/lower-third</code>, <code className="bg-background px-2 py-1 rounded">/confidence</code></li>
            <li><strong>Step 3:</strong> Drag each window to its assigned DeckLink display (SDI output)</li>
            <li><strong>Step 4:</strong> Press F11 (or Cmd+Ctrl+F) to make each window fullscreen</li>
            <li><strong>Step 5:</strong> Use this Display Manager on your main screen to monitor all outputs</li>
          </ol>
        </Card>
      </div>
    </div>
  );
};

export default DisplayManager;
