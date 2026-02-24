const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onDeepLink: (callback) => ipcRenderer.on('on-deep-link', (_event, value) => callback(value)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  restartApp: () => ipcRenderer.send('restart-app'),
  getDisplaySources: () => ipcRenderer.invoke('get-display-sources'),
});