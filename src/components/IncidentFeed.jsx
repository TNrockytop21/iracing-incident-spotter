import React from 'react';
import IncidentRow from './IncidentRow.jsx';

export default function IncidentFeed({ incidents, onJump, onBookmark, bookmarkedIds }) {
  if (incidents.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyTitle}>No incidents yet</div>
        <div style={styles.emptySub}>
          Waiting for 1x, 2x, or 4x incidents while you're spectating the session.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.list}>
      {incidents.map((incident) => (
        <IncidentRow
          key={incident.id}
          incident={incident}
          onJump={onJump}
          onBookmark={onBookmark}
          bookmarked={bookmarkedIds.has(incident.id)}
        />
      ))}
    </div>
  );
}

const styles = {
  list: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  empty: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    color: '#52525b', padding: 40, textAlign: 'center',
  },
  emptyTitle: { fontSize: 14, color: '#a1a1aa', marginBottom: 6 },
  emptySub: { fontSize: 11, maxWidth: 320, lineHeight: 1.5 },
};
