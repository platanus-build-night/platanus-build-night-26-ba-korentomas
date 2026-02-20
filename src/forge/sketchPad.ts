export function createSketchPad(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const undoStack: ImageData[] = [];
  let drawing = false;

  // Initialize white background
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveSnapshot();

  // Drawing style
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  function getPos(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function saveSnapshot() {
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (undoStack.length > 50) undoStack.shift();
  }

  canvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  });

  canvas.addEventListener('pointerup', () => {
    if (!drawing) return;
    drawing = false;
    saveSnapshot();
  });

  function undo() {
    if (undoStack.length <= 1) return;
    undoStack.pop(); // remove current
    const prev = undoStack[undoStack.length - 1];
    ctx.putImageData(prev, 0, 0);
  }

  function clear() {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000';
    undoStack.length = 0;
    saveSnapshot();
  }

  function toDataURL() {
    return canvas.toDataURL('image/png');
  }

  return { undo, clear, toDataURL };
}
