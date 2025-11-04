import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText } from 'lucide-react';

interface TranscriptWindowProps {
  transcript: string;
  highlightedText?: string;
}

export const TranscriptWindow = ({ transcript, highlightedText }: TranscriptWindowProps) => {
  const renderTranscript = () => {
    if (!highlightedText) return transcript;

    const parts = transcript.split(new RegExp(`(${highlightedText})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlightedText.toLowerCase() ? (
        <span key={i} className="bg-primary/20 text-primary font-semibold px-1 rounded">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <Card className="p-6 border-border bg-card">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-muted-foreground">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Live Transcript</h3>
            <p className="text-sm text-muted-foreground">Real-time speech recognition</p>
          </div>
        </div>

        <ScrollArea className="h-32 rounded-lg bg-muted/30 p-4">
          <p className="text-foreground leading-relaxed font-mono text-sm">
            {transcript || 'Waiting for speech...'}
            {renderTranscript()}
          </p>
        </ScrollArea>
      </div>
    </Card>
  );
};
