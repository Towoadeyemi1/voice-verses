// The service library folder: one JSON file per service or media item, inside a
// folder the user picks (which can live in iCloud Drive, Dropbox, OneDrive or
// Google Drive so the provider syncs it between computers). The renderer only
// sees paths relative to that folder, limited to the services/ and media/ dirs.
import { app, BrowserWindow, dialog } from 'electron';
import { watch } from 'fs';
import { mkdir, readFile, readdir, rename, writeFile } from 'fs/promises';
import { basename, join } from 'path';

const LIBRARY_DIR_NAME = 'Voice Verses Library';
const SAFE_PATH = /^(services|media)\/[A-Za-z0-9._-]+\.json$/;
const SAFE_DIR = /^(services|media)$/;

const settingsPath = () => join(app.getPath('userData'), 'library.json');

let libraryDir = null;
let watchers = [];
let changeTimer = null;

async function loadSettings() {
  try {
    return JSON.parse(await readFile(settingsPath(), 'utf8'));
  } catch {
    return {};
  }
}

function notifyChanged() {
  clearTimeout(changeTimer);
  changeTimer = setTimeout(() => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('library:changed');
    }
  }, 1000);
}

function startWatching() {
  watchers.forEach((w) => w.close());
  watchers = [];
  if (!libraryDir) return;
  // Watch each subfolder directly: recursive watching isn't available on every platform
  for (const dir of ['services', 'media']) {
    try {
      const watcher = watch(join(libraryDir, dir), notifyChanged);
      watcher.on('error', () => watcher.close());
      watchers.push(watcher);
    } catch {
      // Not fatal: the renderer also re-syncs on focus and on a timer
    }
  }
}

async function useFolder(dir) {
  libraryDir = dir;
  if (dir) {
    await mkdir(join(dir, 'services'), { recursive: true });
    await mkdir(join(dir, 'media'), { recursive: true });
  }
  startWatching();
}

export async function initLibrary() {
  const { folder } = await loadSettings();
  await useFolder(folder || null).catch(() => useFolder(null));
}

export function getFolder() {
  return libraryDir;
}

export async function chooseFolder() {
  const result = await dialog.showOpenDialog({
    title: 'Choose where to keep your Voice Verses library',
    message: 'Pick a folder in iCloud Drive, Dropbox, OneDrive or Google Drive to share it between computers.',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return libraryDir;

  const chosen = result.filePaths[0];
  const dir = basename(chosen) === LIBRARY_DIR_NAME ? chosen : join(chosen, LIBRARY_DIR_NAME);
  await useFolder(dir);
  await writeFile(settingsPath(), JSON.stringify({ folder: dir }));
  return dir;
}

export async function forgetFolder() {
  await useFolder(null);
  await writeFile(settingsPath(), JSON.stringify({}));
}

function resolveInLibrary(relativePath, pattern) {
  if (!libraryDir) throw new Error('No library folder chosen');
  if (typeof relativePath !== 'string' || !pattern.test(relativePath)) {
    throw new Error('Invalid library path');
  }
  return join(libraryDir, ...relativePath.split('/'));
}

export async function list(dir) {
  const full = resolveInLibrary(dir, SAFE_DIR);
  try {
    return (await readdir(full)).filter((name) => name.endsWith('.json'));
  } catch {
    return [];
  }
}

export async function read(relativePath) {
  try {
    return await readFile(resolveInLibrary(relativePath, SAFE_PATH), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function write(relativePath, text) {
  const target = resolveInLibrary(relativePath, SAFE_PATH);
  // Write then rename so a sync client never picks up a half-written file
  const temp = `${target}.${process.pid}.tmp`;
  await writeFile(temp, String(text), 'utf8');
  await rename(temp, target);
}
