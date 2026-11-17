// Announces Voice Verses on the church network with Bonjour (mDNS), so other apps find it
// without typing an address: service type _voiceverses._tcp, with the API's path and
// version in its TXT record. Only while "Other apps and devices" is on (1.19.5, D33).
//
// Answers PTR questions for _voiceverses._tcp.local (and the "what services are here"
// question) with PTR, SRV, TXT and A records; legacy one-shot queries (from a port other
// than 5353) get a unicast answer. Announces twice on start and says goodbye when stopped.
import dgram from 'node:dgram';
import os from 'node:os';

export const SERVICE = '_voiceverses._tcp.local';
const SERVICES_QUESTION = '_services._dns-sd._udp.local';
const GROUP = '224.0.0.251';
const PORT = 5353;

let socket = null;
let advertised = null; // { instance, host, port, txt }

function encodeName(name) {
  const parts = name
    .split('.')
    .filter(Boolean)
    .map((label) => {
      const bytes = Buffer.from(label, 'utf8').subarray(0, 63);
      return Buffer.concat([Buffer.from([bytes.length]), bytes]);
    });
  return Buffer.concat([...parts, Buffer.from([0])]);
}

function readName(buf, offset, depth = 0) {
  const labels = [];
  let pos = offset;
  let end = -1;
  while (pos < buf.length && depth < 20) {
    const len = buf[pos];
    if (len === 0) {
      pos += 1;
      break;
    }
    if ((len & 0xc0) === 0xc0) {
      if (end < 0) end = pos + 2;
      pos = ((len & 0x3f) << 8) | buf[pos + 1];
      depth++;
      continue;
    }
    labels.push(buf.toString('utf8', pos + 1, pos + 1 + len));
    pos += 1 + len;
  }
  return { name: labels.join('.'), next: end >= 0 ? end : pos };
}

/** The questions in a DNS packet: [{ name, type, unicast }], or null for an answer packet. */
export function parseQuestions(buf) {
  if (buf.length < 12 || buf[2] & 0x80) return null;
  const count = buf.readUInt16BE(4);
  const questions = [];
  let pos = 12;
  try {
    for (let i = 0; i < count; i++) {
      const { name, next } = readName(buf, pos);
      questions.push({ name, type: buf.readUInt16BE(next), unicast: Boolean(buf.readUInt16BE(next + 2) & 0x8000) });
      pos = next + 4;
    }
  } catch {
    // A cut-off packet: answer what was read
  }
  return questions;
}

function record(name, type, cls, ttl, rdata) {
  const head = Buffer.alloc(10);
  head.writeUInt16BE(type, 0);
  head.writeUInt16BE(cls, 2);
  head.writeUInt32BE(ttl, 4);
  head.writeUInt16BE(rdata.length, 8);
  return Buffer.concat([encodeName(name), head, rdata]);
}

function txtData(entries) {
  const parts = Object.entries(entries).map(([k, v]) => {
    const bytes = Buffer.from(`${k}=${v}`, 'utf8').subarray(0, 255);
    return Buffer.concat([Buffer.from([bytes.length]), bytes]);
  });
  return parts.length ? Buffer.concat(parts) : Buffer.from([0]);
}

function ipv4() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

/** The answer packet for what is advertised (ttl 0 says goodbye). */
export function answerPacket(ad, { id = 0, question = null, goodbye = false, addresses = ipv4() } = {}) {
  const long = goodbye ? 0 : 4500;
  const short = goodbye ? 0 : 120;
  const flush = 0x8001; // IN, cache-flush: these records belong to this computer alone
  const srv = Buffer.alloc(6);
  srv.writeUInt16BE(0, 0);
  srv.writeUInt16BE(0, 2);
  srv.writeUInt16BE(ad.port, 4);
  const answers = [
    record(SERVICE, 12, 1, long, encodeName(ad.instance)),
    record(ad.instance, 33, flush, short, Buffer.concat([srv, encodeName(ad.host)])),
    record(ad.instance, 16, flush, long, txtData(ad.txt)),
    ...addresses.map((a) => record(ad.host, 1, flush, short, Buffer.from(a.split('.').map(Number)))),
  ];
  const header = Buffer.alloc(12);
  header.writeUInt16BE(id, 0);
  header.writeUInt16BE(0x8400, 2); // a response, authoritative
  header.writeUInt16BE(question ? 1 : 0, 4);
  header.writeUInt16BE(answers.length, 6);
  const q = question ? [Buffer.concat([encodeName(question.name), Buffer.from([0, question.type, 0, 1])])] : [];
  return Buffer.concat([header, ...q, ...answers]);
}

/** The "what services are here" answer: a pointer to our service type. */
function servicesPacket(id, question) {
  const header = Buffer.alloc(12);
  header.writeUInt16BE(id, 0);
  header.writeUInt16BE(0x8400, 2);
  header.writeUInt16BE(question ? 1 : 0, 4);
  header.writeUInt16BE(1, 6);
  const q = question ? [Buffer.concat([encodeName(question.name), Buffer.from([0, 12, 0, 1])])] : [];
  return Buffer.concat([header, ...q, record(SERVICES_QUESTION, 12, 1, 4500, encodeName(SERVICE))]);
}

const about = (name) => name.toLowerCase().replace(/\.$/, '');

function onMessage(msg, from) {
  if (!advertised || !socket) return;
  const questions = parseQuestions(msg);
  if (!questions) return;
  const legacy = from.port !== PORT;
  for (const q of questions) {
    const name = about(q.name);
    const ours = name === SERVICE || name === about(advertised.instance) || name === about(advertised.host);
    if (ours) {
      const id = legacy ? msg.readUInt16BE(0) : 0;
      const packet = answerPacket(advertised, { id, question: legacy ? q : null });
      if (legacy || q.unicast) socket.send(packet, from.port, from.address, () => {});
      else socket.send(packet, PORT, GROUP, () => {});
      return;
    }
    if (name === SERVICES_QUESTION && q.type === 12) {
      const id = legacy ? msg.readUInt16BE(0) : 0;
      const packet = servicesPacket(id, legacy ? q : null);
      if (legacy) socket.send(packet, from.port, from.address, () => {});
      else socket.send(packet, PORT, GROUP, () => {});
    }
  }
}

/** A name for this computer on the network, e.g. "booth-imac.local". */
function hostName() {
  const base = os.hostname().replace(/\.local$/i, '').replace(/[^A-Za-z0-9-]/g, '-').slice(0, 50) || 'voice-verses';
  return `${base}.local`;
}

/** Starts (or updates) the announcement. Never throws: without mDNS, the address still works. */
export function advertise({ port, version }) {
  const host = hostName();
  const label = `Voice Verses on ${host.replace(/\.local$/, '')}`.slice(0, 63);
  advertised = { instance: `${label}.${SERVICE}`, host, port, txt: { api: '1', path: '/api/v1', version: String(version ?? '') } };
  if (socket) {
    announce();
    return;
  }
  try {
    socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    socket.on('error', () => stop());
    socket.on('message', onMessage);
    socket.bind(PORT, () => {
      try {
        socket.addMembership(GROUP);
        socket.setMulticastTTL(255);
      } catch {
        // No multicast on this network: answers to direct questions still work
      }
      announce();
      setTimeout(announce, 1000).unref?.();
    });
  } catch {
    socket = null;
  }
}

function announce() {
  if (socket && advertised) socket.send(answerPacket(advertised), PORT, GROUP, () => {});
}

/** Says goodbye and stops answering. */
export function stop() {
  const s = socket;
  socket = null;
  if (!s) return;
  try {
    if (advertised) s.send(answerPacket(advertised, { goodbye: true }), PORT, GROUP, () => s.close());
    else s.close();
  } catch {
    try {
      s.close();
    } catch {
      // Already closed
    }
  }
  advertised = null;
}
