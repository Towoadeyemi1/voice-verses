// Every word readable (1.19.19): the colours used for words keep at least 4.5:1 against every
// surface they sit on. The end-to-end test (tools/e2e/contrast.cjs) measures the real pixels on
// every screen; this check runs in CI in a second and stops a fixed colour from going back to a
// failing value (FOUNDATION §5: contrast is measured, never judged from the tokens alone, so a
// value that passes here is still measured on screen).
//
//   node tools/checks/contrast-tokens.mjs                 checks src/
//   node tools/checks/contrast-tokens.mjs <folder>        checks a copy (to prove it fails)
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'src');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const index = read('index.css');
const settings = read('components/settings/settings.css');

/** The value of a CSS variable, as written in a file */
const token = (css, name) => {
  const m = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`${name} is missing`);
  return m[1].trim();
};

// Colour maths (WCAG 2): hsl "h s% l%" (shadcn's way) or #rrggbb
const fromHsl = (v) => {
  const [h, s, l] = v.replace(/%/g, '').split(/\s+/).map(Number);
  const S = s / 100, L = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  return [0, 8, 4].map((n) => 255 * (L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
};
const fromHex = (v) => [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
const rgb = (v) => (v.startsWith('#') ? fromHex(v) : fromHsl(v));
const lum = (c) => {
  const [r, g, b] = c.map((x) => {
    x /= 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const WHITE = '#ffffff';
const BLACK = '#000000';
const checks = [];
const need = (what, fg, bg, min = 4.5) => checks.push({ what, r: ratio(fg, bg), min });

// Settings: the quiet grey and the secondary grey on every surface
for (const surface of ['--s-win', '--s-surface', '--s-raised', '--s-sunken']) {
  need(`Settings quiet words (--s-ink-3) on ${surface}`, token(settings, '--s-ink-3'), token(settings, surface));
  need(`Settings secondary words (--s-ink-2) on ${surface}`, token(settings, '--s-ink-2'), token(settings, surface));
}
// The app: muted words on every surface, the raised Take button's top included
for (const surface of ['--background', '--card', '--popover', '--muted', '--secondary', '--accent'])
  need(`muted words (--muted-foreground) on ${surface}`, token(index, '--muted-foreground'), token(index, surface));
need('muted words on the Take button (260 7% 21%)', token(index, '--muted-foreground'), '260 7% 21%');
// Words on meaning colours
need('white words on the Live badge (--live-fill)', WHITE, token(index, '--live-fill'));
need('black words on the Next badge (--next)', BLACK, token(index, '--next'));
need('dark words on the gold (--primary-foreground on --primary)', token(index, '--primary-foreground'), token(index, '--primary'));

// No words faded with opacity where they were fixed (quieter by colour instead)
const faded = [
  [settings, /\.st-row\.dim[^{]*\{[^}]*opacity/, 'Settings: a dimmed row fades its words'],
  [settings, /\.tr-card\.soon\s*\{[^}]*opacity/, 'Training: a coming-soon card fades its words'],
  [read('components/live/ServiceTimeline.tsx'), /past \? 'opacity-/, 'the timeline fades past parts'],
];

let failed = 0;
for (const c of checks) {
  const ok = c.r >= c.min;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.what}: ${c.r.toFixed(2)} (needs ${c.min})`);
}
for (const [text, re, what] of faded) {
  const bad = re.test(text);
  if (bad) failed++;
  console.log(`${bad ? 'FAIL' : 'PASS'}  ${bad ? what : what.replace(/ fades.*/, ' is quieter by colour, not fading')}`);
}
if (failed) {
  console.error(`\n❌ ${failed} colour${failed === 1 ? '' : 's'} for words below the mark`);
  process.exit(1);
}
console.log('\n✅ Every colour used for words reads at 4.5:1 or more');
