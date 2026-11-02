// ProPresenter themes are read from both answers to /v1/themes: a list of groups (7.9–7.x) and
// an object with system themes and groups (ProPresenter 21). Run: node tools/checks/propresenter-themes.mjs
import { themeSlidesFrom } from '../../electron/propresenter.js';
const slide = (u, n) => ({ id: { uuid: u, name: n, index: 0 } });
const theme = (n, ...s) => ({ id: { uuid: `t-${n}`, name: n, index: 0 }, slides: s });
const old = [{ id: { name: 'Group' }, themes: [theme('Church', slide('a', 'Lower third'))], groups: [{ themes: [theme('Nested', slide('b', 'Full'))] }] }];
const pp21 = { system: [theme('Default', slide('c', 'Blank'))], groups: [{ id: { name: 'Mine' }, themes: [theme('Church', slide('a', 'Lower third'))], groups: [] }] };
const results = [['7.x list', themeSlidesFrom(old)], ['21 object', themeSlidesFrom(pp21)], ['empty', themeSlidesFrom(null)], ['odd', themeSlidesFrom({ groups: 'x' })]];
for (const [label, r] of results) console.log(label, '→', r.map((x) => x.label).join(' | ') || '(none)');
const ok = results[0][1].length === 2 && results[1][1].length === 2 && results[2][1].length === 0 && results[3][1].length === 0;
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
