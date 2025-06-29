const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const isDev = !app.isPackaged;
const { autoUpdater } = require("electron-updater");

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false, // Needed for local file access
    },
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    autoHideMenuBar: true, // Hide menu bar by default (can still access with Alt key)
    // frame: false, // Uncomment for completely frameless window with custom title bar
    show: false, // Don't show until ready
  });

  // Show window when ready to prevent visual flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Load the Next.js app
  const startUrl = isDev
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "../out/index.html")}`;

  mainWindow.loadURL(startUrl);

  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require("electron").shell.openExternal(url);
    return { action: "deny" };
  });
}

// IPC Handlers
ipcMain.handle("open-file", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "All Files", extensions: ["*"] }],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return { filePath, fileContent };
  }
  return null;
});

ipcMain.handle("save-file", async (event, data) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: "Text Files", extensions: ["txt"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, data);
    return result.filePath;
  }
  return null;
});

// Window controls
ipcMain.on("window-minimize", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on("window-maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on("window-close", () => {
  if (mainWindow) mainWindow.close();
});

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
