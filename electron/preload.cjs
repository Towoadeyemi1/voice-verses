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
  openai: {
    hasApiKey: () => invoke('openai:has-key'),
    setApiKey: (key) => invoke('openai:set-key', key),
    clearApiKey: () => invoke('openai:clear-key'),
    createClientSecret: (session) => invoke('openai:create-client-secret', session),
  },
});
