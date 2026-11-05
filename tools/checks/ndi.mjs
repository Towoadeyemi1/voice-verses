// NDI® output without NDI: where the NDI Runtime is looked for on each computer, the frame codes,
// and straight alpha for the see-through lower third. Run: node tools/checks/ndi.mjs
// (The full path, with a receiver, is tools/e2e/ndi.cjs.) NDI® is a registered trademark of Vizrt NDI AB.
import { BGRA, BGRX, runtimeCandidates, unpremultiply } from '../../electron/ndiFrames.js';

let failed = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
};

const win = runtimeCandidates({ NDI_RUNTIME_DIR_V6: 'C:\\Program Files\\NDI\\NDI 6 Runtime\\v6' }, 'win32');
check('Windows: the NDI Runtime’s own folder first', /NDI 6 Runtime[\\/]v6[\\/]Processing\.NDI\.Lib\.x64\.dll$/.test(win[0]), win[0]);
const mac = runtimeCandidates({}, 'darwin');
check('Mac: the NDI Runtime in /usr/local/lib', mac.includes('/usr/local/lib/libndi.dylib'), mac.join(', '));
check('a test library comes first when given', runtimeCandidates({ VOICE_VERSES_NDI_LIB: '/x/libndi.so.6' }, 'linux')[0] === '/x/libndi.so.6');

check('frame codes are BGRA and BGRX', BGRA === 0x41524742 && BGRX === 0x58524742, `${BGRA.toString(16)} ${BGRX.toString(16)}`);

// Chromium: half-clear white is stored as 128,128,128,128; NDI wants 255,255,255,128
const px = Buffer.from([128, 128, 128, 128, 0, 0, 0, 0, 10, 20, 30, 255, 60, 30, 15, 64]);
unpremultiply(px);
check('half-clear white becomes straight white', px[0] === 255 && px[1] === 255 && px[2] === 255 && px[3] === 128, [...px.subarray(0, 4)].join(','));
check('fully clear and solid pixels are left alone', px[4] === 0 && px[7] === 0 && px[8] === 10 && px[11] === 255);
check('a quarter-clear colour is divided by its alpha', px[12] === 239 && px[13] === 120 && px[14] === 60 && px[15] === 64, [...px.subarray(12)].join(','));

console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
