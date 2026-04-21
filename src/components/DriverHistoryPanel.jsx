import React, { useEffect } from 'react';

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

export default function DriverHistoryPanel({
  driver,
  incidents,
  onClose,
  onJump,
  onBookmark,
  bookmarkedIds,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!driver) return null;

  const sorted = [...incidents].sort((a, b) => b.sessionTime - a.sessionTime);
  const total = sorted.reduce((s, i) => s + i.delta, 0);
  const latest = sorted[0];
  const counts = { 1: 0, 2: 0, 4: 0 };
  for (const i of sorted) counts[i.category] = (counts[i.category] || 0) + 1;

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <aside style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerMain}>
            <div style={styles.headerName}>
              {latest?.carNumber && <span style={styles.carNum}>#{latest.carNumber}</span>}
              <span>{driver}</span>
            </div>
            <div style={styles.headerMeta}>
              <span style={styles.totalPill}>{total}x total</span>
              <span style={styles.dim}>· {sorted.length} {sorted.length === 1 ? 'event' : 'events'}</span>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose} title="Close (Esc)">×</button>
        </div>

        <div style={styles.categoryRow}>
          {[1, 2, 4].map((cat) => {
            const color = CATEGORY_STYLE[cat].border;
            const count = counts[cat] || 0;
            return (
              <div
                key={cat}
                style={{
                  ...styles.categoryPill,
                  color,
                  borderColor: count > 0 ? color : '#27272a',
                  opacity: count > 0 ? 1 : 0.4,
                }}
              >
                <span>{cat}x</span>
                <span style={styles.categoryCount}>{count}</span>
              </div>
            );
          })}
        </div>

        <div style={styles.list}>
          {sorted.map((incident) => {
            const cat = CATEGORY_STYLE[incident.category] || CATEGORY_STYLE[1];
            const bookmarked = bookmarkedIds.has(incident.id);
            return (
              <div
                key={incident.id}
                style={{ ...styles.row, borderLeft: `3px solid ${cat.border}`, background: cat.bg }}
                onClick={() => onJump(incident)}
                title="Click to jump replay to this moment"
              >
                <div style={{ ...styles.badge, color: cat.text, borderColor: cat.border }}>
                  +{incident.delta}x
                </div>
                <div style={styles.rowMain}>
                  <div style={styles.rowTime}>T {formatSessionTime(incident.sessionTime)}</div>
                  <div style={styles.rowTotal}>running total {incident.newCount}x</div>
                </div>
                <div style={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                  <button
                    style={{ ...styles.actionBtn, ...(bookmarked ? styles.actionBtnActive : {}) }}
                    onClick={() => onBookmark(incident)}
                    title={bookmarked ? 'Already bookmarked' : 'Bookmark'}
                  >
                    {bookmarked ? '★' : '☆'}
                  </button>
                  <button
                    style={styles.actionBtn}
                    onClick={() => onJump(incident)}
                    title="Jump replay"
                  >
                    ▶
                  </button>
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && (
            <div style={styles.empty}>No incidents for this driver yet.</div>
          )}
        </div>
      </aside>
    </>
  );
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
    zIndex: 90,
  },
  panel: {
    position: 'fixed', top: 0, right: 0, bottom: 0,
    width: 380, maxWidth: '90vw',
    background: '#0d0d10',
    borderLeft: '1px solid #27272a',
    boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
    display: 'flex', flexDirection: 'column',
    zIndex: 100,
  },
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '14px 16px 10px',
    borderBottom: '1px solid #1a1a1d',
  },
  headerMain: { flex: 1, minWidth: 0 },
  headerName: {
    display: 'flex', alignItems: 'baseline', gap: 8,
    fontSize: 15, color: '#f4f4f5', fontWeight: 600,
    marginBottom: 4,
  },
  carNum: {
    fontSize: 10, color: '#a1a1aa', background: '#18181b',
    padding: '2px 6px', borderRadius: 3, fontWeight: 600,
  },
  headerMeta: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11, color: '#a1a1aa', fontVariantNumeric: 'tabular-nums',
  },
  totalPill: {
    padding: '2px 8px', borderRadius: 3,
    background: 'rgba(239,68,68,0.10)', color: '#fca5a5',
    border: '1px solid rgba(239,68,68,0.25)',
    fontWeight: 600, letterSpacing: 0.3,
  },
  dim: { color: '#71717a' },
  closeBtn: {
    width: 26, height: 26, padding: 0,
    background: 'transparent', border: '1px solid #27272a',
    borderRadius: 3, color: '#a1a1aa', fontSize: 16, lineHeight: 1,
    flexShrink: 0,
  },
  categoryRow: {
    display: 'flex', gap: 6,
    padding: '10px 16px',
    borderBottom: '1px solid #1a1a1d',
  },
  categoryPill: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '5px 10px', fontSize: 11,
    background: '#18181b', border: '1px solid',
    borderRadius: 4, fontVariantNumeric: 'tabular-nums',
    letterSpacing: 0.3,
  },
  categoryCount: {
    fontSize: 10,
    padding: '1px 6px', borderRadius: 8,
    background: 'rgba(255,255,255,0.05)',
  },
  list: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  row: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', margin: '0 8px 4px',
    borderRadius: 4, cursor: 'pointer',
    fontVariantNumeric: 'tabular-nums',
  },
  badge: {
    padding: '4px 8px', borderRadius: 3, fontSize: 11,
    fontWeight: 600, border: '1px solid', flexShrink: 0,
    minWidth: 38, textAlign: 'center',
    background: 'rgba(0,0,0,0.2)',
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowTime: { fontSize: 12, color: '#e4e4e7' },
  rowTotal: { fontSize: 10, color: '#71717a', marginTop: 2 },
  rowActions: { display: 'flex', gap: 4, flexShrink: 0 },
  actionBtn: {
    width: 24, height: 24, padding: 0,
    background: 'transparent', border: '1px solid #27272a',
    borderRadius: 3, color: '#a1a1aa', fontSize: 11,
  },
  actionBtnActive: { color: '#fbbf24', borderColor: '#fbbf24' },
  empty: { padding: 30, textAlign: 'center', color: '#52525b', fontSize: 11 },
};
