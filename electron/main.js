const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// ---------- Crash logging to disk so packaged failures aren't silent ----------
let _logDir = null;
let _logFile = null;

function getLogFile() {
  if (_logFile) return _logFile;
  try {
    _logDir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(_logDir, { recursive: true });
    _logFile = path.join(_logDir, 'main.log');
  } catch {
    _logFile = null;
  }
  return _logFile;
}

function logLine(...parts) {
  const line = `[${new Date().toISOString()}] ${parts.map((p) => (p instanceof Error ? `${p.message}\n${p.stack}` : String(p))).join(' ')}\n`;
  try {
    const f = getLogFile();
    if (f) fs.appendFileSync(f, line);
  } catch {}
  try {
    console.log(line.trim());
  } catch {}
}

process.on('uncaughtException', (err) => {
  logLine('uncaughtException:', err);
  try {
    dialog.showErrorBox('iRacing Incident Spotter — crash', `${err.message}\n\nLog: ${getLogFile()}`);
  } catch {}
});
process.on('unhandledRejection', (reason) => {
  logLine('unhandledRejection:', reason instanceof Error ? reason : new Error(String(reason)));
});

logLine(`startup v${app.getVersion()} packaged=${app.isPackaged}`);

// ---------- Lazily-loaded deps that can fail gracefully ----------
let autoUpdater = null;
try {
  ({ autoUpdater } = require('electron-updater'));
  logLine('electron-updater loaded');
} catch (err) {
  logLine('electron-updater failed to load:', err);
}

// ---------- App state ----------
let mainWindow = null;
let iracing = null;
let lastIncidentByCarIdx = new Map();
let lastSessionTime = 0;
let lastSessionNum = 0;
let lastSessionUniqueID = null;
let driverRoster = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    backgroundColor: '#0a0a0c',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    logLine('renderer gone:', JSON.stringify(details));
  });
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    logLine(`did-fail-load code=${code} desc=${desc} url=${url}`);
  });

  const devUrl = process.env.VITE_DEV_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    logLine(`loading ${indexPath}`);
    mainWindow.loadFile(indexPath).catch((err) => logLine('loadFile failed:', err));
  }
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function initIrsdk() {
  try {
    const irsdk = require('node-irsdk-2023');
    irsdk.init({
      telemetryUpdateInterval: 250,
      sessionInfoUpdateInterval: 1000,
    });
    iracing = irsdk.getInstance();
    logLine('node-irsdk-2023 loaded');
  } catch (err) {
    logLine('[irsdk] load failed — running in mock mode:', err);
    send('irsdk:status', { connected: false, error: 'SDK unavailable' });
    return;
  }

  iracing.on('Connected', () => {
    logLine('[irsdk] connected');
    lastIncidentByCarIdx.clear();
    send('irsdk:status', { connected: true });
  });

  iracing.on('Disconnected', () => {
    logLine('[irsdk] disconnected');
    send('irsdk:status', { connected: false });
  });

  iracing.on('Telemetry', (evt) => {
    // node-irsdk-2023 emits Telemetry as { timestamp, values }
    const v = evt?.values || {};
    if (typeof v.SessionTime === 'number') lastSessionTime = v.SessionTime;
    if (typeof v.SessionNum === 'number') lastSessionNum = v.SessionNum;
  });

  iracing.on('SessionInfo', (evt) => {
    const data = evt.data || evt;
    const weekend = data?.WeekendInfo;
    const drivers = data?.DriverInfo?.Drivers || [];

    const uid = weekend?.SubSessionID ?? weekend?.SessionID ?? null;
    if (uid !== lastSessionUniqueID) {
      lastSessionUniqueID = uid;
      lastIncidentByCarIdx.clear();
      driverRoster.clear();
      send('session:reset', { sessionId: uid });
    }

    for (const d of drivers) {
      if (d.CarIsPaceCar === 1 || d.IsSpectator === 1) continue;
      const carIdx = d.CarIdx;
      const userName = d.UserName || d.TeamName || `Car ${carIdx}`;
      const carNumber = d.CarNumber || '';
      const current = Number(d.CurDriverIncidentCount ?? d.TeamIncidentCount ?? 0);

      driverRoster.set(carIdx, { carIdx, userName, carNumber });

      const prev = lastIncidentByCarIdx.get(carIdx);
      if (prev === undefined) {
        lastIncidentByCarIdx.set(carIdx, current);
        continue;
      }
      const delta = current - prev;
      if (delta > 0) {
        const category = delta >= 4 ? 4 : delta >= 2 ? 2 : 1;
        send('incident:detected', {
          id: `${carIdx}-${Date.now()}`,
          carIdx,
          userName,
          carNumber,
          delta,
          category,
          newCount: current,
          sessionTime: lastSessionTime,
          sessionNum: lastSessionNum,
          detectedAt: Date.now(),
        });
        lastIncidentByCarIdx.set(carIdx, current);
      } else if (delta < 0) {
        lastIncidentByCarIdx.set(carIdx, current);
      }
    }
  });
}

ipcMain.handle('replay:jump', async (_evt, { sessionNum, sessionTime }) => {
  if (!iracing) return { ok: false, error: 'iRacing SDK not available' };
  // Our detection lags the real contact by 1-3s because iRacing refreshes the
  // session YAML roughly once per second. Instead of guessing a lead-in, we
  // overshoot slightly past the detection moment and then ask iRacing itself
  // to snap to the previous incident marker — iRacing knows the exact frame.
  const overshootSeconds = Math.max(0, Number(sessionTime) + 1);
  const targetMs = Math.round(overshootSeconds * 1000);
  // Use the session number recorded at detection. Fall back to the current
  // telemetry session number if the incident didn't capture one (e.g. detected
  // before first telemetry frame).
  const sn = Number.isFinite(sessionNum) ? Number(sessionNum) : lastSessionNum;
  try {
    iracing.playbackControls.searchTs(sn, targetMs);
    // Give iRacing a beat to seek, then snap to the actual incident frame.
    setTimeout(() => {
      try {
        iracing.playbackControls.search('prevIncident');
      } catch (e) {
        logLine('prevIncident search failed:', e);
      }
    }, 300);
    return { ok: true, jumpedTo: overshootSeconds, snappedToIncident: true };
  } catch (err) {
    logLine('replay:jump failed:', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('replay:play', async () => {
  if (!iracing) return { ok: false };
  try {
    iracing.playbackControls?.play?.();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('replay:pause', async () => {
  if (!iracing) return { ok: false };
  try {
    iracing.playbackControls?.pause?.();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

function initAutoUpdater() {
  if (!autoUpdater) return;
  try {
    autoUpdater.logger = { info: (m) => logLine('[updater]', m), warn: (m) => logLine('[updater:warn]', m), error: (m) => logLine('[updater:error]', m), debug: () => {} };
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    const emit = (type, extra = {}) => send('updates:event', { type, ...extra });
    autoUpdater.on('checking-for-update', () => emit('checking'));
    autoUpdater.on('update-available', (info) => emit('available', { version: info?.version }));
    autoUpdater.on('update-not-available', (info) => emit('not-available', { version: info?.version }));
    autoUpdater.on('download-progress', (p) => emit('progress', { percent: Math.round(p.percent) }));
    autoUpdater.on('update-downloaded', (info) => emit('downloaded', { version: info?.version }));
    autoUpdater.on('error', (err) => {
      logLine('[updater:error]', err);
      emit('error', { message: err?.message || String(err) });
    });
  } catch (err) {
    logLine('initAutoUpdater failed:', err);
  }
}

ipcMain.handle('updates:check', async () => {
  if (!autoUpdater || !app.isPackaged) return { ok: false, error: 'Updates unavailable in this build' };
  try {
    const result = await autoUpdater.checkForUpdates();
    return { ok: true, version: result?.updateInfo?.version };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('updates:download', async () => {
  if (!autoUpdater || !app.isPackaged) return { ok: false, error: 'Updates unavailable in this build' };
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('updates:install', async () => {
  if (!autoUpdater || !app.isPackaged) return { ok: false, error: 'Updates unavailable in this build' };
  autoUpdater.quitAndInstall();
  return { ok: true };
});

ipcMain.handle('updates:getCurrentVersion', async () => {
  return { version: app.getVersion() };
});

ipcMain.handle('diag:openLog', async () => {
  try {
    const { shell } = require('electron');
    const f = getLogFile();
    if (!f) return { ok: false, error: 'no log file' };
    await shell.openPath(f);
    return { ok: true, path: f };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

app.whenReady().then(() => {
  try {
    createWindow();
    initIrsdk();
    initAutoUpdater();
  } catch (err) {
    logLine('whenReady failed:', err);
    try {
      dialog.showErrorBox('Startup failed', `${err.message}\n\nLog: ${getLogFile()}`);
    } catch {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
