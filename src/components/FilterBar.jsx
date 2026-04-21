import React from 'react';

const CATEGORIES = [
  { key: '1', label: '1x', color: '#60a5fa' },
  { key: '2', label: '2x', color: '#f59e0b' },
  { key: '4', label: '4x', color: '#ef4444' },
];

export default function FilterBar({ selected, onToggle, onClear, counts }) {
  const allActive = selected.size === 0;
  return (
    <div style={styles.bar}>
      <button
        onClick={onClear}
        style={{
          ...styles.chip,
          ...(allActive
            ? { background: 'rgba(161,161,170,0.18)', border: '1px solid #a1a1aa', color: '#e4e4e7' }
            : {}),
        }}
        title="Show all categories"
      >
        <span>All</span>
        <span style={styles.count}>{counts?.all ?? 0}</span>
      </button>
      {CATEGORIES.map((f) => {
        const active = selected.has(f.key);
        const count = counts?.[f.key] ?? 0;
        return (
          <button
            key={f.key}
            onClick={() => onToggle(f.key)}
            style={{
              ...styles.chip,
              ...(active
                ? { background: f.color + '22', border: `1px solid ${f.color}`, color: f.color }
                : {}),
            }}
            title={active ? `Hide ${f.label} incidents` : `Show ${f.label} incidents`}
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
    userSelect: 'none',
  },
  count: {
    fontSize: 10, color: '#71717a',
    padding: '1px 6px', borderRadius: 8,
    background: 'rgba(255,255,255,0.04)',
  },
};
