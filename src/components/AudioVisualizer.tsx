import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic } from 'lucide-react';

interface AudioVisualizerProps {
  isListening: boolean;
  volume: number;
  latency?: number;
}

export const AudioVisualizer = ({ isListening, volume, latency }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Draw animated waveform
      const bars = 40;
      const barWidth = width / bars;
      const time = Date.now() / 1000;

      for (let i = 0; i < bars; i++) {
        const x = i * barWidth;
        const intensity = isListening 
          ? Math.sin(time * 3 + i * 0.5) * 0.5 + 0.5
          : 0.1;
        const barHeight = (height * 0.8) * intensity * (volume / 100);

        const gradient = ctx.createLinearGradient(x, height - barHeight, x, height);
        gradient.addColorStop(0, 'hsl(43, 100%, 65%)');
        gradient.addColorStop(1, 'hsl(33, 100%, 55%)');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
      }

      requestAnimationFrame(draw);
    };

    draw();
  }, [isListening, volume]);

  return (
    <Card className="p-6 border-border bg-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isListening ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Live Audio Feed</h3>
              <p className="text-sm text-muted-foreground">
                {isListening ? 'Listening...' : 'Idle'}
              </p>
            </div>
          </div>
          {latency !== undefined && (
            <Badge variant="outline" className="text-primary border-primary">
              {latency}ms
            </Badge>
          )}
        </div>

        <canvas
          ref={canvasRef}
          width={800}
          height={80}
          className="w-full h-20 rounded-lg bg-muted/30"
        />

        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full gradient-divine transition-smooth"
              style={{ width: `${volume}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground min-w-[3ch]">
            {volume}%
          </span>
        </div>
      </div>
    </Card>
  );
};
