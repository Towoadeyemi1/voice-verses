// ProPresenter "a slide with linked text" (1.19.3): Voice Verses writes what is live to small
// text files, and a text box on the church's own ProPresenter slide is linked to one of them
// (in ProPresenter: select the text box → Format → Linked Text → File). The team puts that
// slide up and takes it down like any other; its words follow Voice Verses.
//
// The folder is in Documents by default. When ProPresenter runs on another computer, the
// church picks a folder both computers can see (a shared folder or a synced cloud folder).
import { app, dialog, shell, BrowserWindow } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

/** The only files written, so nothing else in the folder is ever touched. */
export const FILES = ['verse.txt', 'reference.txt', 'verse-and-reference.txt'];
const MAX = 8000;

const configFile = () => path.join(app.getPath('userData'), 'linked-text.json');
export const defaultFolder = () => path.join(app.getPath('documents'), 'Voice Verses', 'ProPresenter');

export async function getFolder() {
  try {
    const saved = JSON.parse(await fs.readFile(configFile(), 'utf8'));
    if (typeof saved.folder === 'string' && saved.folder) return saved.folder;
  } catch {
    // Not chosen yet
  }
  return defaultFolder();
}

async function saveFolder(folder) {
  await fs.writeFile(configFile(), JSON.stringify({ folder }), 'utf8');
}

/** Asks for a folder; returns it, or null when the volunteer cancels. */
export async function chooseFolder() {
  const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() ?? undefined, {
    title: 'Where Voice Verses writes the words for ProPresenter',
    buttonLabel: 'Use this folder',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: await getFolder(),
  });
  if (result.canceled || !result.filePaths[0]) return null;
  await saveFolder(result.filePaths[0]);
  return result.filePaths[0];
}

export async function useDefaultFolder() {
  await fs.rm(configFile(), { force: true });
  return defaultFolder();
}

/**
 * Writes the files: each through a temporary file then renamed, so ProPresenter never reads a
 * half-written verse. `files` maps a name in FILES to its text; other names are ignored.
 */
export async function write(files) {
  const folder = await getFolder();
  await fs.mkdir(folder, { recursive: true });
  const written = [];
  for (const name of FILES) {
    if (!files || typeof files[name] !== 'string') continue;
    const target = path.join(folder, name);
    const temp = path.join(folder, `.${name}.${process.pid}.tmp`);
    await fs.writeFile(temp, files[name].slice(0, MAX), 'utf8');
    await fs.rename(temp, target);
    written.push(name);
  }
  return { folder, written };
}

/** Whether the folder can be written to now (the booth check). */
export async function check() {
  const folder = await getFolder();
  try {
    await fs.mkdir(folder, { recursive: true });
    await fs.access(folder, fs.constants?.W_OK ?? 2);
    return { ok: true, folder };
  } catch (e) {
    return { ok: false, folder, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function reveal() {
  const folder = await getFolder();
  await fs.mkdir(folder, { recursive: true });
  const verse = path.join(folder, 'verse.txt');
  try {
    await fs.access(verse);
    shell.showItemInFolder(verse);
  } catch {
    await shell.openPath(folder);
  }
}
