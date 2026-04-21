import React from 'react';

const FILTERS = [
  { key: 'all', label: 'All', color: '#a1a1aa' },
  { key: '1', label: '1x', color: '#60a5fa' },
  { key: '2', label: '2x', color: '#f59e0b' },
  { key: '4', label: '4x', color: '#ef4444' },
];

export default function FilterBar({ filter, onChange, counts }) {
  return (
    <div style={styles.bar}>
      {FILTERS.map((f) => {
        const active = filter === f.key;
        const count = counts?.[f.key] ?? 0;
        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            style={{
              ...styles.chip,
              ...(active
                ? { background: f.color + '22', border: `1px solid ${f.color}`, color: f.color }
                : {}),
            }}
          >
            <span>{f.label}</span>
            <span style={styles.count}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  bar: { display: 'flex', gap: 6 },
  chip: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 12px',
    background: '#18181b', border: '1px solid #27272a',
    borderRadius: 4, fontSize: 11,
    color: '#a1a1aa', letterSpacing: 0.4,
    fontVariantNumeric: 'tabular-nums',
  },
  count: {
    fontSize: 10, color: '#71717a',
    padding: '1px 6px', borderRadius: 8,
    background: 'rgba(255,255,255,0.04)',
  },
};
