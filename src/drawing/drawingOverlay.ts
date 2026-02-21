import { createSketchPad, SketchPad } from './sketchPad';
import {
  DrawingCategory,
  DrawingResult,
  DEFAULT_CATEGORIES,
  type SubtypeOption,
  getSubtypesForCategory,
} from './drawingTypes';
import { createProjectilePad, ProjectilePad } from './projectilePad';

let overlay: HTMLDivElement | null = null;
let sketchPad: SketchPad | null = null;
let selectedCategoryId = '';
let selectedSubtype = 'sword';
let isVisible = false;
let categoryButtons: HTMLButtonElement[] = [];
let nameInput: HTMLInputElement | null = null;
let promptInput: HTMLTextAreaElement | null = null;
let pendingResolve: ((result: DrawingResult | null) => void) | null = null;
let forgeOverlayEl: HTMLDivElement | null = null;
let genBtn: HTMLButtonElement | null = null;
let subtypeContainer: HTMLDivElement | null = null;
let subtypeButtons: HTMLButtonElement[] = [];
let splatCanvases: HTMLCanvasElement[] = [];
let selectedSplatIndex = 0;
let projectilePad: ProjectilePad | null = null;
let projectilePadVisible = false;

// --- Color splat palette ---

const SPLAT_COLORS = [
  '#1a1a1a', // black
  '#5c3317', // dark brown
  '#8b0000', // dark red
  '#cc2222', // red
  '#e87722', // orange
  '#daa520', // gold/yellow
  '#228b22', // green
  '#2244aa', // blue
  '#6b2fa0', // purple
  '#f5f5f5', // white
];

function drawSplatPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, seed: number): void {
  const points = 8;
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const jitter = 0.6 + (Math.sin(seed * 13 + i * 7) * 0.5 + 0.5) * 0.8;
    const px = cx + Math.cos(angle) * r * jitter;
    const py = cy + Math.sin(angle) * r * jitter;
    if (i === 0) ctx.moveTo(px, py);
    else {
      const cpAngle = ((i - 0.5) / points) * Math.PI * 2;
      const cpJitter = 0.7 + (Math.sin(seed * 17 + i * 11) * 0.5 + 0.5) * 0.7;
      const cpx = cx + Math.cos(cpAngle) * r * cpJitter * 1.1;
      const cpy = cy + Math.sin(cpAngle) * r * cpJitter * 1.1;
      ctx.quadraticCurveTo(cpx, cpy, px, py);
    }
  }
  ctx.closePath();
}

function drawSplat(canvas: HTMLCanvasElement, color: string, seed: number, selected: boolean, hover: boolean): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const r = 11;

  drawSplatPath(ctx, cx, cy, r, seed);
  ctx.fillStyle = color;
  ctx.fill();

  drawSplatPath(ctx, cx, cy, r, seed);
  if (selected) {
    ctx.strokeStyle = '#daa520';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#daa520';
    ctx.shadowBlur = 6;
  } else if (hover) {
    ctx.strokeStyle = '#daa520';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  } else {
    ctx.strokeStyle = '#1a1a0a';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

function buildSplatPalette(parchmentWrap: HTMLDivElement): HTMLDivElement {
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'absolute',
    top: '28px',
    right: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    zIndex: '3',
  });

  splatCanvases = [];
  selectedSplatIndex = 0;

  for (let i = 0; i < SPLAT_COLORS.length; i++) {
    const color = SPLAT_COLORS[i];
    const seed = i * 3.7 + 1.2;
    const splatCanvas = document.createElement('canvas');
    splatCanvas.width = 32;
    splatCanvas.height = 32;
    Object.assign(splatCanvas.style, {
      width: '32px',
      height: '32px',
      cursor: 'pointer',
      display: 'block',
    });
    drawSplat(splatCanvas, color, seed, i === selectedSplatIndex, false);

    splatCanvas.addEventListener('mouseenter', () => {
      if (i !== selectedSplatIndex) {
        drawSplat(splatCanvas, color, seed, false, true);
      }
    });
    splatCanvas.addEventListener('mouseleave', () => {
      drawSplat(splatCanvas, color, seed, i === selectedSplatIndex, false);
    });
    splatCanvas.addEventListener('click', () => {
      const prevIdx = selectedSplatIndex;
      selectedSplatIndex = i;
      sketchPad?.setColor(color);
      projectilePad?.setColor(color);
      // Redraw previous and current
      if (prevIdx !== i && splatCanvases[prevIdx]) {
        drawSplat(splatCanvases[prevIdx], SPLAT_COLORS[prevIdx], prevIdx * 3.7 + 1.2, false, false);
      }
      drawSplat(splatCanvas, color, seed, true, false);
    });

    splatCanvases.push(splatCanvas);
    container.appendChild(splatCanvas);
  }

  parchmentWrap.appendChild(container);
  return container;
}

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

// --- Subtype button rendering ---

function drawSubtypeButton(
  canvas: HTMLCanvasElement,
  wt: SubtypeOption,
  selected: boolean
): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = selected ? '#e8d5a3' : '#f4e4c1';
  roundedRect(ctx, 2, 2, w - 4, h - 4, 6);
  ctx.fill();

  // Border
  ctx.strokeStyle = selected ? '#2a1a0a' : 'rgba(42, 26, 10, 0.4)';
  ctx.lineWidth = selected ? 2 : 1;
  drawRoughRect(ctx, 3, 3, w - 6, h - 6, selected ? 1.5 : 1);

  // Icon
  ctx.font = '16px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2a1a0a';
  ctx.fillText(wt.icon, w / 2, h / 2 - 6);

  // Label
  ctx.font = '600 9px "Courier New", monospace';
  ctx.fillText(wt.label, w / 2, h / 2 + 12);
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
  ctx.fillText('FORGE', w / 2, h / 2);
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

// --- Prompt placeholder helpers ---

function getPromptPlaceholder(categoryId: string): string {
  switch (categoryId) {
    case 'weapon':
      return 'e.g. Flaming sword with dragon guard';
    case 'enemy':
      return 'e.g. Shadow goblin with glowing eyes';
    case 'decoration':
      return 'e.g. Ancient battle scene painting';
    default:
      return 'Describe your creation...';
  }
}

// --- Subtype bar ---

/** Rebuild the subtype horizontal bar for the current category */
function rebuildSubtypeBar(): void {
  if (!subtypeContainer) return;
  // Clear old buttons
  while (subtypeContainer.firstChild) subtypeContainer.removeChild(subtypeContainer.firstChild);
  subtypeButtons = [];

  const subtypes = getSubtypesForCategory(selectedCategoryId);
  if (subtypes.length === 0) {
    subtypeContainer.style.display = 'none';
    return;
  }

  // Default to first subtype if current selection doesn't belong to this category
  if (!subtypes.some(s => s.id === selectedSubtype)) {
    selectedSubtype = subtypes[0].id;
  }

  for (const st of subtypes) {
    const btn = document.createElement('button');
    Object.assign(btn.style, {
      background: 'none',
      border: 'none',
      padding: '0',
      cursor: 'pointer',
      display: 'block',
    });
    const btnCanvas = document.createElement('canvas');
    btnCanvas.width = 80;
    btnCanvas.height = 44;
    Object.assign(btnCanvas.style, { width: '80px', height: 'auto' });
    btn.appendChild(btnCanvas);
    drawSubtypeButton(btnCanvas, st, st.id === selectedSubtype);

    btn.addEventListener('click', () => {
      selectedSubtype = st.id;
      updateSubtypeButtons();
      updateProjectilePadVisibility();
    });

    subtypeButtons.push(btn);
    subtypeContainer.appendChild(btn);
  }

  subtypeContainer.style.display = 'flex';
}

function updateSubtypeButtons(): void {
  const subtypes = getSubtypesForCategory(selectedCategoryId);
  for (let i = 0; i < subtypes.length; i++) {
    const st = subtypes[i];
    const btn = subtypeButtons[i];
    if (!btn) continue;
    const canvas = btn.querySelector('canvas')!;
    drawSubtypeButton(canvas, st, st.id === selectedSubtype);
  }
}

function updateProjectilePadVisibility(): void {
  const subtypes = getSubtypesForCategory(selectedCategoryId);
  const selectedSt = subtypes.find(s => s.id === selectedSubtype);
  const shouldShow = selectedCategoryId === 'weapon' && selectedSt?.hasProjectile === true;

  if (shouldShow) {
    projectilePad?.show();
    projectilePadVisible = true;
  } else {
    projectilePad?.hide();
    projectilePadVisible = false;
  }
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
    maxHeight: '700px',
    width: '90vw',
    height: '85vh',
    position: 'relative',
  });

  // --- Left column: weapon types (horizontal) + parchment ---
  const leftColumn = document.createElement('div');
  Object.assign(leftColumn.style, {
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minWidth: '0',
    gap: '0',
  });

  // Subtype bar (horizontal, above parchment — populated per category)
  subtypeContainer = document.createElement('div');
  Object.assign(subtypeContainer.style, {
    display: 'none',
    flexDirection: 'row',
    gap: '4px',
    padding: '6px 8px',
    flexShrink: '0',
    justifyContent: 'center',
    flexWrap: 'wrap',
  });
  leftColumn.appendChild(subtypeContainer);
  rebuildSubtypeBar();

  // --- Parchment + canvas ---
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
  const sidebar = document.createElement('div') as HTMLDivElement;
  Object.assign(sidebar.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '160px',
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
      rebuildSubtypeBar();
      updateProjectilePadVisibility();
      updatePromptPlaceholder();
    });

    categoryButtons.push(btn);
    sidebar.appendChild(btn);
  }

  // Name input
  const nameLabel = document.createElement('div');
  Object.assign(nameLabel.style, {
    color: '#daa520',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    textShadow: '-1px -1px 0 #2a1a0a, 1px -1px 0 #2a1a0a, -1px 1px 0 #2a1a0a, 1px 1px 0 #2a1a0a',
  });
  nameLabel.textContent = 'NAME';
  sidebar.appendChild(nameLabel);

  nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Name your creation';
  nameInput.maxLength = 50;
  Object.assign(nameInput.style, {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    background: '#f4e4c1',
    border: '2px solid #8b7355',
    borderRadius: '6px',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '14px',
    color: '#2a1a0a',
    outline: 'none',
  });
  sidebar.appendChild(nameInput);

  // Prompt label
  const promptLabel = document.createElement('div');
  Object.assign(promptLabel.style, {
    color: '#daa520',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    textShadow: '-1px -1px 0 #2a1a0a, 1px -1px 0 #2a1a0a, -1px 1px 0 #2a1a0a, 1px 1px 0 #2a1a0a',
  });
  promptLabel.textContent = 'DESCRIBE';
  sidebar.appendChild(promptLabel);

  // Text prompt textarea
  promptInput = document.createElement('textarea');
  promptInput.rows = 3;
  promptInput.placeholder = getPromptPlaceholder(selectedCategoryId);
  Object.assign(promptInput.style, {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    background: '#f4e4c1',
    border: '2px solid #8b7355',
    borderRadius: '6px',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '15px',
    color: '#2a1a0a',
    outline: 'none',
    resize: 'vertical',
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

  leftColumn.appendChild(parchmentWrap);
  panel.appendChild(leftColumn);
  panel.appendChild(sidebar);
  root.appendChild(panel);

  // Close on background click
  root.addEventListener('click', (e) => {
    if (e.target === root) hideDrawingOverlay();
  });

  // Create sketch pad
  document.body.appendChild(root);
  sketchPad = createSketchPad(canvasWrap);

  // Build color splat palette on parchment
  buildSplatPalette(parchmentWrap as HTMLDivElement);

  // Build projectile pad on parchment
  projectilePad = createProjectilePad(parchmentWrap);
  projectilePadVisible = false;
  updateProjectilePadVisibility();

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

// updateWeaponTypeVisibility removed — rebuildSubtypeBar handles all categories

function updatePromptPlaceholder(): void {
  if (!promptInput) return;
  promptInput.placeholder = getPromptPlaceholder(selectedCategoryId);
}

function handleGenerate(): void {
  if (!sketchPad || !pendingResolve) return;

  const result: DrawingResult = {
    imageData: sketchPad.toDataURL(),
    categoryId: selectedCategoryId,
    textPrompt: promptInput?.value ?? '',
    name: nameInput?.value?.trim() || '',
    width: sketchPad.canvas.width,
    height: sketchPad.canvas.height,
    weaponType: selectedSubtype,
    projectileImageData: (projectilePad && projectilePadVisible) ? projectilePad.toDataURL() : undefined,
    projectileDominantColor: (projectilePad && projectilePadVisible) ? projectilePad.getDominantColor() : undefined,
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

  // Cleanup projectile pad
  if (projectilePad) {
    projectilePad.destroy();
    projectilePad = null;
    projectilePadVisible = false;
  }

  // Cleanup splat palette
  splatCanvases = [];

  // Cleanup subtype buttons
  subtypeButtons = [];
  subtypeContainer = null;

  sketchPad?.destroy();
  sketchPad = null;
  overlay.remove();
  overlay = null;
  isVisible = false;
  categoryButtons = [];
  nameInput = null;
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
