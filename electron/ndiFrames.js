// The parts of NDI® output that need no Electron: where the NDI Runtime is, the
// frame codes, and turning Chromium's premultiplied alpha into NDI's straight alpha.
// Checked by tools/checks/ndi.mjs. NDI® is a registered trademark of Vizrt NDI AB.
import { join } from 'path';

/** Where the NDI Runtime is, by platform (its installer sets NDI_RUNTIME_DIR_V6 on Windows). */
export function runtimeCandidates(env = process.env, platform = process.platform) {
  const file = platform === 'win32' ? 'Processing.NDI.Lib.x64.dll' : platform === 'darwin' ? 'libndi.dylib' : 'libndi.so.6';
  const list = [];
  if (env.VOICE_VERSES_NDI_LIB) list.push(env.VOICE_VERSES_NDI_LIB); // tests
  for (const v of ['NDI_RUNTIME_DIR_V6', 'NDI_RUNTIME_DIR_V5']) if (env[v]) list.push(join(env[v], file));
  if (platform === 'darwin') list.push('/usr/local/lib/libndi.dylib', '/Library/NDI SDK for Apple/lib/macOS/libndi.dylib', '/Library/NDI Advanced SDK for Apple/lib/macOS/libndi_advanced.dylib');
  else if (platform === 'win32') list.push('C:\\Program Files\\NDI\\NDI 6 Runtime\\v6\\Processing.NDI.Lib.x64.dll', 'C:\\Program Files\\NDI\\NDI 5 Runtime\\v5\\Processing.NDI.Lib.x64.dll');
  else list.push('/usr/lib/libndi.so.6', '/usr/local/lib/libndi.so.6', '/usr/lib/x86_64-linux-gnu/libndi.so.6');
  return list;
}

// FourCC codes: 'B','G','R','A' and 'B','G','R','X' (little-endian)
export const fourcc = (s) => s.charCodeAt(0) | (s.charCodeAt(1) << 8) | (s.charCodeAt(2) << 16) | (s.charCodeAt(3) << 24);
export const BGRA = fourcc('BGRA');
export const BGRX = fourcc('BGRX');
export const TIMECODE_SYNTHESIZE = 9223372036854775807n;
export const PROGRESSIVE = 1;

/**
 * Chromium draws with premultiplied alpha; NDI's BGRA is not premultiplied.
 * Divides each colour by its alpha, in place (only where it is partly see-through).
 */
export function unpremultiply(buffer) {
  for (let i = 0; i < buffer.length; i += 4) {
    const a = buffer[i + 3];
    if (a === 255 || a === 0) continue;
    const f = 255 / a;
    buffer[i] = Math.min(255, Math.round(buffer[i] * f));
    buffer[i + 1] = Math.min(255, Math.round(buffer[i + 1] * f));
    buffer[i + 2] = Math.min(255, Math.round(buffer[i + 2] * f));
  }
  return buffer;
}

