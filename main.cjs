const { app, BrowserWindow, autoUpdater, ipcMain, desktopCapturer, Menu } = require('electron');
const path = require('path');

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('mshb', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('mshb')
}


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

// GPU acceleration and WebRTC optimization flags — must be set before app.whenReady()
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('webrtc-max-cpu-consumption-percentage', '100');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('enable-features',
  'VaapiVideoDecoder,VaapiVideoEncoder,VaapiIgnoreDriverChecks,' +
  'WebRTCPipeWireCapturer,CanvasOopRasterization,' +
  'PlatformHEVCEncoderSupport,PlatformHEVCDecoderSupport'
);

// Completely remove the default menu for the entire application
Menu.setApplicationMenu(null);


let mainWindow;
let splashWindow = null;
let mainWindowReady = false;
let updatePhaseComplete = false;
let simInterval = null;

function createSplashWindow() {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body {
    width:400px; height:400px;
    background:#ffffff; overflow:hidden;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    -webkit-app-region:drag;
  }
  .wrapper {
    width:100%; height:100%;
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    padding: 0 40px;
    gap:10px;
  }
  #status {
    font-size:15px; color:#888888;
    letter-spacing:0.4px; user-select:none;
  }
  .track {
    width:100%; height:4px;
    background:#e0e0e0; border-radius:2px; overflow:hidden;
  }
  #fill {
    height:100%; width:0%;
    background:linear-gradient(90deg,#5865F2,#7289DA);
    border-radius:2px; transition:width 0.18s ease;
  }
</style>
</head>
<body>
  <div class="wrapper">
    <span id="status">Starting MSHB...</span>
    <div class="track"><div id="fill"></div></div>
  </div>
  <script>
    function updateProgress(pct, text) {
      document.getElementById('fill').style.width = pct + '%';
      document.getElementById('status').textContent = text;
    }
  </script>
</body>
</html>`;

  const win = new BrowserWindow({
    width: 400,
    height: 400,
    frame: false,
    transparent: false,
    backgroundColor: '#ffffff',
    alwaysOnTop: true,
    center: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: false },
  });

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  win.show();
  return win;
}

function sendToSplash(pct, text) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents
      .executeJavaScript(`updateProgress(${pct}, ${JSON.stringify(text)})`)
      .catch(() => {});
  }
}

function startSimulatedProgress() {
  let pct = 0;
  simInterval = setInterval(() => {
    pct = Math.min(pct + 2, 90);
    sendToSplash(pct, 'Starting MSHB...');
    if (pct >= 90) clearInterval(simInterval);
  }, 60);
}

function finishAndShow() {
  if (simInterval) { clearInterval(simInterval); simInterval = null; }
  sendToSplash(100, 'Starting MSHB...');
  setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    if (mainWindow) {
      mainWindow.show();
      // Handle cold-start deep link (app launched via mshb:// while it was closed)
      const deepLinkArg = process.argv.find(arg => arg.startsWith('mshb://'));
      if (deepLinkArg) {
        setTimeout(() => mainWindow.webContents.send('on-deep-link', deepLinkArg), 600);
      }
    }
  }, 350);
}

function tryShowMain() {
  if (mainWindowReady && updatePhaseComplete) finishAndShow();
}

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
      backgroundThrottling: false,
    },
  });

  // This removes the "File, Edit, View, etc." tabs from the window
  mainWindow.removeMenu();

  mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  
  mainWindow.once('ready-to-show', () => {
    mainWindowReady = true;
    tryShowMain();
  });
}

// --- IPC Communication for Updates ---
autoUpdater.on('checking-for-update', () => {
  sendToSplash(0, 'Checking for updates...');
});

autoUpdater.on('update-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-available');
  sendToSplash(0, 'Downloading Recent Updates...');
});

autoUpdater.on('update-not-available', () => {
  startSimulatedProgress();
  updatePhaseComplete = true;
  tryShowMain();
});

autoUpdater.on('download-progress', (info) => {
  sendToSplash(Math.round(info.percent), 'Downloading Recent Updates...');
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) mainWindow.webContents.send('update-downloaded');
  sendToSplash(100, 'Downloading Recent Updates...');
  updatePhaseComplete = true;
  tryShowMain();
});

autoUpdater.on('error', () => {
  updatePhaseComplete = true;
  tryShowMain();
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

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      
      // Catch the URL from the command line
      const url = commandLine.pop();
      if (url.includes('mshb://')) {
        mainWindow.webContents.send('on-deep-link', url);
      }
    }
  });
}

// Handle MacOS deep links
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) {
    mainWindow.webContents.send('on-deep-link', url);
  }
});

app.whenReady().then(() => {
  splashWindow = createSplashWindow();
  createWindow();

  if (app.isPackaged) {
    const server = 'https://update.electronjs.org';
    const repo = 'SEFR-SA/mshb';
    const feed = `${server}/${repo}/${process.platform}-${process.arch}/${app.getVersion()}`;
    try {
      autoUpdater.setFeedURL({ url: feed });
      setInterval(() => autoUpdater.checkForUpdates(), 60 * 60 * 1000);
      autoUpdater.checkForUpdates();
    } catch (err) {
      console.error('Update initialization error:', err);
      updatePhaseComplete = true;
      startSimulatedProgress();
      tryShowMain();
    }
  } else {
    // Dev mode: no updates, simulate progress
    updatePhaseComplete = true;
    startSimulatedProgress();
    tryShowMain();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});