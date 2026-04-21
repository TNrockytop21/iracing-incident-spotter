import React, { useEffect, useState, useCallback, useMemo } from 'react';
import FilterBar from './components/FilterBar.jsx';
import IncidentFeed from './components/IncidentFeed.jsx';
import BookmarkPanel from './components/BookmarkPanel.jsx';
import DriverHistoryPanel from './components/DriverHistoryPanel.jsx';
import { generateFakeBatch, generateFakeIncident, resetFakeState } from './lib/demoData.js';

const BOOKMARKS_KEY = 'spotter.bookmarks.v1';
const BOOKMARKS_VISIBLE_KEY = 'spotter.bookmarksVisible.v1';

function loadBookmarksVisible() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_VISIBLE_KEY);
    if (raw === null) return true;
    return raw === '1';
  } catch {
    return true;
  }
}

function loadBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks) {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch {}
}

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [bookmarks, setBookmarks] = useState(loadBookmarks);
  const [selectedCats, setSelectedCats] = useState(() => new Set());
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [bookmarksVisible, setBookmarksVisible] = useState(loadBookmarksVisible);
  const [status, setStatus] = useState({ connected: false, error: null });
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(BOOKMARKS_VISIBLE_KEY, bookmarksVisible ? '1' : '0');
    } catch {}
  }, [bookmarksVisible]);

  const toggleCategory = useCallback((key) => {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearCategories = useCallback(() => {
    setSelectedCats(new Set());
  }, []);

  const spotter = typeof window !== 'undefined' ? window.spotter : null;

  useEffect(() => {
    if (!spotter) {
      setStatus({ connected: false, error: 'Running outside Electron — SDK unavailable' });
      return;
    }
    const offInc = spotter.onIncident((payload) => {
      setIncidents((prev) => [payload, ...prev].slice(0, 500));
    });
    const offStatus = spotter.onStatus((payload) => {
      setStatus(payload);
    });
    const offReset = spotter.onSessionReset(() => {
      setIncidents([]);
    });
    return () => {
      offInc?.();
      offStatus?.();
      offReset?.();
    };
  }, [spotter]);

  useEffect(() => {
    saveBookmarks(bookmarks);
  }, [bookmarks]);

  const handleJump = useCallback(
    async (incident) => {
      if (!spotter) {
        setFlash({ kind: 'error', text: 'iRacing SDK not available' });
        setTimeout(() => setFlash(null), 2000);
        return;
      }
      const res = await spotter.replayJump(incident.sessionNum ?? 0, incident.sessionTime, 3);
      if (res?.ok) {
        setFlash({ kind: 'ok', text: `Jumped replay to ${incident.userName} @ ${res.jumpedTo.toFixed(1)}s` });
      } else {
        setFlash({ kind: 'error', text: res?.error || 'Replay jump failed' });
      }
      setTimeout(() => setFlash(null), 2000);
    },
    [spotter],
  );

  const handleBookmark = useCallback((incident) => {
    setBookmarks((prev) => {
      if (prev.some((b) => b.id === incident.id)) return prev;
      return [{ ...incident, bookmarkedAt: Date.now() }, ...prev];
    });
  }, []);

  const handleRemoveBookmark = useCallback((id) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleClearAllBookmarks = useCallback(() => {
    if (confirm('Clear all bookmarks?')) setBookmarks([]);
  }, []);

  const handleClearFeed = useCallback(() => {
    setIncidents([]);
    resetFakeState();
  }, []);

  const handleDemoBatch = useCallback(() => {
    const batch = generateFakeBatch(15);
    setIncidents((prev) => [...batch, ...prev].slice(0, 500));
  }, []);

  const handleDemoOne = useCallback(() => {
    const one = generateFakeIncident(0);
    setIncidents((prev) => [one, ...prev].slice(0, 500));
  }, []);

  const filteredIncidents = useMemo(() => {
    const base =
      selectedCats.size === 0
        ? incidents
        : incidents.filter((i) => selectedCats.has(String(i.category)));
    if (sortOrder === 'oldest') {
      return [...base].sort((a, b) => a.detectedAt - b.detectedAt);
    }
    return [...base].sort((a, b) => b.detectedAt - a.detectedAt);
  }, [incidents, selectedCats, sortOrder]);

  const counts = useMemo(() => {
    const c = { all: incidents.length, 1: 0, 2: 0, 4: 0 };
    for (const i of incidents) c[i.category] = (c[i.category] || 0) + 1;
    return c;
  }, [incidents]);

  const bookmarkedIds = useMemo(() => new Set(bookmarks.map((b) => b.id)), [bookmarks]);

  const driverIncidents = useMemo(() => {
    if (!selectedDriver) return [];
    return incidents.filter((i) => i.userName === selectedDriver);
  }, [incidents, selectedDriver]);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logoDot} />
          <div>
            <div style={styles.title}>Incident Spotter</div>
            <div style={styles.subtitle}>Live iRacing incident feed</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          {flash && (
            <div style={{ ...styles.flash, ...(flash.kind === 'error' ? styles.flashError : styles.flashOk) }}>
              {flash.text}
            </div>
          )}
          <StatusPill connected={status.connected} error={status.error} />
          <button
            style={{
              ...styles.bookmarkToggle,
              ...(bookmarksVisible ? styles.bookmarkToggleActive : {}),
            }}
            onClick={() => setBookmarksVisible((v) => !v)}
            title={bookmarksVisible ? 'Hide bookmarks panel' : 'Show bookmarks panel'}
          >
            <span style={styles.bookmarkToggleStar}>★</span>
            <span>{bookmarks.length}</span>
            <span style={styles.bookmarkToggleChevron}>{bookmarksVisible ? '›' : '‹'}</span>
          </button>
        </div>
      </header>

      <div style={styles.body}>
        <section style={styles.feedPanel}>
          <div style={styles.panelHeader}>
            <FilterBar
              selected={selectedCats}
              onToggle={toggleCategory}
              onClear={clearCategories}
              counts={counts}
            />
            <div style={styles.panelHeaderActions}>
              <button
                style={styles.sortBtn}
                onClick={() => setSortOrder((o) => (o === 'newest' ? 'oldest' : 'newest'))}
                title={sortOrder === 'newest' ? 'Sorting: newest first (click for oldest)' : 'Sorting: oldest first (click for newest)'}
              >
                <span style={styles.sortArrow}>{sortOrder === 'newest' ? '↓' : '↑'}</span>
                <span>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
              </button>
              {!status.connected && (
                <>
                  <button style={styles.demoBtn} onClick={handleDemoBatch} title="Add 15 fake incidents">+15 demo</button>
                  <button style={styles.demoBtn} onClick={handleDemoOne} title="Add 1 fake incident">+1 demo</button>
                </>
              )}
              <button style={styles.clearBtn} onClick={handleClearFeed}>Clear feed</button>
            </div>
          </div>
          <IncidentFeed
            incidents={filteredIncidents}
            onJump={handleJump}
            onBookmark={handleBookmark}
            onSelectDriver={setSelectedDriver}
            bookmarkedIds={bookmarkedIds}
          />
        </section>

        {bookmarksVisible && (
          <section style={styles.bookmarkPanel}>
            <BookmarkPanel
              bookmarks={bookmarks}
              onJump={handleJump}
              onRemove={handleRemoveBookmark}
              onClearAll={handleClearAllBookmarks}
            />
          </section>
        )}
      </div>

      {selectedDriver && (
        <DriverHistoryPanel
          driver={selectedDriver}
          incidents={driverIncidents}
          bookmarkedIds={bookmarkedIds}
          onJump={handleJump}
          onBookmark={handleBookmark}
          onClose={() => setSelectedDriver(null)}
        />
      )}
    </div>
  );
}

function StatusPill({ connected, error }) {
  const color = connected ? '#22c55e' : error ? '#ef4444' : '#f59e0b';
  const label = connected ? 'iRacing Connected' : error ? 'SDK Error' : 'Waiting for iRacing';
  return (
    <div style={styles.statusPill} title={error || ''}>
      <div style={{ ...styles.statusDot, background: color }} />
      <span>{label}</span>
    </div>
  );
}

const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    background: '#0a0a0c',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 18px',
    borderBottom: '1px solid #1a1a1d',
    background: '#0d0d10',
    flexShrink: 0,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 12 },
  logoDot: {
    width: 10, height: 10, borderRadius: '50%',
    background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
    boxShadow: '0 0 8px rgba(239,68,68,0.5)',
  },
  title: { fontSize: 14, fontWeight: 600, color: '#f4f4f5', letterSpacing: 0.2 },
  subtitle: { fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.8 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  statusPill: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 12px',
    background: '#18181b', border: '1px solid #27272a',
    borderRadius: 20, fontSize: 11, color: '#d4d4d8',
  },
  statusDot: { width: 7, height: 7, borderRadius: '50%' },
  flash: {
    padding: '6px 12px', borderRadius: 4, fontSize: 11,
    fontVariantNumeric: 'tabular-nums',
  },
  flashOk: { background: 'rgba(34,197,94,0.15)', color: '#86efac', border: '1px solid rgba(34,197,94,0.3)' },
  flashError: { background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' },
  body: { flex: 1, display: 'flex', overflow: 'hidden' },
  feedPanel: {
    flex: 2, display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  bookmarkPanel: {
    flex: 1, display: 'flex', flexDirection: 'column',
    minWidth: 280, maxWidth: 380, overflow: 'hidden',
    borderLeft: '1px solid #1a1a1d',
  },
  bookmarkToggle: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 10px',
    background: '#18181b', border: '1px solid #27272a',
    borderRadius: 4, fontSize: 11, color: '#a1a1aa',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: 0.3,
    userSelect: 'none',
  },
  bookmarkToggleActive: {
    background: 'rgba(251,191,36,0.10)',
    border: '1px solid rgba(251,191,36,0.5)',
    color: '#fbbf24',
  },
  bookmarkToggleStar: { fontSize: 12, lineHeight: 1 },
  bookmarkToggleChevron: { fontSize: 13, color: '#71717a', marginLeft: 2 },
  panelHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', borderBottom: '1px solid #1a1a1d', background: '#0d0d10',
    flexShrink: 0,
  },
  clearBtn: {
    padding: '5px 10px', fontSize: 10,
    background: 'transparent', color: '#71717a',
    border: '1px solid #27272a', borderRadius: 4,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  panelHeaderActions: { display: 'flex', gap: 6, alignItems: 'center' },
  sortBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 10px', fontSize: 10,
    background: '#18181b', color: '#d4d4d8',
    border: '1px solid #27272a', borderRadius: 4,
    textTransform: 'uppercase', letterSpacing: 0.5,
    fontVariantNumeric: 'tabular-nums',
  },
  sortArrow: { fontSize: 12, color: '#a1a1aa', lineHeight: 1 },
  demoBtn: {
    padding: '5px 10px', fontSize: 10,
    background: 'rgba(168,85,247,0.10)',
    color: '#c4b5fd',
    border: '1px solid rgba(168,85,247,0.4)',
    borderRadius: 4,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
};
