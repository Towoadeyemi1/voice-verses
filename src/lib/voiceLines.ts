/**
 * The guide's recorded voice (1.19.13, owner 26 Nov 2026): every line the guide says in
 * Training and the demo is recorded ahead of time in one natural voice (Kyutai Pocket TTS
 * with a CC0 voice), checked by Voice Verses' own speech recognition, and shipped as small
 * files in public/voice/. A line is played sentence by sentence; a sentence without a
 * recording makes the whole line use the computer's own voice. Recorded by
 * tools/voice/record.cjs; tools/voice/check-lines.ts fails when a line has no recording.
 */
import manifest from './voice-lines.json';

export interface VoiceManifest {
  /** The voice recorded with (see tools/voice/README.md) */
  voice: string;
  lines: Record<string, { text: string; file: string; ms: number }>;
}

const MANIFEST = manifest as VoiceManifest;

/** A line as sentences (each recorded on its own, with a pause between). */
export function sentencesOf(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?…])\s+(?=[A-Z0-9“"‘'])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** A stable id for a sentence (FNV-1a, 32 bits): the name of its recording. */
export function lineId(sentence: string): string {
  const s = sentence.replace(/\s+/g, ' ').trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * How a sentence is said, as the voice reads it best: only full stops and commas (a colon
 * or dash muddles it), no brackets. The words on screen keep their own punctuation.
 */
export function spokenForm(sentence: string): string {
  return sentence
    .replace(/[“”"]/g, '')
    .replace(/[()]/g, ',')
    .replace(/\s*[:;]\s+/g, '. ')
    .replace(/\s+[—–-]\s+/g, ', ')
    .replace(/…/g, '.')
    .replace(/,\s*([.,])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The recording of a sentence, if there is one. */
export function recordingOf(sentence: string): { url: string; ms: number } | null {
  const r = MANIFEST.lines[lineId(sentence)];
  if (!r || r.text !== sentence.replace(/\s+/g, ' ').trim()) return null;
  return { url: `${import.meta.env?.BASE_URL ?? "./"}voice/${r.file}`, ms: r.ms };
}

export const voiceManifest = MANIFEST;
