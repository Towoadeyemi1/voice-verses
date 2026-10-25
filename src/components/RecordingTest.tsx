import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { FileAudio, Loader2 } from 'lucide-react';
import { RecordingSegment, testRecording } from '@/speech/recordingTest';

const clock = (seconds: number) => {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0');
  return `${h ? `${h}:` : ''}${mm}:${String(s % 60).padStart(2, '0')}`;
};

/** Settings card: run a recorded service through the built-in engine and list the verses it finds. */
export const RecordingTest = () => {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [segments, setSegments] = useState<RecordingSegment[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const run = async (file: File) => {
    setRunning(true);
    setSegments([]);
    setSummary(null);
    setError(null);
    const began = performance.now();
    try {
      const found: RecordingSegment[] = [];
      const { duration } = await testRecording(file, setProgress, (segment) => {
        found.push(segment);
        setSegments([...found]);
      });
      const verses = found.filter((s) => s.verse).length;
      const took = (performance.now() - began) / 1000;
      setSummary(`${verses} verse${verses === 1 ? '' : 's'} detected in ${clock(duration)} of audio (processed in ${clock(took)}).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not process the recording');
    } finally {
      setRunning(false);
    }
  };

  const visible = showAll ? segments : segments.filter((s) => s.verse);

  return (
    <div className="space-y-3 p-4 rounded-lg border">
      <div>
        <Label className="text-base font-semibold flex items-center gap-2">
          <FileAudio className="w-4 h-4" /> Test with a recording
        </Label>
        <p className="text-xs text-muted-foreground mt-1">
          Choose a recorded service (MP3, M4A or WAV). It runs through the built-in engine much faster than real time and
          lists every verse that would have gone on screen. Nothing is displayed or sent anywhere.
        </p>
      </div>

      <Button variant="outline" asChild disabled={running}>
        <label className={running ? 'pointer-events-none opacity-50' : 'cursor-pointer'}>
          {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileAudio className="w-4 h-4 mr-2" />}
          {running ? 'Processing…' : 'Choose recording'}
          <input
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) run(file);
            }}
          />
        </label>
      </Button>

      {running && <Progress value={progress * 100} />}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {summary && <p className="text-sm font-medium">{summary}</p>}

      {segments.length > 0 && (
        <>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Show the full transcript, not just verses
          </label>
          <div className="max-h-80 overflow-y-auto rounded border text-sm divide-y" data-testid="recording-results">
            {visible.map((s, i) => (
              <div key={i} className="p-2 grid grid-cols-[4rem_1fr] gap-2">
                <span className="text-muted-foreground tabular-nums">{clock(s.start)}</span>
                <div>
                  {s.verse && (
                    <div className="font-medium text-primary">
                      {s.verse.book} {s.verse.chapter}:{s.verse.verse}
                    </div>
                  )}
                  <div className="text-muted-foreground">{s.text}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
