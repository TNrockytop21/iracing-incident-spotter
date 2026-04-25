import React from 'react';

export const CAMERA_PRESETS = ['Cockpit', 'Chopper', 'Blimp', 'Rear Chase', 'Far Chase'];

export default function JumpSettings({
  leadInSeconds,
  onLeadInChange,
  cameraName,
  onCameraChange,
  availableGroups,
}) {
  return (
    <div style={styles.bar}>
      <label style={styles.field} title="Seconds before the incident the replay jumps to">
        <span style={styles.label}>Lead-in</span>
        <input
          type="range"
          min={0}
          max={30}
          step={1}
          value={leadInSeconds}
          onChange={(e) => onLeadInChange(Number(e.target.value))}
          style={styles.slider}
        />
        <span style={styles.valuePill}>{leadInSeconds}s</span>
      </label>

      <label style={styles.field} title="Camera angle to switch to when you click an incident">
        <span style={styles.label}>Cam</span>
        <select
          value={cameraName}
          onChange={(e) => onCameraChange(e.target.value)}
          style={styles.select}
        >
          {CAMERA_PRESETS.map((name) => {
            const supported = isCameraAvailable(name, availableGroups);
            return (
              <option key={name} value={name}>
                {name}{supported ? '' : ' *'}
              </option>
            );
          })}
        </select>
      </label>
    </div>
  );
}

function isCameraAvailable(name, groups) {
  if (!groups || !groups.length) return true; // unknown — assume yes
  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
  const target = norm(name);
  return groups.some(
    (g) => norm(g.groupName) === target || g.groupName?.toLowerCase().includes(name.toLowerCase()),
  );
}

const styles = {
  bar: { display: 'flex', gap: 8, alignItems: 'center' },
  field: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '4px 8px',
    background: '#18181b', border: '1px solid #27272a',
    borderRadius: 4, fontSize: 10,
    color: '#a1a1aa', letterSpacing: 0.4,
    fontVariantNumeric: 'tabular-nums',
  },
  label: { textTransform: 'uppercase', color: '#71717a' },
  slider: {
    width: 80, height: 14,
    accentColor: '#60a5fa',
    cursor: 'pointer',
    background: 'transparent',
  },
  valuePill: {
    minWidth: 28, textAlign: 'right',
    color: '#e4e4e7', fontSize: 11, fontWeight: 500,
  },
  select: {
    background: '#0d0d10', color: '#e4e4e7',
    border: '1px solid #27272a', borderRadius: 3,
    fontSize: 11, padding: '3px 6px',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
};
