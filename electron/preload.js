const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,

  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  showOpenDialog: (opts) => ipcRenderer.invoke('show-open-dialog', opts),

  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),

  onUpdateAvailable: (cb) => {
    const handler = (_, info) => cb(info);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },

  onUpdateDownloaded: (cb) => {
    const handler = (_, info) => cb(info);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },

  setScreenshotConfig: (cfg) => ipcRenderer.send('cms:screenshot-config', cfg),

  pauseScreenshotMonitoring: (durationMs) => ipcRenderer.send('cms:screenshot-pause', { durationMs }),

  onMonitoringStateChange: (cb) => {
    const handler = (_, state) => cb(state);
    ipcRenderer.on('cms:monitoring-state', handler);
    return () => ipcRenderer.removeListener('cms:monitoring-state', handler);
  },

  // Called by WorkSessionContext when the renderer has finished clocking out before quit
  notifyClockOutDone: () => ipcRenderer.send('cms:clock-out-done'),

  // Register a callback that fires just before the app quits (gives renderer a chance to clock out)
  onPreQuit: (cb) => {
    const handler = async () => { await cb(); };
    ipcRenderer.on('cms:pre-quit', handler);
    return () => ipcRenderer.removeListener('cms:pre-quit', handler);
  },
});
