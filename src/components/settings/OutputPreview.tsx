import { ScaledStage } from '@/components/ScaledStage';
import { Live, OutputContent } from '@/components/OutputContent';
import { ConfidenceScreen, loadConfidenceSettings } from '@/components/ConfidenceScreen';
import { useLive } from '@/hooks/use-live';
import { usePreviewStage } from '@/hooks/use-screen-shape';
import type { ScreenOutput } from '@/lib/desktop';

/** Shown when nothing is on screen, so each preview still shows its look (KJV, public domain). */
const SAMPLE: Live = {
  verse: { book: 'John', chapter: 3, verse: 16, text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
};

/**
 * One output as the room sees it, drawn by the real renderer (rule 5): what is
 * live now, or a sample verse when nothing is. `className` sizes it.
 */
export function OutputPreview({ output, className = '' }: { output: ScreenOutput | null; className?: string }) {
  const { live } = useLive();
  const projector = usePreviewStage('projection');
  const stream = usePreviewStage('stream');
  const shown = live ?? SAMPLE;

  if (!output)
    return (
      <span className={`st-screen grid place-items-center aspect-video text-[11px] font-semibold text-white/40 ${className}`} aria-label="Shows nothing">
        Nothing
      </span>
    );
  if (output === 'confidence')
    return (
      <ScaledStage className={`st-screen aspect-video bg-black ${className}`}>
        <ConfidenceScreen settings={loadConfidenceSettings()} style={{ width: 1920, height: 1080 }} />
      </ScaledStage>
    );
  return (
    <ScaledStage
      stage={output === 'projection' ? projector : stream}
      fitShape
      className={`st-screen bg-black ${className}`}
    >
      {/* The lower third is keyed over the camera: shown over a dark stand-in, not its key colour */}
      {output === 'lowerThird' && <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 80% at 30% 30%, #3a3f4a, #0d0f14 70%)' }} />}
      <OutputContent live={shown} output={output === 'projection' ? 'projection' : 'stream'} preview transparent={output === 'lowerThird'} />
    </ScaledStage>
  );
}
