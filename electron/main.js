import { app, BrowserWindow, ipcMain, shell, systemPreferences } from 'electron';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import * as openaiKey from './openaiKey.js';

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
      return { action: 'allow', overrideBrowserWindowOptions: { webPreferences } };
    }
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  win.webContents.on('did-create-window', hardenWindow);

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
  });
}

/** Only our own pages may use the privileged IPC channels. */
function handle(channel, fn) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isAppUrl(event.senderFrame?.url ?? '')) {
      throw new Error('Unauthorized');
    }
    return fn(...args);
  });
}

handle('openai:has-key', () => openaiKey.hasKey());
handle('openai:set-key', (key) => openaiKey.setKey(key));
handle('openai:clear-key', () => openaiKey.clearKey());
handle('openai:create-client-secret', (session) => openaiKey.createClientSecret(session));

app.whenReady().then(async () => {
  if (process.platform === 'darwin') {
    // Prompt for microphone access up front so the first "Start listening" works
    await systemPreferences.askForMediaAccess('microphone').catch(() => false);
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
