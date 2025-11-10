import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';

interface AudioVisualizerProps {
  isListening: boolean;
  volume: number;
  latency?: number;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

export const AudioVisualizer = ({ isListening, volume, latency, isMuted, onToggleMute }: AudioVisualizerProps) => {
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
    <Card className="p-3 sm:p-4 lg:p-6 border-border bg-card">
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`p-1.5 sm:p-2 rounded-lg ${isListening ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base text-foreground">Live Audio Feed</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isListening ? (isMuted ? 'Muted' : 'Listening...') : 'Idle'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onToggleMute && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleMute}
                disabled={!isListening}
                className="h-9 sm:h-8 gap-1.5 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm"
              >
                {isMuted ? <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
              </Button>
            )}
            {latency !== undefined && (
              <Badge variant="outline" className="text-primary border-primary text-[10px] sm:text-xs whitespace-nowrap">
                {latency}ms
              </Badge>
            )}
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={800}
          height={80}
          className="w-full h-16 sm:h-20 rounded-lg bg-muted/30"
        />

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full gradient-divine transition-smooth"
              style={{ width: `${volume}%` }}
            />
          </div>
          <span className="text-xs sm:text-sm text-muted-foreground min-w-[2.5ch] sm:min-w-[3ch]">
            {volume}%
          </span>
        </div>
      </div>
    </Card>
  );
};
