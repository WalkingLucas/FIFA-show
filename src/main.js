const path = require('node:path');
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const { MatchService } = require('./services/matchService');
const { StatsService } = require('./services/statsService');
const { MatchDetailService } = require('./services/matchDetailService');

let mainWindow;
let matchService;
let statsService;
let matchDetailService;
let compactMode = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 360,
    height: 160,
    minWidth: 320,
    minHeight: 104,
    resizable: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setMenu(null);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

function popupContextMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: '\u5237\u65b0',
      click: () => mainWindow?.webContents.send('command:refresh')
    },
    {
      label: compactMode ? '\u9000\u51fa\u7d27\u51d1\u6a21\u5f0f' : '\u5207\u6362\u7d27\u51d1\u6a21\u5f0f',
      click: () => {
        compactMode = !compactMode;
        mainWindow?.setSize(compactMode ? 320 : 360, compactMode ? 104 : 160);
        mainWindow?.webContents.send('command:compact-mode', compactMode);
      }
    },
    { type: 'separator' },
    {
      label: '\u9000\u51fa',
      click: () => app.quit()
    }
  ]);

  menu.popup({ window: mainWindow });
}

app.whenReady().then(() => {
  const cacheDir = path.join(app.getPath('userData'), 'cache');
  matchService = new MatchService({ cacheDir });
  statsService = new StatsService({ cacheDir, matchService });
  matchDetailService = new MatchDetailService({ cacheDir });

  ipcMain.handle('matches:refresh', (_event, options = {}) => {
    return matchService.getMatches(options);
  });

  ipcMain.handle('stats:refresh', (_event, options = {}) => {
    return statsService.getStats(options);
  });

  ipcMain.handle('match-detail:refresh', (_event, options = {}) => {
    return matchDetailService.getMatchDetail(options);
  });

  ipcMain.handle('app:get-state', () => ({
    compactMode
  }));

  ipcMain.on('app:show-context-menu', popupContextMenu);

  createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});
