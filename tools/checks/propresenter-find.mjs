// Finding ProPresenter on this computer without typing a port: the listening ports are read from
// lsof (Mac) or netstat (Windows), then the one where its API answers is used; the theme for the
// Voice Verses message is chosen by name. Run: node tools/checks/propresenter-find.mjs
import http from 'node:http';
import { pickTheme, portsFromLsof, portsFromNetstat, probe } from '../../electron/propresenter.js';

let failed = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
};

const lsof = [
  'COMMAND     PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME',
  'ProPresen  812 booth   31u  IPv4 0x1234      0t0  TCP *:52739 (LISTEN)',
  'ProPresen  812 booth   32u  IPv6 0x1235      0t0  TCP *:52739 (LISTEN)',
  'ProPresen  812 booth   40u  IPv4 0x1236      0t0  TCP 127.0.0.1:61000 (LISTEN)',
  'Logic\\x20  900 booth   12u  IPv4 0x1237      0t0  TCP *:7000 (LISTEN)',
].join('\n');
check('Mac: ProPresenter’s listening ports, once each', JSON.stringify(portsFromLsof(lsof)) === '[52739,61000]', JSON.stringify(portsFromLsof(lsof)));
const netstat = ['  TCP    0.0.0.0:52739    0.0.0.0:0    LISTENING    4321', '  TCP    0.0.0.0:445      0.0.0.0:0    LISTENING    4', '  TCP    0.0.0.0:61000    0.0.0.0:0    LISTENING    4321'].join('\r\n');
check('Windows: the ports of ProPresenter’s process', JSON.stringify(portsFromNetstat(netstat, new Set(['4321']))) === '[52739,61000]');

// Two servers: one not ProPresenter, one ProPresenter
const other = http.createServer((_req, res) => (res.writeHead(404), res.end()));
const pp = http.createServer((req, res) => (req.url === '/version' ? (res.writeHead(200, { 'content-type': 'application/json' }), res.end(JSON.stringify({ name: 'Mac-mini', host_description: 'ProPresenter 21.4' }))) : (res.writeHead(404), res.end())));
await Promise.all([other, pp].map((s) => new Promise((r) => s.listen(0, '127.0.0.1', r))));
const found = await probe('127.0.0.1', [other.address().port, pp.address().port]);
check('the port where ProPresenter answers is found', found?.port === pp.address().port && found.version === 'ProPresenter 21.4', JSON.stringify(found));
check('nothing answering: not found', (await probe('127.0.0.1', [other.address().port])) === null);
other.close();
pp.close();

const theme = (label) => ({ id: { uuid: label, name: label, index: 0 }, label });
check('theme: one named for scripture is chosen', pickTheme([theme('Songs › Lyrics'), theme('Lower third › Bar'), theme('Scripture › Full')]).label === 'Scripture › Full');
check('theme: else a lower third', pickTheme([theme('Songs › Lyrics'), theme('Lower third › Bar')]).label === 'Lower third › Bar');
check('theme: else the first', pickTheme([theme('Default › Blank')]).label === 'Default › Blank');
check('theme: none', pickTheme([]) === null);

console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
