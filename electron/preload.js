const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('spotter', {
  onIncident: (handler) => {
    const wrapped = (_evt, payload) => handler(payload);
    ipcRenderer.on('incident:detected', wrapped);
    return () => ipcRenderer.removeListener('incident:detected', wrapped);
  },
  onStatus: (handler) => {
    const wrapped = (_evt, payload) => handler(payload);
    ipcRenderer.on('irsdk:status', wrapped);
    return () => ipcRenderer.removeListener('irsdk:status', wrapped);
  },
  onSessionReset: (handler) => {
    const wrapped = (_evt, payload) => handler(payload);
    ipcRenderer.on('session:reset', wrapped);
    return () => ipcRenderer.removeListener('session:reset', wrapped);
  },
  replayJump: (sessionNum, sessionTime, leadInSeconds) =>
    ipcRenderer.invoke('replay:jump', { sessionNum, sessionTime, leadInSeconds }),
  replayPlay: () => ipcRenderer.invoke('replay:play'),
  replayPause: () => ipcRenderer.invoke('replay:pause'),

  onUpdateEvent: (handler) => {
    const wrapped = (_evt, payload) => handler(payload);
    ipcRenderer.on('updates:event', wrapped);
    return () => ipcRenderer.removeListener('updates:event', wrapped);
  },
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  getAppVersion: () => ipcRenderer.invoke('updates:getCurrentVersion'),
});
