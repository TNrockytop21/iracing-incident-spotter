import React, { useCallback, useEffect, useState } from 'react';

const INITIAL = { kind: 'idle', message: null, percent: 0, version: null };

export default function UpdateButton({ spotter }) {
  const [state, setState] = useState(INITIAL);
  const [currentVersion, setCurrentVersion] = useState(null);

  useEffect(() => {
    if (!spotter?.getAppVersion) return;
    spotter.getAppVersion().then((r) => setCurrentVersion(r?.version || null));
  }, [spotter]);

  useEffect(() => {
    if (!spotter?.onUpdateEvent) return;
    return spotter.onUpdateEvent((evt) => {
      switch (evt.type) {
        case 'checking':
          setState({ kind: 'checking', message: 'Checking…', percent: 0, version: null });
          break;
        case 'available':
          setState({ kind: 'available', message: `v${evt.version} available`, percent: 0, version: evt.version });
          break;
        case 'not-available':
          setState({ kind: 'uptodate', message: 'Up to date', percent: 0, version: null });
          setTimeout(() => setState((s) => (s.kind === 'uptodate' ? INITIAL : s)), 3000);
          break;
        case 'progress':
          setState((s) => ({ ...s, kind: 'downloading', message: `Downloading ${evt.percent}%`, percent: evt.percent }));
          break;
        case 'downloaded':
          setState({ kind: 'downloaded', message: `Restart to install v${evt.version}`, percent: 100, version: evt.version });
          break;
        case 'error':
          setState({ kind: 'error', message: 'Update error', percent: 0, version: null });
          setTimeout(() => setState((s) => (s.kind === 'error' ? INITIAL : s)), 4000);
          break;
        default:
      }
    });
  }, [spotter]);

  const handleClick = useCallback(async () => {
    if (!spotter) return;
    if (state.kind === 'idle' || state.kind === 'uptodate' || state.kind === 'error') {
      const res = await spotter.checkForUpdates();
      if (!res?.ok) {
        setState({ kind: 'error', message: res?.error || 'Update error', percent: 0, version: null });
        setTimeout(() => setState((s) => (s.kind === 'error' ? INITIAL : s)), 4000);
      }
    } else if (state.kind === 'available') {
      spotter.downloadUpdate();
    } else if (state.kind === 'downloaded') {
      spotter.installUpdate();
    }
  }, [spotter, state.kind]);

  const variant = VARIANTS[state.kind] || VARIANTS.idle;
  const label =
    state.kind === 'idle'
      ? 'Check for updates'
      : state.kind === 'available'
        ? `↓ ${state.message}`
        : state.kind === 'downloaded'
          ? `⟳ ${state.message}`
          : state.message;

  const clickable = state.kind !== 'checking' && state.kind !== 'downloading';

  return (
    <button
      style={{ ...styles.btn, ...variant, ...(clickable ? {} : styles.disabled) }}
      onClick={clickable ? handleClick : undefined}
      disabled={!clickable}
      title={currentVersion ? `Current: v${currentVersion}` : ''}
    >
      {state.kind === 'downloading' && (
        <span style={{ ...styles.progressFill, width: `${state.percent}%` }} />
      )}
      <span style={styles.label}>{label}</span>
    </button>
  );
}

const styles = {
  btn: {
    position: 'relative',
    overflow: 'hidden',
    padding: '6px 12px', fontSize: 11,
    background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa',
    borderRadius: 4, letterSpacing: 0.3,
    userSelect: 'none',
    fontVariantNumeric: 'tabular-nums',
  },
  label: { position: 'relative', zIndex: 1 },
  progressFill: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    background: 'rgba(96,165,250,0.20)',
    transition: 'width 150ms ease-out',
  },
  disabled: { cursor: 'default', opacity: 0.85 },
};

const VARIANTS = {
  idle: {},
  checking: { color: '#a1a1aa' },
  uptodate: { background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.4)', color: '#86efac' },
  available: { background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.5)', color: '#93c5fd' },
  downloading: { color: '#93c5fd' },
  downloaded: { background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.5)', color: '#86efac' },
  error: { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' },
};
