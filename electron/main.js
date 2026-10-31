import { app, BrowserWindow, ipcMain, shell, systemPreferences } from 'electron';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import * as secrets from './secrets.js';
import * as library from './library.js';
import * as proPresenter from './propresenter.js';
import { keepAwake, outputWindowOptions, trackOutputWindow } from './outputs.js';
import * as network from './network.js';
import * as screens from './screens.js';
import * as speech from './speech/index.js';
import { initUpdates } from './updates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ELECTRON_LOAD_DIST=1 runs the built app unpackaged (npm run electron:preview)
const isDev = process.env.NODE_ENV === 'development' || (!app.isPackaged && process.env.ELECTRON_LOAD_DIST !== '1');
const DEV_URL = 'http://localhost:8080';
const appIndexUrl = pathToFileURL(join(__dirname, '../dist/index.html')).href;

let mainWindow;

const webPreferences = {
  preload: join(__dirname, 'preload.cjs'),
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
};

/** True for pages that belong to this app (dev server or bundled files). */
function isAppUrl(url) {
  return isDev ? url.startsWith(DEV_URL) : url.startsWith(appIndexUrl);
}

function hardenWindow(win) {
  // Projection/confidence/lower-third windows open in-app; external links open in the browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppUrl(url)) {
      return { action: 'allow', overrideBrowserWindowOptions: { ...outputWindowOptions(url), webPreferences } };
    }
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  win.webContents.on('did-create-window', (child, details) => {
    hardenWindow(child);
    trackOutputWindow(child, details.url);
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url)) {
      event.preventDefault();
      if (url.startsWith('https://') || url.startsWith('http://')) {
        shell.openExternal(url);
      }
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences,
    icon: join(__dirname, '../public/favicon.ico'),
    titleBarStyle: 'default',
    title: 'Voice Verses - Bible Projection',
  });

  hardenWindow(mainWindow);

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    // The outputs go with the window that controls them (they come back when it reopens)
    screens.suspendScreens();
  });
}

/** Only our own pages may use the privileged IPC channels. */
const fromApp = (event) => isAppUrl(event.senderFrame?.url ?? '');

function handle(channel, fn) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!fromApp(event)) {
      throw new Error('Unauthorized');
    }
    return fn(...args, event);
  });
}

// High-frequency one-way messages (audio) use send/on rather than invoke
function listen(channel, fn) {
  ipcMain.on(channel, (event, ...args) => {
    if (fromApp(event)) fn(...args);
  });
}

handle('secrets:has', (name) => secrets.hasSecret(name));
handle('secrets:set', (name, value) => secrets.setSecret(name, value));
handle('secrets:clear', (name) => secrets.clearSecret(name));
handle('secrets:fetch', (name, request) => secrets.fetchWithSecret(name, request));

handle('library:get-folder', () => library.getFolder());
handle('library:choose-folder', () => library.chooseFolder());
handle('library:forget-folder', () => library.forgetFolder());
handle('library:list', (dir) => library.list(dir));
handle('library:read', (path) => library.read(path));
handle('library:write', (path, text) => library.write(path, text));

handle('propresenter:status', (connection) => proPresenter.status(connection));
handle('propresenter:themes', (connection) => proPresenter.themeSlides(connection));
handle('propresenter:create-message', (connection, theme) => proPresenter.createMessage(connection, theme));
handle('propresenter:show', (connection, verse) => proPresenter.showVerse(connection, verse));
handle('propresenter:clear', (connection, options) => proPresenter.clear(connection, options));

handle('network:configure', (options) => network.configure(options ?? {}));
handle('network:status', () => network.status());
handle('network:has-media', (id) => network.hasMedia(id));
handle('network:put-media', (id, mime, bytes) => network.putMedia(id, mime, bytes));
listen('network:publish', (state) => network.publish(state));

handle('screens:displays', () => screens.listDisplays());
handle('screens:get', () => screens.getConfig());
handle('screens:set', (config) => screens.setConfig(config));

handle('app:version', () => app.getVersion());
// While listening, the computer must not sleep (it would stop hearing the preacher)
handle('power:listening', (listening, event) => {
  const reason = `listening-${event.sender.id}`;
  keepAwake(reason, Boolean(listening));
  event.sender.once('destroyed', () => keepAwake(reason, false));
});
handle('speech:available', () => speech.isAvailable());
handle('speech:start', (mode, event) => speech.start(event.sender, mode));
listen('speech:audio', (session, samples) => speech.sendAudio(session, samples));
listen('speech:finish', (session) => speech.finish(session));
listen('speech:stop', (session) => speech.stop(session));

/** An app window showing one route (used for the outputs chosen in Settings → Screens). */
function createAppWindow(route, options) {
  const win = new BrowserWindow({ ...options, webPreferences });
  hardenWindow(win);
  if (isDev) win.loadURL(`${DEV_URL}/#${route}`);
  else win.loadFile(join(__dirname, '../dist/index.html'), { hash: route });
  return win;
}

app.whenReady().then(async () => {
  await library.initLibrary();
  if (process.platform === 'darwin') {
    // Prompt for microphone access up front so the first "Start listening" works
    await systemPreferences.askForMediaAccess('microphone').catch(() => false);
  }
  createWindow();
  screens.initScreens(createAppWindow);
  initUpdates();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (!mainWindow) {
    createWindow();
    screens.resumeScreens();
  }
});
