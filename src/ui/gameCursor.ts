/**
 * Game cursor — a centered crosshair during gameplay and a custom
 * cursor style when the pointer is free (not locked).
 */

let crosshair: HTMLDivElement | null = null;
let clickHint: HTMLDivElement | null = null;

/** Build the SVG crosshair as a data URL for CSS cursor */
function buildCursorUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="10" fill="none" stroke="%23daa520" stroke-width="2" opacity="0.8"/>
    <line x1="16" y1="4" x2="16" y2="10" stroke="%23daa520" stroke-width="2" opacity="0.8"/>
    <line x1="16" y1="22" x2="16" y2="28" stroke="%23daa520" stroke-width="2" opacity="0.8"/>
    <line x1="4" y1="16" x2="10" y2="16" stroke="%23daa520" stroke-width="2" opacity="0.8"/>
    <line x1="22" y1="16" x2="28" y2="16" stroke="%23daa520" stroke-width="2" opacity="0.8"/>
    <circle cx="16" cy="16" r="2" fill="%23daa520" opacity="0.6"/>
  </svg>`;
  return `url("data:image/svg+xml,${svg}") 16 16, crosshair`;
}

/** Show the centered crosshair (used when pointer lock is active) */
export function showCrosshair(): void {
  if (crosshair) {
    crosshair.style.display = 'block';
    return;
  }

  crosshair = document.createElement('div');
  Object.assign(crosshair.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '24px',
    height: '24px',
    pointerEvents: 'none',
    zIndex: '9999',
  });

  // Crosshair lines
  const styles = [
    // Top
    { top: '0', left: '50%', transform: 'translateX(-50%)', width: '2px', height: '8px' },
    // Bottom
    { bottom: '0', left: '50%', transform: 'translateX(-50%)', width: '2px', height: '8px' },
    // Left
    { top: '50%', left: '0', transform: 'translateY(-50%)', width: '8px', height: '2px' },
    // Right
    { top: '50%', right: '0', transform: 'translateY(-50%)', width: '8px', height: '2px' },
  ];

  for (const s of styles) {
    const line = document.createElement('div');
    Object.assign(line.style, {
      position: 'absolute',
      background: '#daa520',
      opacity: '0.85',
      borderRadius: '1px',
      boxShadow: '0 0 4px rgba(218, 165, 32, 0.5)',
      ...s,
    });
    crosshair.appendChild(line);
  }

  // Center dot
  const dot = document.createElement('div');
  Object.assign(dot.style, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '3px',
    height: '3px',
    borderRadius: '50%',
    background: '#daa520',
    opacity: '0.6',
  });
  crosshair.appendChild(dot);

  document.body.appendChild(crosshair);
}

/** Hide the centered crosshair */
export function hideCrosshair(): void {
  if (crosshair) crosshair.style.display = 'none';
}

/** Show "Click to resume" hint when pointer lock is lost mid-game */
export function showClickHint(): void {
  if (clickHint) {
    clickHint.style.display = 'flex';
    return;
  }

  clickHint = document.createElement('div');
  Object.assign(clickHint.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 24px',
    background: 'rgba(0, 0, 0, 0.7)',
    border: '1px solid rgba(218, 165, 32, 0.5)',
    borderRadius: '8px',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '14px',
    color: '#daa520',
    pointerEvents: 'none',
    zIndex: '9998',
    letterSpacing: '1px',
  });
  clickHint.textContent = 'Click to resume';
  document.body.appendChild(clickHint);
}

/** Hide the click hint */
export function hideClickHint(): void {
  if (clickHint) clickHint.style.display = 'none';
}

/** Apply custom game cursor to the document body */
export function setGameCursor(): void {
  document.body.style.cursor = buildCursorUrl();
}

/** Restore default cursor */
export function setDefaultCursor(): void {
  document.body.style.cursor = 'default';
}

/** Dispose all cursor elements */
export function disposeCursor(): void {
  if (crosshair) {
    crosshair.remove();
    crosshair = null;
  }
  if (clickHint) {
    clickHint.remove();
    clickHint = null;
  }
  setDefaultCursor();
}
