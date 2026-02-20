import { createSketchPad, SketchPad } from './sketchPad';
import {
  DrawingCategory,
  DrawingResult,
  DEFAULT_CATEGORIES,
} from './drawingTypes';

let overlay: HTMLDivElement | null = null;
let sketchPad: SketchPad | null = null;
let selectedCategoryId = '';
let isVisible = false;
let categoryButtons: HTMLButtonElement[] = [];
let promptInput: HTMLInputElement | null = null;
let pendingResolve: ((result: DrawingResult | null) => void) | null = null;
let forgeOverlayEl: HTMLDivElement | null = null;
let genBtn: HTMLButtonElement | null = null;

// --- Parchment border rendering ---

function drawParchmentBorder(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Parchment fill
  ctx.fillStyle = '#f4e4c1';
  roundedRect(ctx, 8, 8, w - 16, h - 16, 12);
  ctx.fill();

  // Subtle stain spots
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 8; i++) {
    const sx = 40 + Math.random() * (w - 80);
    const sy = 40 + Math.random() * (h - 80);
    const sr = 20 + Math.random() * 40;
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    grad.addColorStop(0, '#8b6914');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
  }
  ctx.globalAlpha = 1;

  // Rough charcoal border
  ctx.strokeStyle = '#2a1a0a';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  drawRoughRect(ctx, 10, 10, w - 20, h - 20, 3);

  // Inner border (lighter)
  ctx.strokeStyle = 'rgba(42, 26, 10, 0.3)';
  ctx.lineWidth = 2;
  drawRoughRect(ctx, 18, 18, w - 36, h - 36, 2);
}

function drawRoughRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  jitter: number
): void {
  ctx.beginPath();
  const steps = 40;
  // Top edge
  for (let i = 0; i <= steps; i++) {
    const px = x + (w * i) / steps + (Math.random() - 0.5) * jitter;
    const py = y + (Math.random() - 0.5) * jitter;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  // Right edge
  for (let i = 0; i <= steps; i++) {
    const px = x + w + (Math.random() - 0.5) * jitter;
    const py = y + (h * i) / steps + (Math.random() - 0.5) * jitter;
    ctx.lineTo(px, py);
  }
  // Bottom edge
  for (let i = steps; i >= 0; i--) {
    const px = x + (w * i) / steps + (Math.random() - 0.5) * jitter;
    const py = y + h + (Math.random() - 0.5) * jitter;
    ctx.lineTo(px, py);
  }
  // Left edge
  for (let i = steps; i >= 0; i--) {
    const px = x + (Math.random() - 0.5) * jitter;
    const py = y + (h * i) / steps + (Math.random() - 0.5) * jitter;
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// --- Category button rendering ---

function drawCategoryButton(
  canvas: HTMLCanvasElement,
  label: string,
  icon: string,
  selected: boolean
): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = selected ? '#e8d5a3' : '#f4e4c1';
  roundedRect(ctx, 4, 4, w - 8, h - 8, 8);
  ctx.fill();

  // Border
  ctx.strokeStyle = selected ? '#2a1a0a' : 'rgba(42, 26, 10, 0.4)';
  ctx.lineWidth = selected ? 3 : 2;
  drawRoughRect(ctx, 6, 6, w - 12, h - 12, selected ? 2 : 1.5);

  // Selected indicator — thicker ink
  if (selected) {
    ctx.strokeStyle = 'rgba(42, 26, 10, 0.2)';
    ctx.lineWidth = 1;
    drawRoughRect(ctx, 10, 10, w - 20, h - 20, 1);
  }

  // Icon
  ctx.font = '24px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2a1a0a';
  ctx.fillText(icon, w / 2, h / 2 - 8);

  // Label
  ctx.font = '600 13px "Courier New", monospace';
  ctx.fillText(label, w / 2, h / 2 + 16);
}

// --- Generate button rendering ---

function drawGenButton(canvas: HTMLCanvasElement, hover: boolean): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Orange fill
  ctx.fillStyle = hover ? '#ff8c33' : '#e87722';
  roundedRect(ctx, 4, 4, w - 8, h - 8, 10);
  ctx.fill();

  // Rough border
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 3;
  drawRoughRect(ctx, 6, 6, w - 12, h - 12, 2);

  // Text
  ctx.font = 'bold 20px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText('GEN', w / 2, h / 2);
}

// --- Clear button rendering ---

function drawClearButton(canvas: HTMLCanvasElement, hover: boolean): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = hover ? '#ddd0b0' : '#f4e4c1';
  roundedRect(ctx, 4, 4, w - 8, h - 8, 8);
  ctx.fill();

  ctx.strokeStyle = 'rgba(42, 26, 10, 0.4)';
  ctx.lineWidth = 2;
  drawRoughRect(ctx, 6, 6, w - 12, h - 12, 1.5);

  ctx.font = '600 12px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2a1a0a';
  ctx.fillText('CLEAR', w / 2, h / 2);
}

// --- Main overlay ---

function buildOverlay(categories: DrawingCategory[], defaultCategory?: string): HTMLDivElement {
  const root = document.createElement('div');
  root.id = 'drawing-overlay';
  Object.assign(root.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '10000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.7)',
    fontFamily: '"Courier New", Courier, monospace',
  });

  // Main container
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    display: 'flex',
    gap: '0',
    maxWidth: '900px',
    maxHeight: '640px',
    width: '90vw',
    height: '80vh',
    position: 'relative',
  });

  // --- Left: parchment + canvas ---
  const parchmentWrap = document.createElement('div');
  Object.assign(parchmentWrap.style, {
    position: 'relative',
    flex: '1',
    minWidth: '0',
  });

  const parchmentBg = document.createElement('canvas');
  parchmentBg.width = 600;
  parchmentBg.height = 600;
  Object.assign(parchmentBg.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  });
  drawParchmentBorder(parchmentBg);
  parchmentWrap.appendChild(parchmentBg);

  const canvasWrap = document.createElement('div');
  Object.assign(canvasWrap.style, {
    position: 'absolute',
    top: '24px',
    left: '24px',
    right: '24px',
    bottom: '24px',
  });
  parchmentWrap.appendChild(canvasWrap);

  // --- Right: sidebar ---
  const sidebar = document.createElement('div');
  Object.assign(sidebar.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '140px',
    flexShrink: '0',
    paddingLeft: '16px',
    justifyContent: 'center',
  });

  // Category buttons
  categoryButtons = [];
  selectedCategoryId = defaultCategory && categories.some(c => c.id === defaultCategory)
    ? defaultCategory
    : categories[0]?.id ?? '';

  for (const cat of categories) {
    const btn = document.createElement('button');
    Object.assign(btn.style, {
      background: 'none',
      border: 'none',
      padding: '0',
      cursor: 'pointer',
      display: 'block',
    });
    const btnCanvas = document.createElement('canvas');
    btnCanvas.width = 140;
    btnCanvas.height = 80;
    Object.assign(btnCanvas.style, { width: '100%', height: 'auto' });
    btn.appendChild(btnCanvas);
    drawCategoryButton(btnCanvas, cat.label, cat.icon, cat.id === selectedCategoryId);

    btn.addEventListener('click', () => {
      selectedCategoryId = cat.id;
      updateCategoryButtons(categories);
    });

    categoryButtons.push(btn);
    sidebar.appendChild(btn);
  }

  // Text prompt input
  promptInput = document.createElement('input');
  promptInput.type = 'text';
  promptInput.placeholder = 'Describe your creation...';
  Object.assign(promptInput.style, {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    background: 'rgba(210, 180, 140, 0.3)',
    border: '2px solid #8b7355',
    borderRadius: '6px',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '13px',
    color: '#2a1a0a',
    outline: 'none',
  });
  sidebar.appendChild(promptInput);

  // Spacer
  const spacer = document.createElement('div');
  spacer.style.flex = '1';
  sidebar.appendChild(spacer);

  // Clear button
  const clearBtn = document.createElement('button');
  Object.assign(clearBtn.style, {
    background: 'none',
    border: 'none',
    padding: '0',
    cursor: 'pointer',
    display: 'block',
  });
  const clearCanvas = document.createElement('canvas');
  clearCanvas.width = 140;
  clearCanvas.height = 50;
  Object.assign(clearCanvas.style, { width: '100%', height: 'auto' });
  drawClearButton(clearCanvas, false);
  clearBtn.appendChild(clearCanvas);
  clearBtn.addEventListener('mouseenter', () => drawClearButton(clearCanvas, true));
  clearBtn.addEventListener('mouseleave', () => drawClearButton(clearCanvas, false));
  clearBtn.addEventListener('click', () => sketchPad?.clear());
  sidebar.appendChild(clearBtn);

  // Generate button
  genBtn = document.createElement('button');
  Object.assign(genBtn.style, {
    background: 'none',
    border: 'none',
    padding: '0',
    cursor: 'pointer',
    display: 'block',
    marginTop: '4px',
  });
  const genCanvas = document.createElement('canvas');
  genCanvas.width = 140;
  genCanvas.height = 60;
  Object.assign(genCanvas.style, { width: '100%', height: 'auto' });
  drawGenButton(genCanvas, false);
  genBtn.appendChild(genCanvas);
  genBtn.addEventListener('mouseenter', () => drawGenButton(genCanvas, true));
  genBtn.addEventListener('mouseleave', () => drawGenButton(genCanvas, false));
  genBtn.addEventListener('click', handleGenerate);
  sidebar.appendChild(genBtn);

  // Close button (top-right X)
  const closeBtn = document.createElement('button');
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.6)',
    border: '2px solid rgba(255,136,48,0.5)',
    color: '#ff9944',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
    lineHeight: '1',
    zIndex: '1',
  });
  closeBtn.textContent = '\u00D7';
  closeBtn.addEventListener('click', hideDrawingOverlay);
  panel.appendChild(closeBtn);

  panel.appendChild(parchmentWrap);
  panel.appendChild(sidebar);
  root.appendChild(panel);

  // Close on background click
  root.addEventListener('click', (e) => {
    if (e.target === root) hideDrawingOverlay();
  });

  // Create sketch pad
  document.body.appendChild(root);
  sketchPad = createSketchPad(canvasWrap);

  return root;
}

function updateCategoryButtons(categories: DrawingCategory[]): void {
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const btn = categoryButtons[i];
    const canvas = btn.querySelector('canvas')!;
    drawCategoryButton(canvas, cat.label, cat.icon, cat.id === selectedCategoryId);
  }
}

function handleGenerate(): void {
  if (!sketchPad || !pendingResolve) return;

  const result: DrawingResult = {
    imageData: sketchPad.toDataURL(),
    categoryId: selectedCategoryId,
    textPrompt: promptInput?.value ?? '',
    width: sketchPad.canvas.width,
    height: sketchPad.canvas.height,
  };

  pendingResolve(result);
  pendingResolve = null;
}

// --- Public API ---

export interface DrawingOverlayOptions {
  categories?: DrawingCategory[];
  defaultCategory?: string;
}

export function showDrawingOverlay(options: DrawingOverlayOptions = {}): Promise<DrawingResult | null> {
  if (isVisible) return Promise.resolve(null);

  const categories = options.categories ?? DEFAULT_CATEGORIES;

  return new Promise<DrawingResult | null>((resolve) => {
    pendingResolve = resolve;
    overlay = buildOverlay(categories, options.defaultCategory);
    isVisible = true;
  });
}

export function hideDrawingOverlay(): void {
  if (!isVisible || !overlay) return;

  // Resolve pending promise with null (cancelled)
  if (pendingResolve) {
    pendingResolve(null);
    pendingResolve = null;
  }

  sketchPad?.destroy();
  sketchPad = null;
  overlay.remove();
  overlay = null;
  isVisible = false;
  categoryButtons = [];
  promptInput = null;
  genBtn = null;
  forgeOverlayEl = null;
}

export function showForgeProgress(): void {
  if (!overlay) return;

  forgeOverlayEl = document.createElement('div');
  Object.assign(forgeOverlayEl.style, {
    position: 'absolute',
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.6)',
    zIndex: '10001',
    borderRadius: '12px',
  });

  const label = document.createElement('div');
  Object.assign(label.style, {
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '28px',
    color: '#ff9944',
    textShadow: '0 0 12px rgba(255, 153, 68, 0.6)',
  });
  label.textContent = 'Forging...';
  forgeOverlayEl.appendChild(label);

  // Append to the panel (first child of overlay)
  const panel = overlay.firstElementChild as HTMLElement;
  if (panel) {
    panel.style.position = 'relative';
    panel.appendChild(forgeOverlayEl);
  }

  if (genBtn) {
    genBtn.style.pointerEvents = 'none';
    genBtn.style.opacity = '0.5';
  }
}

export function hideForgeProgress(): void {
  if (forgeOverlayEl) {
    forgeOverlayEl.remove();
    forgeOverlayEl = null;
  }

  if (genBtn) {
    genBtn.style.pointerEvents = '';
    genBtn.style.opacity = '';
  }
}

export function isDrawingOverlayVisible(): boolean {
  return isVisible;
}
