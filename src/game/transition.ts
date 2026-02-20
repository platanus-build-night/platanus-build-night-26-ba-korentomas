export function createFadeOverlay(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#000;opacity:0;pointer-events:none;z-index:20;transition:none;';
  document.body.appendChild(el);
  return el;
}

export function fadeToBlack(overlay: HTMLDivElement, duration = 1000): Promise<void> {
  return new Promise((resolve) => {
    overlay.style.transition = `opacity ${duration}ms ease-in`;
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'all';
    setTimeout(resolve, duration);
  });
}

export function fadeFromBlack(overlay: HTMLDivElement, duration = 1000): Promise<void> {
  return new Promise((resolve) => {
    overlay.style.transition = `opacity ${duration}ms ease-out`;
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.pointerEvents = 'none';
      resolve();
    }, duration);
  });
}
