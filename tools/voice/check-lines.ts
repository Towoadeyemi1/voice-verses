// CI check (1.19.13): every sentence the guide says in Training and the demo has its recording
// in the guide's voice (public/voice/, src/lib/voice-lines.json). A new or changed line needs
// node tools/voice/record.cjs. Run: npx esbuild tools/voice/check-lines.ts --bundle
// --platform=node --alias:@=./src --outfile=/tmp/vl.cjs && node /tmp/vl.cjs
import { existsSync } from 'fs';
import { join } from 'path';
import { guideSentences } from './lines';
import { lineId, recordingOf, voiceManifest } from '@/lib/voiceLines';

const missing = guideSentences().filter(({ sentence }) => !recordingOf(sentence) || !existsSync(join('public/voice', voiceManifest.lines[lineId(sentence)].file)));
if (missing.length) {
  console.error(`❌ ${missing.length} line(s) of the guide have no recording. Run node tools/voice/record.cjs:`);
  for (const m of missing) console.error(`   “${m.sentence}” (${m.from})`);
  process.exit(1);
}
console.log(`✅ Every line of the guide has its recording (${guideSentences().length} sentences)`);
