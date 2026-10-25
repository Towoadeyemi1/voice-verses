// Starts the speech worker (worker.cjs) on demand and relays audio from the
// page to it and transcripts back. Each recognition run is a "session":
// 'live' for the microphone, 'file' for "Test with a recording".
import { app, utilityProcess } from 'electron';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));

/** Bundled with the installer (build.extraResources); fetched by scripts/fetch-models.mjs in development. */
export function modelDir() {
  return app.isPackaged ? join(process.resourcesPath, 'models') : join(here, '..', '..', 'resources', 'models');
}

export function isAvailable() {
  return existsSync(join(modelDir(), 'asr', 'encoder.int8.onnx')) && existsSync(join(modelDir(), 'vad', 'silero_vad.onnx'));
}

let worker = null;
let loading = null;
let nextSession = 1;
const owners = new Map(); // session id → webContents that receives its events

function forward(message) {
  if (message.type === 'loaded') return;
  const target = owners.get(message.session);
  if (!target || target.isDestroyed()) return;
  target.send('speech:event', message);
  if (message.type === 'done') owners.delete(message.session);
}

function ensureWorker() {
  if (loading) return loading;
  if (!isAvailable()) {
    return Promise.reject(new Error('The built-in speech models are missing. Reinstall Voice Verses.'));
  }

  worker = utilityProcess.fork(join(here, 'worker.cjs'), [], { serviceName: 'Voice Verses speech' });
  loading = new Promise((resolve, reject) => {
    const onMessage = (message) => {
      if (message.type === 'loaded') {
        worker.off('message', onMessage);
        resolve();
      } else if (message.type === 'error' && !message.session) {
        worker.off('message', onMessage);
        reject(new Error(message.message));
      }
    };
    worker.on('message', onMessage);
    worker.on('message', forward);
    worker.once('exit', (code) => {
      // Let the next start create a fresh worker; tell pages their sessions ended
      worker = null;
      loading = null;
      for (const [session, target] of owners) {
        if (!target.isDestroyed()) {
          target.send('speech:event', { type: 'error', session, message: `Speech engine stopped unexpectedly (code ${code}).` });
        }
      }
      owners.clear();
      reject(new Error(`Speech engine stopped unexpectedly (code ${code}).`));
    });
    worker.postMessage({ type: 'load', modelDir: modelDir() });
  });
  return loading;
}

export async function start(sender, mode) {
  await ensureWorker();
  const session = nextSession++;
  owners.set(session, sender);
  sender.once('destroyed', () => stop(session));
  worker.postMessage({ type: 'start', session, mode: mode === 'file' ? 'file' : 'live' });
  return session;
}

export function sendAudio(session, samples) {
  if (worker && owners.has(session) && samples instanceof Float32Array) {
    worker.postMessage({ type: 'audio', session, samples });
  }
}

export function finish(session) {
  if (worker && owners.has(session)) worker.postMessage({ type: 'finish', session });
}

export function stop(session) {
  if (!owners.delete(session)) return;
  worker?.postMessage({ type: 'stop', session });
}
