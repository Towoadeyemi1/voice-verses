// Network outputs: serves the projector, confidence monitor and lower third to
// other devices on the church network (another computer, a smart TV browser, a
// tablet on stage, or OBS as a browser source). Off unless the operator turns
// it on. Read-only: viewers receive what is on screen and nothing else; API keys
// and the library never leave this computer.
//
//   GET /            the app's pages (index.html marked as a network viewer)
//   GET /live        Server-Sent Events: the current state, then every change
//   GET /media/:id   pictures and videos used by templates and slides
//
// The same server carries the local API under /api (electron/api.js) when Settings → Other
// apps and devices is on (1.19.5). It runs while either is on; each part answers only while
// its own switch is on, so the screens stay read-only and separate from the API.
import http from 'http';
import * as api from './api.js';
import * as mdns from './mdns.js';
import os from 'os';
import { createReadStream } from 'fs';
import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import { app } from 'electron';
import { dirname, extname, join, normalize, sep } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const distDir = join(here, '..', 'dist');
const mediaDir = () => join(app.getPath('userData'), 'network-media');

export const DEFAULT_PORT = 47100;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

let server = null;
let port = DEFAULT_PORT;
let screensOn = false;
let apiOn = false;
let snapshot = null;
const viewers = new Set();
const media = new Map(); // id → { path, mime, size }

/** Addresses other devices can use to reach this computer. */
function addresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

export function status() {
  const listening = Boolean(server?.listening);
  return {
    running: listening && screensOn,
    port,
    viewers: viewers.size,
    urls: listening && screensOn ? addresses().map((ip) => `http://${ip}:${port}/`) : [],
  };
}

/** The local API's address on each network this computer is on. */
export function apiStatus() {
  const listening = Boolean(server?.listening);
  return { enabled: apiOn, running: listening && apiOn, port, urls: listening && apiOn ? addresses().map((ip) => `http://${ip}:${port}/api/v1`) : [] };
}

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

async function serveStatic(req, res, pathname) {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '') || 'index.html';
  const file = join(distDir, relative);
  if (!file.startsWith(distDir + sep) && file !== distDir) return send(res, 403, 'Forbidden');
  try {
    if (relative === 'index.html') {
      // Mark the page so the app knows it is a network viewer
      const html = (await readFile(file, 'utf8')).replace('<head>', '<head><script>window.__VOICE_VERSES_NETWORK__=true</script>');
      return send(res, 200, html, TYPES['.html']);
    }
    const info = await stat(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'content-length': info.size });
    createReadStream(file).pipe(res);
  } catch {
    send(res, 404, 'Not found');
  }
}

async function serveMedia(req, res, id) {
  const entry = media.get(id);
  if (!entry) return send(res, 404, 'Not found');
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
  if (!range) {
    res.writeHead(200, { 'content-type': entry.mime, 'content-length': entry.size, 'accept-ranges': 'bytes' });
    return createReadStream(entry.path).pipe(res);
  }
  // Ranges let browsers seek and loop videos
  const start = range[1] ? Number(range[1]) : Math.max(0, entry.size - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(Number(range[2]), entry.size - 1) : entry.size - 1;
  if (start >= entry.size || start > end) {
    res.writeHead(416, { 'content-range': `bytes */${entry.size}` });
    return res.end();
  }
  res.writeHead(206, {
    'content-type': entry.mime,
    'content-length': end - start + 1,
    'content-range': `bytes ${start}-${end}/${entry.size}`,
    'accept-ranges': 'bytes',
  });
  createReadStream(entry.path, { start, end }).pipe(res);
}

function serveLive(req, res) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
  res.write('retry: 2000\n\n');
  if (snapshot) res.write(`data: ${snapshot}\n\n`);
  viewers.add(res);
  req.on('close', () => viewers.delete(res));
}

function handle(req, res) {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  if (pathname === '/api' || pathname.startsWith('/api/')) return apiOn ? void api.handle(req, res, pathname) : send(res, 404, 'Not found');
  if (!screensOn) return send(res, 404, 'Not found');
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
  if (pathname === '/live') return serveLive(req, res);
  const mediaMatch = /^\/media\/([\w.-]+)$/.exec(pathname);
  if (mediaMatch) return serveMedia(req, res, mediaMatch[1]);
  return serveStatic(req, res, pathname);
}

// Keeps idle connections (and proxies) from dropping the live stream
setInterval(() => {
  for (const viewer of viewers) viewer.write(': keep-alive\n\n');
}, 20_000).unref();

const validPort = (wanted) => (Number.isInteger(wanted) && wanted >= 1024 && wanted <= 65535 ? wanted : DEFAULT_PORT);

/** Starts, stops or moves the server so it runs while the screens or the API are on. */
async function apply(nextPort) {
  const wanted = screensOn || apiOn;
  if (!screensOn) {
    for (const viewer of viewers) viewer.end();
    viewers.clear();
  }
  if (!apiOn) api.closeAll();
  if (server && (!wanted || nextPort !== port)) {
    for (const viewer of viewers) viewer.end();
    viewers.clear();
    api.closeAll();
    const closing = server;
    server = null;
    await new Promise((resolve) => {
      closing.close(resolve);
      closing.closeAllConnections?.();
    });
  }
  port = nextPort;
  if (wanted && !server) {
    const starting = http.createServer(handle);
    starting.on('upgrade', (req, socket) => {
      socket.on('error', () => {});
      if (!apiOn) return socket.destroy();
      api.upgrade(req, socket).then((ours) => ours || socket.destroy(), () => socket.destroy());
    });
    await new Promise((resolve, reject) => {
      starting.once('error', reject);
      starting.listen(port, '0.0.0.0', resolve);
    }).catch((error) => {
      throw new Error(error?.code === 'EADDRINUSE' ? `Port ${port} is already in use. Choose another.` : String(error?.message ?? error));
    });
    server = starting;
  }
  if (apiOn && server) mdns.advertise({ port, version: app.getVersion() });
  else mdns.stop();
}

/** Turns network outputs on or off (and changes the port). */
export async function configure({ enabled, port: wanted }) {
  screensOn = Boolean(enabled);
  try {
    await apply(validPort(wanted));
  } catch (error) {
    screensOn = false;
    throw error;
  }
  return status();
}

/** Turns the local API on or off, on the same port as the network screens. */
export async function configureApi({ enabled, port: wanted }) {
  apiOn = Boolean(enabled);
  try {
    await apply(validPort(wanted ?? port));
  } catch (error) {
    apiOn = false;
    throw error;
  }
  return apiStatus();
}

/** The current screens' state, sent to every viewer. */
export function publish(state) {
  snapshot = JSON.stringify(state);
  for (const viewer of viewers) viewer.write(`data: ${snapshot}\n\n`);
}

export function hasMedia(id) {
  return media.has(id);
}

/** Makes a picture or video available to viewers at /media/:id. */
export async function putMedia(id, mime, bytes) {
  if (!/^[\w.-]+$/.test(String(id))) throw new Error('Invalid media id');
  await mkdir(mediaDir(), { recursive: true });
  const path = join(mediaDir(), id);
  const data = Buffer.from(bytes);
  await writeFile(path, data);
  media.set(id, { path, mime: String(mime || 'application/octet-stream'), size: data.length });
}
