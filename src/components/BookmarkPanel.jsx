import React from 'react';

const CATEGORY_COLOR = { 1: '#60a5fa', 2: '#f59e0b', 4: '#ef4444' };

function formatSessionTime(t) {
  if (!Number.isFinite(t)) return '--:--';
  const m = Math.floor(t / 60);
  const s = (t - m * 60).toFixed(1);
  return `${m}:${s.padStart(4, '0')}`;
}

export default function BookmarkPanel({ bookmarks, onJump, onRemove, onClearAll }) {
  return (
    <>
      <div style={styles.header}>
        <div style={styles.heading}>
          <span style={styles.headingStar}>★</span>
          <span>Bookmarked</span>
          <span style={styles.count}>{bookmarks.length}</span>
        </div>
        {bookmarks.length > 0 && (
          <button style={styles.clearBtn} onClick={onClearAll}>Clear</button>
        )}
      </div>
      {bookmarks.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>No bookmarks</div>
          <div style={styles.emptySub}>
            Tap ☆ on any incident to save it here for later replay.
          </div>
        </div>
      ) : (
        <div style={styles.list}>
          {bookmarks.map((b) => {
            const color = CATEGORY_COLOR[b.category] || '#a1a1aa';
            return (
              <div
                key={b.id}
                style={{ ...styles.row, borderLeft: `3px solid ${color}` }}
                onClick={() => onJump(b)}
                title="Click to jump iRacing replay to this bookmark"
              >
                <div style={{ ...styles.badge, color, borderColor: color }}>+{b.delta}x</div>
                <div style={styles.main}>
                  <div style={styles.driverLine}>
                    {b.carNumber && <span style={styles.carNum}>#{b.carNumber}</span>}
                    <span>{b.userName}</span>
                  </div>
                  <div style={styles.meta}>T {formatSessionTime(b.sessionTime)}</div>
                </div>
                <button
                  style={styles.removeBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(b.id);
                  }}
                  title="Remove bookmark"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

const styles = {
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', borderBottom: '1px solid #1a1a1d',
    background: '#0d0d10', flexShrink: 0,
  },
  heading: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 11, color: '#d4d4d8', textTransform: 'uppercase', letterSpacing: 0.6,
  },
  headingStar: { color: '#fbbf24', fontSize: 13 },
  count: {
    padding: '1px 6px', borderRadius: 8, fontSize: 10,
    background: 'rgba(255,255,255,0.04)', color: '#a1a1aa',
  },
  clearBtn: {
    padding: '4px 10px', fontSize: 10,
    background: 'transparent', color: '#71717a',
    border: '1px solid #27272a', borderRadius: 4,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  list: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  empty: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    color: '#52525b', padding: 30, textAlign: 'center',
  },
  emptyTitle: { fontSize: 13, color: '#a1a1aa', marginBottom: 4 },
  emptySub: { fontSize: 11, maxWidth: 260, lineHeight: 1.5 },
  row: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px', margin: '0 8px 4px',
    background: '#18181b', borderRadius: 4,
    cursor: 'pointer', fontVariantNumeric: 'tabular-nums',
  },
  badge: {
    padding: '3px 7px', borderRadius: 3, fontSize: 10,
    fontWeight: 600, border: '1px solid', flexShrink: 0,
    minWidth: 34, textAlign: 'center',
  },
  main: { flex: 1, minWidth: 0 },
  driverLine: {
    display: 'flex', alignItems: 'baseline', gap: 6,
    fontSize: 12, color: '#e4e4e7',
    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
  },
  carNum: {
    fontSize: 9, color: '#71717a', background: '#0a0a0c',
    padding: '1px 5px', borderRadius: 3, fontWeight: 600,
  },
  meta: { fontSize: 10, color: '#71717a', marginTop: 1 },
  removeBtn: {
    width: 22, height: 22, padding: 0,
    background: 'transparent', border: '1px solid #27272a',
    borderRadius: 3, color: '#71717a', fontSize: 14, lineHeight: 1,
    flexShrink: 0,
  },
};
