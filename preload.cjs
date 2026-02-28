const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onDeepLink: (callback) => ipcRenderer.on('on-deep-link', (_event, value) => callback(value)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  restartApp: () => ipcRenderer.send('restart-app'),
  getDisplaySources: () => ipcRenderer.invoke('get-display-sources'),
  setFullscreen: (flag) => ipcRenderer.invoke('set-fullscreen', flag),
  getFullscreen: () => ipcRenderer.invoke('get-fullscreen'),
  onFullscreenChange: (callback) => {
    const wrapped = (_event, val) => callback(val);
    ipcRenderer.on('fullscreen-changed', wrapped);
    return () => ipcRenderer.removeListener('fullscreen-changed', wrapped);
  },
  setTitleBarColor: (color, symbolColor) => ipcRenderer.send('set-title-bar-color', color, symbolColor),
});