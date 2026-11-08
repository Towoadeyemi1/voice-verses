// Finding ProPresenter on this computer and on the network without typing a port: the listening ports are read from
// lsof (Mac) or netstat (Windows), then the one where its API answers is used; the theme for the
// Voice Verses message is chosen by name. Run: node tools/checks/propresenter-find.mjs
import http from 'node:http';
import { bonjourQuery, neighbours, parseBonjour, pickTheme, portsFromLsof, portsFromNetstat, probe, scan } from '../../electron/propresenter.js';

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
// A lower third first (1.18.5): a full-screen scripture theme covered every screen in the owner's church
check('theme: a lower third is chosen over a full-screen scripture theme', pickTheme([theme('Songs › Lyrics'), theme('Lower third › Bar'), theme('Scripture › Full')]).label === 'Lower third › Bar');
check('theme: else one named for scripture', pickTheme([theme('Songs › Lyrics'), theme('Scripture › Full')]).label === 'Scripture › Full');
check('theme: else the first', pickTheme([theme('Default › Blank')]).label === 'Default › Blank');
check('theme: none', pickTheme([]) === null);

// On the network: Bonjour answers are read (with name compression), and the neighbours to try
const name = (n) => Buffer.concat([...n.split('.').map((l) => Buffer.concat([Buffer.from([l.length]), Buffer.from(l)])), Buffer.from([0])]);
const rr = (nameBuf, type, data) => { const h = Buffer.alloc(10); h.writeUInt16BE(type, 0); h.writeUInt16BE(1, 2); h.writeUInt16BE(data.length, 8); return Buffer.concat([nameBuf, h, data]); };
const header = Buffer.alloc(12); header.writeUInt16BE(0x8400, 2); header.writeUInt16BE(3, 6);
const ptrName = name('_pro7proremote._tcp.local');
const inst = name('Mac-mini._pro7proremote._tcp.local');
const srvData = Buffer.concat([Buffer.from([0, 0, 0, 0, 0xc3, 0x51]), name('Mac-mini.local')]); // port 50001
const answer = Buffer.concat([header, rr(ptrName, 12, inst), rr(inst, 33, srvData), rr(name('Mac-mini.local'), 1, Buffer.from([192, 168, 1, 24]))]);
const records = parseBonjour(answer);
const srv = records.find((r) => r.type === 'SRV');
check('Bonjour: the service, its port and its address are read', srv?.port === 50001 && srv.target === 'Mac-mini.local' && records.some((r) => r.type === 'A' && r.address === '192.168.1.24'), JSON.stringify(records));
// A compressed name pointing back at the question
const q = bonjourQuery(['_pro7proremote._tcp.local']);
const h2 = Buffer.from(q.subarray(0, 12)); h2.writeUInt16BE(0x8400, 2); h2.writeUInt16BE(1, 6);
const compressed = Buffer.concat([h2, q.subarray(12), rr(Buffer.from([0xc0, 12]), 12, inst)]);
check('Bonjour: compressed names are followed', parseBonjour(compressed)[0]?.to === 'Mac-mini._pro7proremote._tcp.local', JSON.stringify(parseBonjour(compressed)));
check('Bonjour: a cut-off packet does not throw', Array.isArray(parseBonjour(answer.subarray(0, 40))));

const n = neighbours({ en0: [{ family: 'IPv4', address: '192.168.1.20', internal: false }], lo0: [{ family: 'IPv4', address: '127.0.0.1', internal: true }], utun: [{ family: 'IPv4', address: '8.8.4.4', internal: false }] });
check('network: the 253 other addresses of the church network, nothing public', n.length === 253 && n.includes('192.168.1.24') && !n.includes('192.168.1.20') && !n.some((h) => h.startsWith('8.')), String(n.length));

const pp2 = http.createServer((req, res) => (req.url === '/version' ? (res.writeHead(200, { 'content-type': 'application/json' }), res.end(JSON.stringify({ name: 'Media iMac', host_description: 'ProPresenter 7.16' }))) : (res.writeHead(404), res.end())));
const web = http.createServer((_req, res) => (res.writeHead(200, { 'content-type': 'text/html' }), res.end('<html></html>')));
await Promise.all([pp2, web].map((s) => new Promise((r) => s.listen(0, '127.0.0.1', r))));
const seen = [];
await scan(['127.0.0.1'], [pp2.address().port, web.address().port, 1], (r) => seen.push(r));
check('network scan: only ProPresenter is listed, not other web servers or closed ports', seen.length === 1 && seen[0].name === 'Media iMac', JSON.stringify(seen));
pp2.close();
web.close();

console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
