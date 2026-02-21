/**
 * Pause Menu — full-screen overlay shown when the game is paused (ESC / pointer lock lost).
 *
 * Styled with inline CSS matching the dungeon parchment aesthetic.
 * Returns an object with show(), hide(), isVisible(), and dispose(),
 * plus callbacks for Resume, Restart, and Quit actions.
 */

export interface PauseMenuCallbacks {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export interface PauseMenu {
  show: () => void;
  hide: () => void;
  isVisible: () => boolean;
  dispose: () => void;
  setCallbacks: (cb: PauseMenuCallbacks) => void;
}

export function createPauseMenu(): PauseMenu {
  let visible = false;
  let callbacks: PauseMenuCallbacks | null = null;

  // --- Build DOM ---
  const overlay = document.createElement('div');
  overlay.id = 'pause-menu-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '20',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.7)',
    fontFamily: '"Courier New", Courier, monospace',
  });

  // Panel
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'relative',
    background: 'linear-gradient(135deg, #2a1a0a 0%, #1a0f05 100%)',
    border: '3px solid #8b6914',
    borderRadius: '12px',
    padding: '40px 48px',
    minWidth: '320px',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '28px',
    boxShadow: '0 0 40px rgba(218, 165, 32, 0.15), inset 0 0 60px rgba(0, 0, 0, 0.3)',
  });

  // Decorative top border accent
  const accent = document.createElement('div');
  Object.assign(accent.style, {
    position: 'absolute',
    top: '-2px',
    left: '20%',
    right: '20%',
    height: '3px',
    background: 'linear-gradient(90deg, transparent, #daa520, transparent)',
    borderRadius: '0 0 4px 4px',
  });
  panel.appendChild(accent);

  // Title: "PAUSED"
  const title = document.createElement('div');
  Object.assign(title.style, {
    fontFamily: '"Courier New", Courier, monospace',
    fontWeight: 'bold',
    fontSize: '36px',
    color: '#daa520',
    letterSpacing: '6px',
    textShadow: '0 0 20px rgba(218, 165, 32, 0.4), 0 2px 4px rgba(0, 0, 0, 0.8)',
    textTransform: 'uppercase',
  });
  title.textContent = 'PAUSED';
  panel.appendChild(title);

  // Separator line
  const separator = document.createElement('div');
  Object.assign(separator.style, {
    width: '80%',
    height: '1px',
    background: 'linear-gradient(90deg, transparent, #8b6914, transparent)',
  });
  panel.appendChild(separator);

  // Menu options container
  const optionsContainer = document.createElement('div');
  Object.assign(optionsContainer.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
  });

  const menuOptions: { label: string; action: () => void }[] = [
    { label: 'Resume', action: () => callbacks?.onResume() },
    { label: 'Restart', action: () => callbacks?.onRestart() },
    { label: 'Quit to Menu', action: () => callbacks?.onQuit() },
  ];

  for (const opt of menuOptions) {
    const btn = document.createElement('button');
    Object.assign(btn.style, {
      display: 'block',
      width: '100%',
      padding: '14px 20px',
      background: 'transparent',
      border: '2px solid rgba(139, 105, 20, 0.3)',
      borderRadius: '6px',
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#c4a35a',
      cursor: 'pointer',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      transition: 'all 0.15s ease',
      textAlign: 'center',
    });

    btn.textContent = opt.label;

    btn.addEventListener('mouseenter', () => {
      Object.assign(btn.style, {
        background: 'rgba(218, 165, 32, 0.1)',
        borderColor: '#daa520',
        color: '#daa520',
        textShadow: '0 0 12px rgba(218, 165, 32, 0.5)',
      });
    });

    btn.addEventListener('mouseleave', () => {
      Object.assign(btn.style, {
        background: 'transparent',
        borderColor: 'rgba(139, 105, 20, 0.3)',
        color: '#c4a35a',
        textShadow: 'none',
      });
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      opt.action();
    });

    optionsContainer.appendChild(btn);
  }

  panel.appendChild(optionsContainer);

  // Hint text
  const hint = document.createElement('div');
  Object.assign(hint.style, {
    fontSize: '12px',
    color: 'rgba(196, 163, 90, 0.4)',
    letterSpacing: '1px',
    textAlign: 'center',
  });
  hint.textContent = 'Press ESC or click Resume to continue';
  panel.appendChild(hint);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // --- Keyboard handler ---
  const onKeyDown = (e: KeyboardEvent) => {
    if (!visible) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      callbacks?.onResume();
    }
  };

  function show() {
    if (visible) return;
    visible = true;
    overlay.style.display = 'flex';
    document.addEventListener('keydown', onKeyDown, true);
  }

  function hide() {
    if (!visible) return;
    visible = false;
    overlay.style.display = 'none';
    document.removeEventListener('keydown', onKeyDown, true);
  }

  function dispose() {
    hide();
    overlay.remove();
  }

  return {
    show,
    hide,
    isVisible: () => visible,
    dispose,
    setCallbacks: (cb: PauseMenuCallbacks) => { callbacks = cb; },
  };
}
