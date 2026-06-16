const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fifaShow', {
  refreshMatches: (options) => ipcRenderer.invoke('matches:refresh', options),
  refreshStats: (options) => ipcRenderer.invoke('stats:refresh', options),
  getAppState: () => ipcRenderer.invoke('app:get-state'),
  showContextMenu: () => ipcRenderer.send('app:show-context-menu'),
  onRefreshCommand: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('command:refresh', listener);
    return () => ipcRenderer.removeListener('command:refresh', listener);
  },
  onCompactMode: (callback) => {
    const listener = (_event, compactMode) => callback(compactMode);
    ipcRenderer.on('command:compact-mode', listener);
    return () => ipcRenderer.removeListener('command:compact-mode', listener);
  }
});
