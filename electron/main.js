const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const isDev = !app.isPackaged;
const { autoUpdater } = require("electron-updater");

// For production, we need to start a Next.js server
let nextServer = null;
const serverPort = 3001;

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow;

// Function to start Next.js server in production
async function startNextServer() {
  if (isDev) {
    return "http://localhost:3000"; // Development server
  }

  try {
    // Import Next.js in production
    const next = require("next");
    const nextApp = next({
      dev: false,
      dir: path.join(__dirname, ".."),
    });

    await nextApp.prepare();

    // Create HTTP server
    const { createServer } = require("http");
    const handle = nextApp.getRequestHandler();

    nextServer = createServer((req, res) => {
      handle(req, res);
    });

    // Start server
    await new Promise((resolve, reject) => {
      nextServer.listen(serverPort, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log(`Next.js server started on port ${serverPort}`);
    return `http://localhost:${serverPort}`;
  } catch (error) {
    console.error("Failed to start Next.js server:", error);
    throw error;
  }
}

async function createWindow() {
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

  try {
    // Start Next.js server and get URL
    const serverUrl = await startNextServer();

    // Load the Next.js app
    await mainWindow.loadURL(serverUrl);
  } catch (error) {
    console.error("Failed to load application:", error);
    // Fallback: try to load a simple error page
    mainWindow.loadFile(path.join(__dirname, "error.html"));
  }

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
app.whenReady().then(async () => {
  if (!isDev) {
    autoUpdater.checkForUpdates();
  }
  await createWindow();
});

app.on("window-all-closed", () => {
  // Clean up Next.js server
  if (nextServer) {
    nextServer.close();
    nextServer = null;
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});

// Clean up on quit
app.on("before-quit", () => {
  if (nextServer) {
    nextServer.close();
    nextServer = null;
  }
});
