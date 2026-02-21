let lineColor = '#2a1a0a';
const LINE_WIDTH = 3;
const ERASER_WIDTH = 20;

export interface SketchPad {
  canvas: HTMLCanvasElement;
  clear: () => void;
  toDataURL: () => string;
  destroy: () => void;
  setColor: (color: string) => void;
}

export function createSketchPad(container: HTMLElement): SketchPad {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  Object.assign(canvas.style, {
    width: '100%',
    height: '100%',
    cursor: 'crosshair',
    display: 'block',
  });
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let isDrawing = false;
  let isErasing = false;
  let lastX = 0;
  let lastY = 0;

  function getCanvasPos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function startStroke(e: MouseEvent | TouchEvent): void {
    e.preventDefault();
    isDrawing = true;
    const pos =
      e instanceof MouseEvent ? e : (e as TouchEvent).touches[0];
    const { x, y } = getCanvasPos(pos);
    lastX = x;
    lastY = y;

    isErasing = e instanceof MouseEvent && e.button === 2;
  }

  function moveStroke(e: MouseEvent | TouchEvent): void {
    if (!isDrawing) return;
    e.preventDefault();
    const pos =
      e instanceof MouseEvent ? e : (e as TouchEvent).touches[0];
    const { x, y } = getCanvasPos(pos);

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);

    if (isErasing) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = ERASER_WIDTH;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = LINE_WIDTH;

      // Add slight wobble for hand-drawn feel
      const midX = (lastX + x) / 2 + (Math.random() - 0.5) * 0.8;
      const midY = (lastY + y) / 2 + (Math.random() - 0.5) * 0.8;
      ctx.quadraticCurveTo(midX, midY, x, y);
    }

    ctx.lineTo(x, y);
    ctx.stroke();

    lastX = x;
    lastY = y;
  }

  function endStroke(): void {
    isDrawing = false;
    isErasing = false;
    ctx.globalCompositeOperation = 'source-over';
  }

  // Mouse events
  canvas.addEventListener('mousedown', startStroke);
  canvas.addEventListener('mousemove', moveStroke);
  canvas.addEventListener('mouseup', endStroke);
  canvas.addEventListener('mouseleave', endStroke);

  // Disable context menu for right-click eraser
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Touch events
  canvas.addEventListener('touchstart', startStroke, { passive: false });
  canvas.addEventListener('touchmove', moveStroke, { passive: false });
  canvas.addEventListener('touchend', endStroke);
  canvas.addEventListener('touchcancel', endStroke);

  function clear(): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function toDataURL(): string {
    return canvas.toDataURL('image/png');
  }

  function setColor(color: string): void {
    lineColor = color;
  }

  function destroy(): void {
    canvas.removeEventListener('mousedown', startStroke);
    canvas.removeEventListener('mousemove', moveStroke);
    canvas.removeEventListener('mouseup', endStroke);
    canvas.removeEventListener('mouseleave', endStroke);
    canvas.removeEventListener('touchstart', startStroke);
    canvas.removeEventListener('touchmove', moveStroke);
    canvas.removeEventListener('touchend', endStroke);
    canvas.removeEventListener('touchcancel', endStroke);
    canvas.remove();
  }

  return { canvas, clear, toDataURL, destroy, setColor };
}
