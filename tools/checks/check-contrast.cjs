// Measures text contrast the way a person sees it: the text colour against the
// REAL pixels behind it (gradients, tints, translucent layers, images), not
// against a CSS variable. Every visible piece of text is checked against WCAG
// AA: 4.5:1, or 3:1 for large text (24px, or 18.66px bold).
//
//   node check-contrast.cjs <file-or-url> [--theme light|dark] [--width 390]
//   const { auditContrast } = require('./check-contrast.cjs'); await auditContrast(page)
//
// How: it scrolls whatever actually scrolls (the page, or an app's own scroll
// area) one screen at a time. On each screen it takes the text's own line
// boxes, keeps only what is visible (not scrolled out of a strip, not under a
// floating bar or a dialog), photographs the screen with every glyph made
// invisible, and compares the text colour with each pixel behind it (the
// worst 5%, not one stray pixel). A piece of text is judged by its best view,
// so a bar passing over it on one screen doesn't count against it.
// Text inside disabled controls is reported but not counted (WCAG exempts it).
// Exit code 1 when any text fails.
const { chromium } = require('playwright');

const HIDE = '*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important; } *::placeholder { color: transparent !important; }';

async function collect(page) {
  return page.evaluate(() => {
    window.__cc = window.__cc || { n: 0, ids: new WeakMap() };
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const x = c.getContext('2d', { willReadFrequently: true });
    const rgba = (col) => { x.clearRect(0, 0, 1, 1); x.fillStyle = '#000'; x.fillStyle = col; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data]; };
    const W = innerWidth, H = innerHeight, out = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'svg', 'SVG'].includes(el.tagName) || el.closest('svg')) continue;
      const isField = (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /^(text|email|tel|number|search|url|password|date|time|datetime-local|month|week)$/.test(el.type))) && el.value;   // a checkbox's value ("on") is not shown
      const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own.length && !isField) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      // Laid out but not shown: inside a closed <details> (Chrome keeps its content in
      // layout, unpainted) or under content-visibility: hidden.
      if (el.checkVisibility && !el.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true })) continue;
      { const d = el.closest('details:not([open])'); if (d && !el.closest('summary')) continue; }
      let op = 1; for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
      if (op < 0.05) continue;
      let boxes = [];
      for (const n of own) { const r = document.createRange(); r.selectNodeContents(n); for (const q of r.getClientRects()) boxes.push({ x: q.left, y: q.top, w: q.width, h: q.height }); }
      if (isField) { const r = el.getBoundingClientRect(), pl = parseFloat(cs.paddingLeft) || 0; boxes.push({ x: r.left + pl, y: r.top + r.height * 0.25, w: r.width - pl * 2, h: r.height * 0.5 }); }
      // Clip to the screen and to every clipping or scrolling ancestor.
      const clip = (L, T, R, B) => { boxes = boxes.map((q) => { const nx = Math.max(q.x, L), ny = Math.max(q.y, T); return { x: nx, y: ny, w: Math.min(q.x + q.w, R) - nx, h: Math.min(q.y + q.h, B) - ny }; }); };
      clip(0, 0, W, H);
      for (let a = el.parentElement; a; a = a.parentElement) {
        const ac = getComputedStyle(a);
        if (ac.overflowX !== 'visible' || ac.overflowY !== 'visible') { const r = a.getBoundingClientRect(); clip(r.left, r.top, r.right, r.bottom); }
      }
      // Not hidden under something else: the text must be on top at both ends of the box.
      const mine = (t) => t && (t === el || el.contains(t) || t.contains(el));
      boxes = boxes.filter((q) => q.w >= 2 && q.h >= 2 && mine(document.elementFromPoint(q.x + Math.min(3, q.w / 2), q.y + q.h / 2)) && mine(document.elementFromPoint(q.x + q.w - Math.min(3, q.w / 2), q.y + q.h / 2)));
      if (!boxes.length) continue;
      if (!window.__cc.ids.has(el)) window.__cc.ids.set(el, ++window.__cc.n);
      const fill = cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color ? cs.webkitTextFillColor : cs.color;
      const [r, g, b, a] = rgba(fill);
      const size = parseFloat(cs.fontSize), weight = Number(cs.fontWeight) || 400;
      out.push({ id: window.__cc.ids.get(el), text: (own.map((n) => n.textContent.trim()).join(' ') || el.value).slice(0, 48), tag: el.tagName.toLowerCase(),
        cls: typeof el.className === 'string' ? el.className.slice(0, 40) : '', boxes, fg: [r, g, b, (a / 255) * op], size,
        // A lone symbol (✓ › × →) is a graphic, not words: WCAG 1.4.11 asks 3:1 of it.
        large: size >= 24 || (size >= 18.66 && weight >= 700) || /^[✓✔✕✗›‹»«×→←↑↓•·+−]$/.test(own.map((n) => n.textContent.trim()).join('')), inactive: !!el.closest('[disabled],[aria-disabled="true"]') });
    }
    return out;
  });
}

async function measure(page, items) {
  const style = await page.addStyleTag({ content: HIDE });
  await page.waitForTimeout(60);
  const shot = await page.screenshot({ animations: 'disabled' });
  await style.evaluate((n) => n.remove());
  return page.evaluate(async ({ b64, items }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
    const k = img.width / innerWidth;
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return items.map((it) => {
      const ratios = [];
      for (const q of it.boxes) {
        const px = x.getImageData(Math.floor(q.x * k), Math.floor(q.y * k), Math.max(1, Math.ceil(q.w * k)), Math.max(1, Math.ceil(q.h * k))).data;
        const step = Math.max(1, Math.floor(px.length / 4 / 400)) * 4;
        for (let i = 0; i < px.length; i += step) {
          const bg = [px[i], px[i + 1], px[i + 2]], a = it.fg[3];
          const L1 = lum([0, 1, 2].map((j) => it.fg[j] * a + bg[j] * (1 - a))), L2 = lum(bg);
          ratios.push((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05));
        }
      }
      ratios.sort((p, q) => p - q);
      const worst = ratios[Math.floor(ratios.length * 0.05)] ?? 21;
      return { id: it.id, text: it.text, tag: it.tag, cls: it.cls, size: it.size, ratio: Math.round(worst * 100) / 100, need: it.large ? 3 : 4.5, inactive: it.inactive };
    });
  }, { b64: shot.toString('base64'), items });
}

async function auditContrast(page, { maxScreens = 40 } = {}) {
  // Whatever actually scrolls: the page itself, or the app's largest scroll area.
  const plan = await page.evaluate(() => {
    const doc = document.scrollingElement;
    let best = doc.scrollHeight > innerHeight + 4 ? doc : null, area = 0;
    if (!best) for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (!/(auto|scroll)/.test(cs.overflowY) || el.scrollHeight <= el.clientHeight + 4) continue;
      const a = el.clientWidth * el.clientHeight; if (a > area) { area = a; best = el; }
    }
    window.__ccScroller = best;
    return best ? { height: best.scrollHeight, view: best === doc ? innerHeight : best.clientHeight } : { height: 0, view: 1 };
  });
  const screens = Math.min(maxScreens, Math.max(1, Math.ceil((plan.height - plan.view) / (plan.view * 0.7)) + 1));
  const best = new Map();
  for (let i = 0; i < screens; i++) {
    await page.evaluate((y) => { const s = window.__ccScroller; if (s) s.scrollTop = y; }, Math.round(i * plan.view * 0.7));
    await page.waitForTimeout(250);
    const items = await collect(page);
    if (!items.length) continue;
    for (const r of await measure(page, items)) { const was = best.get(r.id); if (!was || r.ratio > was.ratio) best.set(r.id, r); }
  }
  await page.evaluate(() => { const s = window.__ccScroller; if (s) s.scrollTop = 0; });
  return [...best.values()].map((r) => ({ ...r, pass: r.ratio >= r.need || r.inactive }));
}

module.exports = { auditContrast };

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
    const target = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
    const theme = opt('theme', 'light'), width = Number(opt('width', 390));
    const url = /^https?:|^file:/.test(target) ? target : 'file://' + require('node:path').resolve(target);
    const b = await chromium.launch();
    const p = await b.newPage({ viewport: { width, height: 844 }, colorScheme: theme });
    await p.goto(url); await p.evaluate(() => document.fonts.ready);
    await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    const res = await auditContrast(p);
    const fails = res.filter((r) => !r.pass).sort((a, z) => a.ratio - z.ratio);
    for (const f of fails) console.log(`✗ ${f.ratio.toFixed(2)} < ${f.need}  ${f.tag}${f.cls ? '.' + f.cls.split(' ')[0] : ''}  "${f.text}"`);
    console.log(`${theme} at ${width}px: ${res.length - fails.length} of ${res.length} pieces of text pass`);
    await b.close();
    process.exit(fails.length ? 1 : 0);
  })();
}
