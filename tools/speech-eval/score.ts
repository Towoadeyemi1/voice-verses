// Scores engine transcripts with the app's own VerseDetectionController.
const store = new Map<string, string>();
(globalThis as unknown as Record<string, unknown>).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) };
(globalThis as unknown as Record<string, unknown>).window = globalThis;
console.log = () => {}; console.warn = () => {};
import { VerseDetectionController } from '@/speech/VerseDetectionController';
import * as fs from 'fs';

const out = (s: string) => process.stdout.write(s + '\n');
const [, , resultsPath, timelinePath, label] = process.argv;
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const timeline: { t: string; e: string | null; start: number; end: number }[] = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
const expected = timeline.filter((x) => x.e);
const key = (s: string) => s.toLowerCase().replace(/^psalm /, 'psalms ');

(async () => {
  out(`\n${label}: ${expected.length} spoken references, ${timeline.length - expected.length} distractor sentences`);
  out('engine'.padEnd(30) + 'found'.padStart(7) + 'wrong'.padStart(7) + 'latency'.padStart(9) + 'RTF'.padStart(7));
  const misses: Record<string, string[]> = {};
  for (const [engine, r] of Object.entries(results as Record<string, { rtf: number; segments: { text: string; at: number }[] }>)) {
    const detections: { ref: string; at: number }[] = [];
    let at = 0;
    // The detector debounces on wall-clock time; replay at audio time instead
    Date.now = () => at * 1000;
    const c = new VerseDetectionController({ onVerseDetected: (v) => detections.push({ ref: `${v.book} ${v.chapter}:${v.verse}`, at }) });
    for (const seg of r.segments) { at = seg.at; await c.onTranscript(seg.text, true); }

    const used = new Set<number>(); const latencies: number[] = []; let found = 0; misses[engine] = [];
    expected.forEach((x, i) => {
      const next = expected[i + 1];
      const j = detections.findIndex((d, k) => !used.has(k) && key(d.ref) === key(x.e!) && d.at >= x.start && d.at <= (next ? next.end : Infinity) + 1);
      if (j >= 0) { used.add(j); found++; latencies.push(detections[j].at - x.end); } else misses[engine].push(x.e!);
    });
    const wrong = detections.filter((_, k) => !used.has(k)).length;
    const lat = latencies.length ? (latencies.sort((a, b) => a - b)[Math.floor(latencies.length / 2)]).toFixed(1) + 's' : '-';
    out(engine.padEnd(30) + `${found}/${expected.length}`.padStart(7) + String(wrong).padStart(7) + lat.padStart(9) + r.rtf.toFixed(2).padStart(7));
  }
  fs.writeFileSync(resultsPath.replace('.json', '.misses.json'), JSON.stringify(misses, null, 1));
})();
