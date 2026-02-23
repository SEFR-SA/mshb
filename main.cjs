const { app, BrowserWindow, autoUpdater, ipcMain, desktopCapturer, Menu } = require('electron');
const path = require('path');
const ChildProcess = require('child_process');

// --- SQUIRREL INSTALLATION & SHORTCUT LOGIC ---
function handleSquirrelEvent() {
  if (process.argv.length === 1) return false;

  const appFolder = path.resolve(process.execPath, '..');
  const rootAtomFolder = path.resolve(appFolder, '..');
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
  const exeName = path.basename(process.execPath);

  const spawn = function(command, args) {
    let spawnedProcess;
    try {
      spawnedProcess = ChildProcess.spawn(command, args, { detached: true });
    } catch (error) {}
    return spawnedProcess;
  };

  const spawnUpdate = function(args) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      spawnUpdate(['--createShortcut', exeName]);
      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-uninstall':
      spawnUpdate(['--removeShortcut', exeName]);
      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-obsolete':
      app.quit();
      return true;
  }
}

if (handleSquirrelEvent()) return;

// Completely remove the default menu for the entire application
Menu.setApplicationMenu(null);

// --- AUTO-UPDATE CONFIGURATION ---
if (app.isPackaged) {
  const server = 'https://update.electronjs.org'; 
  const repo = 'your-github-username/your-repo-name'; 
  const feed = `${server}/${repo}/${process.platform}-${process.arch}/${app.getVersion()}`;

  try {
    autoUpdater.setFeedURL({ url: feed });
    setInterval(() => autoUpdater.checkForUpdates(), 60 * 60 * 1000);
  } catch (err) {
    console.error('Update initialization error:', err);
  }
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    icon: path.join(__dirname, 'assets/icon.ico'), 
    autoHideMenuBar: true, 
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // This removes the "File, Edit, View, etc." tabs from the window
  mainWindow.removeMenu();

  mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (app.isPackaged) autoUpdater.checkForUpdates();
  });
}

// --- IPC Communication for Updates ---
autoUpdater.on('update-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) mainWindow.webContents.send('update-downloaded');
});

ipcMain.handle('get-display-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
  });
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL(),
    displayId: s.display_id,
  }));
});

ipcMain.on('restart-app', () => {
  if (app.isPackaged) {
    try {
      autoUpdater.quitAndInstall();
    } catch (e) {
      app.relaunch();
      app.exit(0);
    }
  } else {
    app.relaunch();
    app.exit(0);
  }
});

if (require('electron-squirrel-startup')) app.quit();

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});