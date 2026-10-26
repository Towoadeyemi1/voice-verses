// Preload script: exposes a minimal, typed bridge to the renderer.
// Must be CommonJS because sandboxed preloads cannot be ES modules.
const { contextBridge, ipcRenderer } = require('electron');

// ipcRenderer.invoke wraps errors as "Error invoking remote method 'x': Error: msg"; keep just "msg"
const invoke = (channel, ...args) =>
  ipcRenderer.invoke(channel, ...args).catch((error) => {
    throw new Error(String(error?.message ?? error).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));
  });

contextBridge.exposeInMainWorld('voiceVerses', {
  platform: process.platform,
  getVersion: () => invoke('app:version'),
  onUpdateAvailable: (callback) => {
    const listener = (_event, info) => callback(info);
    ipcRenderer.on('app:update-available', listener);
    return () => ipcRenderer.removeListener('app:update-available', listener);
  },
  secrets: {
    has: (name) => invoke('secrets:has', name),
    set: (name, value) => invoke('secrets:set', name, value),
    clear: (name) => invoke('secrets:clear', name),
    fetch: (name, request) => invoke('secrets:fetch', name, request),
  },
  speech: {
    isAvailable: () => invoke('speech:available'),
    start: (mode) => invoke('speech:start', mode),
    sendAudio: (session, samples) => ipcRenderer.send('speech:audio', session, samples),
    finish: (session) => ipcRenderer.send('speech:finish', session),
    stop: (session) => ipcRenderer.send('speech:stop', session),
    onEvent: (callback) => {
      const listener = (_event, message) => callback(message);
      ipcRenderer.on('speech:event', listener);
      return () => ipcRenderer.removeListener('speech:event', listener);
    },
  },
  library: {
    getFolder: () => invoke('library:get-folder'),
    chooseFolder: () => invoke('library:choose-folder'),
    forgetFolder: () => invoke('library:forget-folder'),
    list: (dir) => invoke('library:list', dir),
    read: (path) => invoke('library:read', path),
    write: (path, text) => invoke('library:write', path, text),
    onChange: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('library:changed', listener);
      return () => ipcRenderer.removeListener('library:changed', listener);
    },
  },
});
