export interface GenerationOverlay {
  show(): void;
  setStage(stage: string, message: string): void;
  setError(message: string): void;
  hide(): void;
}

export function createGenerationOverlay(): GenerationOverlay {
  let overlay: HTMLDivElement | null = null;
  let messageEl: HTMLParagraphElement | null = null;
  let isVisible = false;

  function show(): void {
    if (isVisible) return;

    overlay = document.createElement('div');
    overlay.id = 'generation-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '10001',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.8)',
      fontFamily: '"Courier New", Courier, monospace',
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
      background: '#f4e4c1',
      border: '3px solid #2a1a0a',
      borderRadius: '12px',
      padding: '40px 60px',
      textAlign: 'center',
      maxWidth: '400px',
    });

    const spinner = document.createElement('div');
    Object.assign(spinner.style, {
      width: '40px',
      height: '40px',
      border: '4px solid #e8d5a3',
      borderTop: '4px solid #2a1a0a',
      borderRadius: '50%',
      margin: '0 auto 20px',
      animation: 'gen-spin 1s linear infinite',
    });

    if (!document.getElementById('gen-overlay-styles')) {
      const style = document.createElement('style');
      style.id = 'gen-overlay-styles';
      style.textContent = '@keyframes gen-spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }

    messageEl = document.createElement('p');
    Object.assign(messageEl.style, {
      color: '#2a1a0a',
      fontSize: '18px',
      fontWeight: '600',
      margin: '0',
    });
    messageEl.textContent = 'Preparing...';

    box.appendChild(spinner);
    box.appendChild(messageEl);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    isVisible = true;
  }

  function setStage(_stage: string, message: string): void {
    if (messageEl) messageEl.textContent = message;
  }

  function setError(message: string): void {
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.style.color = '#8b0000';
    }
    setTimeout(hide, 4000);
  }

  function hide(): void {
    if (!isVisible || !overlay) return;
    overlay.remove();
    overlay = null;
    messageEl = null;
    isVisible = false;
  }

  return { show, setStage, setError, hide };
}
