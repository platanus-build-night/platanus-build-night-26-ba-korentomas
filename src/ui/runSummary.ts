/**
 * Run Summary — atmospheric game-over screen styled as a dungeon death scroll.
 *
 * Shows score, floor reached, enemies killed, creations forged,
 * and leaderboard if the player made top 10.
 */

import { getScores, addScore, isHighScore } from './leaderboard';
import { suppressCheatConsole } from '../cheats/cheatConsole';

export interface RunStats {
  playerName: string;
  score: number;
  floor: number;
  enemiesKilled: number;
  creationsUsed: { name: string; category: string }[];
}

export interface RunSummaryResult {
  action: 'play_again' | 'quit';
}

export function showRunSummary(stats: RunStats): Promise<RunSummaryResult> {
  return new Promise<RunSummaryResult>((resolve) => {
    // Save score
    const madeLeaderboard = isHighScore(stats.score);
    if (madeLeaderboard) {
      addScore({
        name: stats.playerName,
        score: stats.score,
        floor: stats.floor,
        date: new Date().toISOString().slice(0, 10),
      });
    }

    // Add flickering animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes deathPulse {
        0%, 100% { text-shadow: 0 0 20px rgba(180, 30, 30, 0.4), 0 0 60px rgba(180, 30, 30, 0.15), 0 2px 4px rgba(0, 0, 0, 0.8); }
        50% { text-shadow: 0 0 30px rgba(180, 30, 30, 0.6), 0 0 80px rgba(180, 30, 30, 0.25), 0 2px 4px rgba(0, 0, 0, 0.8); }
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);

    // --- Overlay ---
    const overlay = document.createElement('div');
    overlay.id = 'run-summary-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '30',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(5, 0, 0, 0.92)',
      fontFamily: '"Courier New", Courier, monospace',
    });

    // Vignette effect
    const vignette = document.createElement('div');
    Object.assign(vignette.style, {
      position: 'absolute',
      inset: '0',
      background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.6) 100%)',
      pointerEvents: 'none',
    });
    overlay.appendChild(vignette);

    // --- Death scroll panel ---
    const scroll = document.createElement('div');
    Object.assign(scroll.style, {
      position: 'relative',
      background: 'linear-gradient(160deg, #2a2018 0%, #1e1610 40%, #151008 100%)',
      border: '3px solid #3a2a18',
      borderRadius: '4px',
      padding: '36px 44px',
      maxWidth: '480px',
      width: '90vw',
      maxHeight: '85vh',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '18px',
      boxShadow: '0 0 60px rgba(120, 20, 20, 0.15), inset 0 0 80px rgba(0, 0, 0, 0.4)',
      backgroundImage: `
        radial-gradient(ellipse at 30% 20%, rgba(80, 20, 20, 0.08) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 70%, rgba(50, 40, 30, 0.1) 0%, transparent 50%)
      `,
      animation: 'fadeInUp 0.6s ease-out',
    });

    // Blood-red accent line
    const accent = document.createElement('div');
    Object.assign(accent.style, {
      position: 'absolute',
      top: '0',
      left: '15%',
      right: '15%',
      height: '2px',
      background: 'linear-gradient(90deg, transparent, rgba(180, 30, 30, 0.5), transparent)',
    });
    scroll.appendChild(accent);

    // Death title
    const title = document.createElement('div');
    Object.assign(title.style, {
      fontWeight: 'bold',
      fontSize: '38px',
      color: '#b41e1e',
      letterSpacing: '8px',
      textTransform: 'uppercase',
      animation: 'deathPulse 3s ease-in-out infinite',
    });
    title.textContent = 'YOU DIED';
    scroll.appendChild(title);

    // Player name — carved inscription
    const nameEl = document.createElement('div');
    Object.assign(nameEl.style, {
      fontSize: '16px',
      color: '#6b5b45',
      letterSpacing: '6px',
      fontWeight: 'bold',
      textShadow: '0 1px 0 rgba(0, 0, 0, 0.6), 0 -1px 0 rgba(255, 255, 255, 0.03)',
    });
    nameEl.textContent = `- ${stats.playerName} -`;
    scroll.appendChild(nameEl);

    scroll.appendChild(makeGroove());

    // Stats — large centered values with labels underneath
    const statsContainer = document.createElement('div');
    Object.assign(statsContainer.style, {
      display: 'flex',
      justifyContent: 'center',
      gap: '32px',
      width: '100%',
      animation: 'fadeInUp 0.6s ease-out 0.15s both',
    });

    statsContainer.appendChild(makeStatBlock(stats.score.toLocaleString(), 'SCORE', '#daa520'));
    statsContainer.appendChild(makeStatBlock(String(stats.floor), 'FLOOR', '#c4a35a'));
    statsContainer.appendChild(makeStatBlock(String(stats.enemiesKilled), 'SLAIN', '#a04040'));

    scroll.appendChild(statsContainer);

    // Creations used
    if (stats.creationsUsed.length > 0) {
      scroll.appendChild(makeGroove());

      const creationsWrap = document.createElement('div');
      Object.assign(creationsWrap.style, {
        width: '100%',
        animation: 'fadeInUp 0.6s ease-out 0.3s both',
      });

      const creationsTitle = document.createElement('div');
      Object.assign(creationsTitle.style, {
        fontSize: '12px',
        color: '#6b5b45',
        letterSpacing: '3px',
        textTransform: 'uppercase',
        fontWeight: 'bold',
        marginBottom: '10px',
        textShadow: '0 1px 0 rgba(0, 0, 0, 0.4)',
      });
      creationsTitle.textContent = 'CREATIONS FORGED';
      creationsWrap.appendChild(creationsTitle);

      const BADGE_COLORS: Record<string, string> = {
        weapon: '#5a5a5a',
        enemy: '#6b2020',
        decoration: '#2a5a2a',
      };

      for (const c of stats.creationsUsed) {
        const row = document.createElement('div');
        Object.assign(row.style, {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 8px',
          borderRadius: '3px',
          marginBottom: '4px',
          background: 'rgba(0, 0, 0, 0.2)',
        });

        const badge = document.createElement('span');
        Object.assign(badge.style, {
          display: 'inline-block',
          padding: '2px 7px',
          borderRadius: '3px',
          background: BADGE_COLORS[c.category] || '#444',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '9px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          flexShrink: '0',
        });
        badge.textContent = c.category;
        row.appendChild(badge);

        const nameSpan = document.createElement('span');
        Object.assign(nameSpan.style, {
          fontSize: '13px',
          color: '#8b7b65',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        });
        nameSpan.textContent = c.name;
        row.appendChild(nameSpan);

        creationsWrap.appendChild(row);
      }
      scroll.appendChild(creationsWrap);
    }

    // Leaderboard
    const scores = getScores();
    if (scores.length > 0) {
      scroll.appendChild(makeGroove());

      const lbWrap = document.createElement('div');
      Object.assign(lbWrap.style, {
        width: '100%',
        animation: 'fadeInUp 0.6s ease-out 0.45s both',
      });

      const lbTitle = document.createElement('div');
      Object.assign(lbTitle.style, {
        fontSize: '12px',
        letterSpacing: '3px',
        textTransform: 'uppercase',
        fontWeight: 'bold',
        marginBottom: '10px',
        textShadow: '0 1px 0 rgba(0, 0, 0, 0.4)',
        color: madeLeaderboard ? '#daa520' : '#6b5b45',
      });
      lbTitle.textContent = madeLeaderboard ? 'NEW HIGH SCORE!' : 'HALL OF THE FALLEN';
      lbWrap.appendChild(lbTitle);

      for (let i = 0; i < scores.length; i++) {
        const entry = scores[i];
        const isCurrentRun = madeLeaderboard
          && entry.name === stats.playerName
          && entry.score === stats.score
          && entry.floor === stats.floor;
        const row = document.createElement('div');
        Object.assign(row.style, {
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '3px 6px',
          borderRadius: '3px',
          fontSize: '13px',
          marginBottom: '2px',
          background: isCurrentRun ? 'rgba(218, 165, 32, 0.08)' : 'transparent',
          borderLeft: isCurrentRun ? '2px solid rgba(218, 165, 32, 0.4)' : '2px solid transparent',
        });

        const rank = document.createElement('span');
        Object.assign(rank.style, {
          color: 'rgba(107, 91, 69, 0.5)',
          width: '22px',
          textAlign: 'right',
          fontSize: '12px',
        });
        rank.textContent = `${i + 1}.`;
        row.appendChild(rank);

        const name = document.createElement('span');
        Object.assign(name.style, {
          color: isCurrentRun ? '#daa520' : '#8b7b65',
          fontWeight: isCurrentRun ? 'bold' : 'normal',
          letterSpacing: '3px',
          width: '52px',
        });
        name.textContent = entry.name;
        row.appendChild(name);

        const score = document.createElement('span');
        Object.assign(score.style, {
          color: isCurrentRun ? '#daa520' : 'rgba(139, 123, 101, 0.6)',
          flex: '1',
          textAlign: 'right',
        });
        score.textContent = entry.score.toLocaleString();
        row.appendChild(score);

        const floor = document.createElement('span');
        Object.assign(floor.style, {
          color: 'rgba(107, 91, 69, 0.4)',
          width: '36px',
          textAlign: 'right',
          fontSize: '12px',
        });
        floor.textContent = `F${entry.floor}`;
        row.appendChild(floor);

        lbWrap.appendChild(row);
      }
      scroll.appendChild(lbWrap);
    }

    // Buttons
    scroll.appendChild(makeGroove());

    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, {
      display: 'flex',
      gap: '12px',
      width: '100%',
      animation: 'fadeInUp 0.6s ease-out 0.6s both',
    });

    btnRow.appendChild(makeStoneButton('RISE AGAIN', () => {
      cleanup();
      resolve({ action: 'play_again' });
    }));
    btnRow.appendChild(makeStoneButton('RETREAT', () => {
      cleanup();
      resolve({ action: 'quit' });
    }));

    scroll.appendChild(btnRow);
    overlay.appendChild(scroll);
    document.body.appendChild(overlay);

    function cleanup() {
      suppressCheatConsole(false);
      document.removeEventListener('keydown', onKeyDown);
      style.remove();
      overlay.remove();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault();
        cleanup();
        resolve({ action: 'play_again' });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cleanup();
        resolve({ action: 'quit' });
      }
    }

    // Delay keyboard to prevent accidental trigger
    suppressCheatConsole(true);
    setTimeout(() => {
      document.addEventListener('keydown', onKeyDown);
    }, 600);
  });
}

function makeGroove(): HTMLDivElement {
  const groove = document.createElement('div');
  Object.assign(groove.style, {
    width: '70%',
    height: '2px',
    background: 'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.4), transparent)',
    boxShadow: '0 1px 0 rgba(255, 255, 255, 0.02)',
  });
  return groove;
}

function makeStatBlock(value: string, label: string, color: string): HTMLDivElement {
  const block = document.createElement('div');
  Object.assign(block.style, {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    minWidth: '80px',
  });

  const valEl = document.createElement('div');
  Object.assign(valEl.style, {
    fontSize: '28px',
    fontWeight: 'bold',
    color,
    textShadow: `0 0 16px ${color}44, 0 2px 4px rgba(0, 0, 0, 0.6)`,
  });
  valEl.textContent = value;
  block.appendChild(valEl);

  const labelEl = document.createElement('div');
  Object.assign(labelEl.style, {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#5a4a3a',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    textShadow: '0 1px 0 rgba(0, 0, 0, 0.4)',
  });
  labelEl.textContent = label;
  block.appendChild(labelEl);

  return block;
}

function makeStoneButton(text: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  Object.assign(btn.style, {
    flex: '1',
    padding: '13px 16px',
    background: 'linear-gradient(180deg, rgba(74, 58, 40, 0.3) 0%, rgba(40, 30, 20, 0.5) 100%)',
    border: '2px solid rgba(74, 58, 40, 0.4)',
    borderRadius: '4px',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#6b5b45',
    cursor: 'pointer',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    transition: 'all 0.2s ease',
    textAlign: 'center',
    textShadow: '0 1px 0 rgba(0, 0, 0, 0.4)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.02)',
  });
  btn.textContent = text;

  btn.addEventListener('mouseenter', () => {
    Object.assign(btn.style, {
      background: 'linear-gradient(180deg, rgba(139, 105, 20, 0.15) 0%, rgba(74, 58, 40, 0.35) 100%)',
      borderColor: 'rgba(218, 165, 32, 0.4)',
      color: '#daa520',
      textShadow: '0 0 8px rgba(218, 165, 32, 0.3), 0 1px 0 rgba(0, 0, 0, 0.4)',
    });
  });
  btn.addEventListener('mouseleave', () => {
    Object.assign(btn.style, {
      background: 'linear-gradient(180deg, rgba(74, 58, 40, 0.3) 0%, rgba(40, 30, 20, 0.5) 100%)',
      borderColor: 'rgba(74, 58, 40, 0.4)',
      color: '#6b5b45',
      textShadow: '0 1px 0 rgba(0, 0, 0, 0.4)',
    });
  });
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
}
