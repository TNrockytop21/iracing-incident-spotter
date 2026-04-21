import React from 'react';

const CATEGORY_STYLE = {
  1: { bg: 'rgba(96,165,250,0.08)', border: '#60a5fa', text: '#60a5fa' },
  2: { bg: 'rgba(245,158,11,0.10)', border: '#f59e0b', text: '#f59e0b' },
  4: { bg: 'rgba(239,68,68,0.12)', border: '#ef4444', text: '#ef4444' },
};

function formatSessionTime(t) {
  if (!Number.isFinite(t)) return '--:--';
  const m = Math.floor(t / 60);
  const s = (t - m * 60).toFixed(1);
  return `${m}:${s.padStart(4, '0')}`;
}

function timeAgo(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

export default function IncidentRow({ incident, onJump, onBookmark, bookmarked }) {
  const cat = CATEGORY_STYLE[incident.category] || CATEGORY_STYLE[1];
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const id = setInterval(force, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        ...styles.row,
        borderLeft: `3px solid ${cat.border}`,
        background: cat.bg,
      }}
      onClick={() => onJump(incident)}
      title="Click to jump iRacing replay to this moment"
    >
      <div style={{ ...styles.badge, background: cat.border + '22', color: cat.text, borderColor: cat.border }}>
        +{incident.delta}x
      </div>
      <div style={styles.main}>
        <div style={styles.driverLine}>
          {incident.carNumber && <span style={styles.carNum}>#{incident.carNumber}</span>}
          <span style={styles.driverName}>{incident.userName}</span>
          <span style={styles.totalCount}>· total {incident.newCount}x</span>
        </div>
        <div style={styles.meta}>
          <span>T {formatSessionTime(incident.sessionTime)}</span>
          <span style={styles.dot}>·</span>
          <span>{timeAgo(incident.detectedAt)}</span>
        </div>
      </div>
      <div style={styles.actions} onClick={(e) => e.stopPropagation()}>
        <button
          style={{ ...styles.actionBtn, ...(bookmarked ? styles.actionBtnActive : {}) }}
          onClick={() => onBookmark(incident)}
          title={bookmarked ? 'Already bookmarked' : 'Bookmark for later'}
        >
          {bookmarked ? '★' : '☆'}
        </button>
        <button
          style={styles.actionBtn}
          onClick={() => onJump(incident)}
          title="Jump replay to this moment"
        >
          ▶
        </button>
      </div>
    </div>
  );
}

const styles = {
  row: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px',
    margin: '0 8px 4px',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'background 120ms',
    fontVariantNumeric: 'tabular-nums',
  },
  badge: {
    padding: '4px 8px', borderRadius: 3, fontSize: 11,
    fontWeight: 600, letterSpacing: 0.4,
    border: '1px solid', flexShrink: 0, minWidth: 38, textAlign: 'center',
  },
  main: { flex: 1, minWidth: 0 },
  driverLine: {
    display: 'flex', alignItems: 'baseline', gap: 6,
    fontSize: 13, color: '#f4f4f5', marginBottom: 2,
    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
  },
  carNum: {
    fontSize: 10, color: '#71717a', background: '#18181b',
    padding: '1px 5px', borderRadius: 3, fontWeight: 600,
  },
  driverName: { fontWeight: 500 },
  totalCount: { fontSize: 10, color: '#71717a' },
  meta: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#71717a' },
  dot: { color: '#3f3f46' },
  actions: { display: 'flex', gap: 4, flexShrink: 0 },
  actionBtn: {
    width: 26, height: 26, padding: 0,
    background: 'transparent', border: '1px solid #27272a',
    borderRadius: 3, color: '#a1a1aa', fontSize: 12,
  },
  actionBtnActive: { color: '#fbbf24', borderColor: '#fbbf24' },
};
