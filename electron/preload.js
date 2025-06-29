const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  // App info
  getVersion: () => process.versions.electron,
  getPlatform: () => process.platform,

  // File operations (if needed for your app)
  openFile: () => ipcRenderer.invoke("open-file"),
  saveFile: (data) => ipcRenderer.invoke("save-file", data),

  // Window controls
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),

  // Environment detection
  isElectron: true,

  // For future use - IPC communication
  sendMessage: (channel, data) => ipcRenderer.send(channel, data),
  onMessage: (channel, callback) => ipcRenderer.on(channel, callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
