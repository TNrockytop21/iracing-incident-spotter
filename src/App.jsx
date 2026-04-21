import React, { useEffect, useState, useCallback, useMemo } from 'react';
import FilterBar from './components/FilterBar.jsx';
import IncidentFeed from './components/IncidentFeed.jsx';
import BookmarkPanel from './components/BookmarkPanel.jsx';

const BOOKMARKS_KEY = 'spotter.bookmarks.v1';

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
  const [filter, setFilter] = useState('all');
  const [status, setStatus] = useState({ connected: false, error: null });
  const [flash, setFlash] = useState(null);

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
  }, []);

  const filteredIncidents = useMemo(() => {
    if (filter === 'all') return incidents;
    const n = Number(filter);
    return incidents.filter((i) => i.category === n);
  }, [incidents, filter]);

  const counts = useMemo(() => {
    const c = { all: incidents.length, 1: 0, 2: 0, 4: 0 };
    for (const i of incidents) c[i.category] = (c[i.category] || 0) + 1;
    return c;
  }, [incidents]);

  const bookmarkedIds = useMemo(() => new Set(bookmarks.map((b) => b.id)), [bookmarks]);

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
          <StatusPill connected={status.connected} error={status.error} />
          {flash && (
            <div style={{ ...styles.flash, ...(flash.kind === 'error' ? styles.flashError : styles.flashOk) }}>
              {flash.text}
            </div>
          )}
        </div>
      </header>

      <div style={styles.body}>
        <section style={styles.feedPanel}>
          <div style={styles.panelHeader}>
            <FilterBar filter={filter} onChange={setFilter} counts={counts} />
            <button style={styles.clearBtn} onClick={handleClearFeed}>Clear feed</button>
          </div>
          <IncidentFeed
            incidents={filteredIncidents}
            onJump={handleJump}
            onBookmark={handleBookmark}
            bookmarkedIds={bookmarkedIds}
          />
        </section>

        <section style={styles.bookmarkPanel}>
          <BookmarkPanel
            bookmarks={bookmarks}
            onJump={handleJump}
            onRemove={handleRemoveBookmark}
            onClearAll={handleClearAllBookmarks}
          />
        </section>
      </div>
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
    borderRight: '1px solid #1a1a1d', overflow: 'hidden',
  },
  bookmarkPanel: {
    flex: 1, display: 'flex', flexDirection: 'column',
    minWidth: 320, overflow: 'hidden',
  },
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
};
