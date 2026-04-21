const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

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

  const devUrl = process.env.VITE_DEV_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
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
  } catch (err) {
    console.error('[irsdk] load failed — running in mock mode:', err.message);
    send('irsdk:status', { connected: false, error: 'SDK unavailable (non-Windows or not installed)' });
    return;
  }

  iracing.on('Connected', () => {
    console.log('[irsdk] connected');
    lastIncidentByCarIdx.clear();
    send('irsdk:status', { connected: true });
  });

  iracing.on('Disconnected', () => {
    console.log('[irsdk] disconnected');
    send('irsdk:status', { connected: false });
  });

  iracing.on('Telemetry', (evt) => {
    const v = evt.values || evt;
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

ipcMain.handle('replay:jump', async (_evt, { sessionNum, sessionTime, leadInSeconds = 3 }) => {
  if (!iracing) return { ok: false, error: 'iRacing SDK not available' };
  const target = Math.max(0, Number(sessionTime) - Number(leadInSeconds));
  try {
    if (iracing.playbackControls?.searchTs) {
      iracing.playbackControls.searchTs(Number(sessionNum) || 0, target);
    } else if (iracing.execCmd) {
      iracing.execCmd('ReplaySearchSessionTime', target);
    } else {
      return { ok: false, error: 'No replay API on irsdk instance' };
    }
    return { ok: true, jumpedTo: target };
  } catch (err) {
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

app.whenReady().then(() => {
  createWindow();
  initIrsdk();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
