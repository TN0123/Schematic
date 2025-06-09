const { app, BrowserWindow } = require("electron");
const path = require("path");
const isDev = !app.isPackaged;
const { autoUpdater } = require("electron-updater");

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Load the Next.js app
  const startUrl = isDev
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "../.next/server/pages/index.html")}`;

  mainWindow.loadURL(startUrl);

  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

// Add auto-update handlers
autoUpdater.on("checking-for-update", () => {
  console.log("Checking for updates...");
});

autoUpdater.on("update-available", (info) => {
  console.log("Update available:", info);
  autoUpdater.downloadUpdate();
});

autoUpdater.on("update-not-available", (info) => {
  console.log("Update not available:", info);
});

autoUpdater.on("error", (err) => {
  console.error("Error in auto-updater:", err);
});

autoUpdater.on("download-progress", (progressObj) => {
  console.log("Download progress:", progressObj);
});

autoUpdater.on("update-downloaded", (info) => {
  console.log("Update downloaded:", info);
});

// Check for updates when app is ready
app.whenReady().then(() => {
  if (!isDev) {
    autoUpdater.checkForUpdates();
  }
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
