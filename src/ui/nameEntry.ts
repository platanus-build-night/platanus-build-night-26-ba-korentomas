/**
 * Name Entry — 3-letter name input styled as a dungeon stone tablet.
 *
 * Supports direct keyboard typing (A-Z), backspace, and Enter to confirm.
 * No arcade cycling — just type your initials naturally.
 */

import { suppressCheatConsole } from '../cheats/cheatConsole';

export function showNameEntry(): Promise<string> {
  return new Promise<string>((resolve) => {
    const letters: string[] = [];
    const MAX_CHARS = 3;

    // --- Overlay ---
    const overlay = document.createElement('div');
    overlay.id = 'name-entry-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '30',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.9)',
      fontFamily: '"Courier New", Courier, monospace',
    });

    // Stone tablet panel
    const tablet = document.createElement('div');
    Object.assign(tablet.style, {
      position: 'relative',
      background: 'linear-gradient(160deg, #3a3028 0%, #2a2018 40%, #1e1610 100%)',
      border: '4px solid #4a3a28',
      borderRadius: '4px',
      padding: '48px 56px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '32px',
      boxShadow: '0 0 80px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05), inset 0 -2px 0 rgba(0, 0, 0, 0.3)',
      // Stone texture effect via overlapping gradients
      backgroundImage: `
        radial-gradient(ellipse at 20% 50%, rgba(60, 50, 35, 0.4) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 30%, rgba(50, 40, 30, 0.3) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 80%, rgba(40, 30, 20, 0.3) 0%, transparent 50%)
      `,
    });

    // Chiseled edge accents
    const topEdge = document.createElement('div');
    Object.assign(topEdge.style, {
      position: 'absolute',
      top: '0',
      left: '10%',
      right: '10%',
      height: '2px',
      background: 'linear-gradient(90deg, transparent, rgba(139, 105, 20, 0.3), transparent)',
    });
    tablet.appendChild(topEdge);

    // "Carved" title — stone inscription look
    const title = document.createElement('div');
    Object.assign(title.style, {
      fontWeight: 'bold',
      fontSize: '20px',
      color: '#8b7355',
      letterSpacing: '6px',
      textTransform: 'uppercase',
      textShadow: '0 1px 0 rgba(0, 0, 0, 0.8), 0 -1px 0 rgba(255, 255, 255, 0.05)',
    });
    title.textContent = 'INSCRIBE YOUR NAME';
    tablet.appendChild(title);

    // Carved line separator
    const groove = document.createElement('div');
    Object.assign(groove.style, {
      width: '60%',
      height: '2px',
      background: 'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.4), transparent)',
      boxShadow: '0 1px 0 rgba(255, 255, 255, 0.03)',
    });
    tablet.appendChild(groove);

    // Letter slots — look like carved recesses in stone
    const slotRow = document.createElement('div');
    Object.assign(slotRow.style, {
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
    });

    const slotEls: HTMLDivElement[] = [];

    for (let i = 0; i < MAX_CHARS; i++) {
      const slot = document.createElement('div');
      Object.assign(slot.style, {
        width: '64px',
        height: '76px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '44px',
        fontWeight: 'bold',
        color: '#daa520',
        // Recessed stone look
        background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.15) 100%)',
        border: '2px solid rgba(74, 58, 40, 0.6)',
        borderTop: '2px solid rgba(0, 0, 0, 0.4)',
        borderBottom: '2px solid rgba(100, 80, 55, 0.3)',
        borderRadius: '3px',
        textShadow: '0 0 20px rgba(218, 165, 32, 0.6), 0 0 40px rgba(218, 165, 32, 0.2)',
        transition: 'all 0.2s ease',
        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.4), inset 0 -1px 2px rgba(0, 0, 0, 0.2)',
      });
      slotEls.push(slot);
      slotRow.appendChild(slot);
    }

    tablet.appendChild(slotRow);

    // Blinking cursor indicator
    const cursorStyle = document.createElement('style');
    cursorStyle.textContent = `
      @keyframes runeFlicker {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      .rune-cursor::after {
        content: '|';
        color: #daa520;
        animation: runeFlicker 0.8s ease-in-out infinite;
        text-shadow: 0 0 8px rgba(218, 165, 32, 0.5);
      }
    `;
    document.head.appendChild(cursorStyle);

    // Confirm button — stone-carved feel
    const confirmBtn = document.createElement('button');
    Object.assign(confirmBtn.style, {
      display: 'block',
      padding: '14px 36px',
      background: 'linear-gradient(180deg, rgba(74, 58, 40, 0.4) 0%, rgba(40, 30, 20, 0.6) 100%)',
      border: '2px solid rgba(139, 105, 20, 0.4)',
      borderRadius: '4px',
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '15px',
      fontWeight: 'bold',
      color: '#8b7355',
      cursor: 'pointer',
      letterSpacing: '3px',
      textTransform: 'uppercase',
      transition: 'all 0.2s ease',
      textShadow: '0 1px 0 rgba(0, 0, 0, 0.5)',
      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
      opacity: '0.4',
      pointerEvents: 'none',
    });
    confirmBtn.textContent = 'ENTER THE DUNGEON';
    confirmBtn.addEventListener('mouseenter', () => {
      if (letters.length > 0) {
        Object.assign(confirmBtn.style, {
          borderColor: '#daa520',
          color: '#daa520',
          textShadow: '0 0 12px rgba(218, 165, 32, 0.5), 0 1px 0 rgba(0, 0, 0, 0.5)',
          background: 'linear-gradient(180deg, rgba(139, 105, 20, 0.2) 0%, rgba(74, 58, 40, 0.4) 100%)',
        });
      }
    });
    confirmBtn.addEventListener('mouseleave', () => {
      Object.assign(confirmBtn.style, {
        borderColor: 'rgba(139, 105, 20, 0.4)',
        color: '#8b7355',
        textShadow: '0 1px 0 rgba(0, 0, 0, 0.5)',
        background: 'linear-gradient(180deg, rgba(74, 58, 40, 0.4) 0%, rgba(40, 30, 20, 0.6) 100%)',
      });
    });
    confirmBtn.addEventListener('click', () => {
      if (letters.length > 0) submit();
    });
    tablet.appendChild(confirmBtn);

    // Hint — subtle carved inscription
    const hint = document.createElement('div');
    Object.assign(hint.style, {
      fontSize: '11px',
      color: 'rgba(139, 115, 85, 0.35)',
      letterSpacing: '1px',
      textAlign: 'center',
      textShadow: '0 1px 0 rgba(0, 0, 0, 0.3)',
    });
    hint.textContent = 'Type your initials, then press Enter';
    tablet.appendChild(hint);

    overlay.appendChild(tablet);
    document.body.appendChild(overlay);

    function updateDisplay() {
      for (let i = 0; i < MAX_CHARS; i++) {
        const slot = slotEls[i];
        // Clear classes
        slot.classList.remove('rune-cursor');

        if (i < letters.length) {
          // Filled slot — glowing carved rune
          slot.textContent = letters[i];
          Object.assign(slot.style, {
            color: '#daa520',
            textShadow: '0 0 20px rgba(218, 165, 32, 0.6), 0 0 40px rgba(218, 165, 32, 0.2)',
            borderColor: 'rgba(218, 165, 32, 0.3)',
          });
        } else if (i === letters.length) {
          // Active slot — cursor
          slot.textContent = '';
          slot.classList.add('rune-cursor');
          Object.assign(slot.style, {
            color: '#daa520',
            textShadow: 'none',
            borderColor: 'rgba(218, 165, 32, 0.5)',
          });
        } else {
          // Empty future slot
          slot.textContent = '';
          Object.assign(slot.style, {
            color: '#daa520',
            textShadow: 'none',
            borderColor: 'rgba(74, 58, 40, 0.6)',
          });
        }
      }

      // Enable/disable confirm button
      if (letters.length > 0) {
        confirmBtn.style.opacity = '1';
        confirmBtn.style.pointerEvents = 'auto';
      } else {
        confirmBtn.style.opacity = '0.4';
        confirmBtn.style.pointerEvents = 'none';
      }
    }

    function submit() {
      // Pad with underscores if < 3 letters
      while (letters.length < MAX_CHARS) letters.push('_');
      const name = letters.join('');
      cleanup();
      resolve(name);
    }

    function onKeyDown(e: KeyboardEvent) {
      // Direct letter typing
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        e.preventDefault();
        if (letters.length < MAX_CHARS) {
          letters.push(e.key.toUpperCase());
          updateDisplay();
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        if (letters.length > 0) {
          letters.pop();
          updateDisplay();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (letters.length > 0) submit();
      }
    }

    function cleanup() {
      suppressCheatConsole(false);
      document.removeEventListener('keydown', onKeyDown, true);
      cursorStyle.remove();
      overlay.remove();
    }

    suppressCheatConsole(true);
    document.addEventListener('keydown', onKeyDown, true);
    updateDisplay();
  });
}
