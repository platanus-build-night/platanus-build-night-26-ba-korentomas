/**
 * Gallery Overlay — full-screen panel that lets players browse all
 * creations (weapons, enemies, decorations) stored in the database.
 *
 * Opened with showGalleryOverlay(), closed with hideGalleryOverlay()
 * or by pressing Escape.
 *
 * Clicking a card shows a detail modal with the original sketch and
 * AI-generated output side by side.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GalleryItem {
  id: number;
  name: string;
  category: 'weapon' | 'enemy' | 'decoration';
  sketch: string | null;
  output: string | null;
  created_at: string;
}

type CategoryFilter = '' | 'weapon' | 'enemy' | 'decoration';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let overlay: HTMLDivElement | null = null;
let isVisible = false;
let activeCategory: CategoryFilter = '';
let searchQuery = '';
let debounceTimer = 0;
let gridEl: HTMLDivElement | null = null;
let loadingEl: HTMLDivElement | null = null;
let emptyEl: HTMLDivElement | null = null;
let tabButtons: HTMLButtonElement[] = [];
let onCloseCallback: (() => void) | null = null;
let detailModal: HTMLDivElement | null = null;

// ---------------------------------------------------------------------------
// Category badge colors
// ---------------------------------------------------------------------------

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  weapon: { bg: '#8a8a8a', text: '#fff' },
  enemy: { bg: '#8b0000', text: '#fff' },
  decoration: { bg: '#2e6b2e', text: '#fff' },
};

// ---------------------------------------------------------------------------
// Rough border drawing (matches the parchment aesthetic from drawingOverlay)
// ---------------------------------------------------------------------------

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
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

function drawRoughRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  jitter: number,
): void {
  ctx.beginPath();
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const px = x + (w * i) / steps + (Math.random() - 0.5) * jitter;
    const py = y + (Math.random() - 0.5) * jitter;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = 0; i <= steps; i++) {
    const px = x + w + (Math.random() - 0.5) * jitter;
    const py = y + (h * i) / steps + (Math.random() - 0.5) * jitter;
    ctx.lineTo(px, py);
  }
  for (let i = steps; i >= 0; i--) {
    const px = x + (w * i) / steps + (Math.random() - 0.5) * jitter;
    const py = y + h + (Math.random() - 0.5) * jitter;
    ctx.lineTo(px, py);
  }
  for (let i = steps; i >= 0; i--) {
    const px = x + (Math.random() - 0.5) * jitter;
    const py = y + (h * i) / steps + (Math.random() - 0.5) * jitter;
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawParchmentPanel(canvas: HTMLCanvasElement): void {
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
  for (let i = 0; i < 10; i++) {
    const sx = 40 + Math.random() * (w - 80);
    const sy = 40 + Math.random() * (h - 80);
    const sr = 20 + Math.random() * 50;
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

  // Inner border
  ctx.strokeStyle = 'rgba(42, 26, 10, 0.3)';
  ctx.lineWidth = 2;
  drawRoughRect(ctx, 18, 18, w - 36, h - 36, 2);
}

// ---------------------------------------------------------------------------
// Fetch gallery data
// ---------------------------------------------------------------------------

async function fetchGallery(search: string, category: CategoryFilter): Promise<GalleryItem[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  const qs = params.toString();
  const url = `/api/gallery${qs ? '?' + qs : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gallery fetch failed: ${res.status}`);
  return (await res.json()) as GalleryItem[];
}

// ---------------------------------------------------------------------------
// Render functions
// ---------------------------------------------------------------------------

function showLoading(): void {
  if (loadingEl) loadingEl.style.display = 'flex';
  if (gridEl) gridEl.style.display = 'none';
  if (emptyEl) emptyEl.style.display = 'none';
}

function showEmpty(): void {
  if (loadingEl) loadingEl.style.display = 'none';
  if (gridEl) gridEl.style.display = 'none';
  if (emptyEl) emptyEl.style.display = 'flex';
}

function showGrid(): void {
  if (loadingEl) loadingEl.style.display = 'none';
  if (gridEl) gridEl.style.display = 'grid';
  if (emptyEl) emptyEl.style.display = 'none';
}

// ---------------------------------------------------------------------------
// Detail modal (side-by-side sketch vs output)
// ---------------------------------------------------------------------------

function hideDetail(): void {
  if (detailModal) {
    detailModal.remove();
    detailModal = null;
  }
}

function showDetail(item: GalleryItem): void {
  hideDetail();

  const modal = document.createElement('div');
  detailModal = modal;
  Object.assign(modal.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '10',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.6)',
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideDetail();
  });

  // Detail panel
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'relative',
    background: '#f4e4c1',
    borderRadius: '12px',
    border: '3px solid #2a1a0a',
    padding: '24px',
    maxWidth: '680px',
    width: '90%',
    maxHeight: '80%',
    overflow: 'auto',
    fontFamily: '"Courier New", Courier, monospace',
    boxSizing: 'border-box',
  });

  // Header row: name + badge + close
  const headerRow = document.createElement('div');
  Object.assign(headerRow.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    gap: '12px',
  });

  // Left side: name + badge
  const headerLeft = document.createElement('div');
  Object.assign(headerLeft.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: '0',
    flex: '1',
  });

  const nameEl = document.createElement('div');
  Object.assign(nameEl.style, {
    fontWeight: 'bold',
    fontSize: '18px',
    color: '#3a2a1a',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  });
  nameEl.textContent = item.name;
  nameEl.title = item.name;
  headerLeft.appendChild(nameEl);

  const badge = document.createElement('span');
  const colors = BADGE_COLORS[item.category] || BADGE_COLORS.weapon;
  Object.assign(badge.style, {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '10px',
    background: colors.bg,
    color: colors.text,
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    flexShrink: '0',
  });
  badge.textContent = item.category;
  headerLeft.appendChild(badge);
  headerRow.appendChild(headerLeft);

  // Close button
  const closeBtn = document.createElement('button');
  Object.assign(closeBtn.style, {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.6)',
    border: '2px solid rgba(255,136,48,0.5)',
    color: '#ff9944',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
    lineHeight: '1',
    flexShrink: '0',
  });
  closeBtn.textContent = '\u00D7';
  closeBtn.addEventListener('click', hideDetail);
  headerRow.appendChild(closeBtn);
  panel.appendChild(headerRow);

  // Side-by-side images
  const imageRow = document.createElement('div');
  Object.assign(imageRow.style, {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  });

  // Helper to create an image column
  function createImageColumn(src: string | null, label: string, isWeaponOutput: boolean): HTMLDivElement {
    const col = document.createElement('div');
    Object.assign(col.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
    });

    const imgWrap = document.createElement('div');
    Object.assign(imgWrap.style, {
      width: '260px',
      height: '260px',
      background: 'rgba(42, 26, 10, 0.08)',
      border: '2px solid rgba(42, 26, 10, 0.2)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    });

    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = label;
      Object.assign(img.style, {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
      });
      imgWrap.appendChild(img);
    } else if (isWeaponOutput) {
      // Weapon output placeholder
      const placeholder = document.createElement('div');
      Object.assign(placeholder.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        color: 'rgba(42, 26, 10, 0.4)',
        textAlign: 'center',
        padding: '20px',
      });
      const icon = document.createElement('div');
      icon.style.fontSize = '48px';
      icon.textContent = '\u2694';
      placeholder.appendChild(icon);
      const text = document.createElement('div');
      text.style.fontSize = '12px';
      text.textContent = '3D Model Generated';
      placeholder.appendChild(text);
      imgWrap.appendChild(placeholder);
    } else {
      const placeholder = document.createElement('div');
      Object.assign(placeholder.style, {
        color: 'rgba(42, 26, 10, 0.3)',
        fontSize: '48px',
      });
      placeholder.textContent = '?';
      imgWrap.appendChild(placeholder);
    }

    col.appendChild(imgWrap);

    const labelEl = document.createElement('div');
    Object.assign(labelEl.style, {
      fontSize: '12px',
      fontWeight: '600',
      color: 'rgba(58, 42, 26, 0.6)',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    });
    labelEl.textContent = label;
    col.appendChild(labelEl);

    return col;
  }

  // For weapons: output is same as sketch, so show the weapon placeholder for output
  const isWeapon = item.category === 'weapon';
  const showWeaponPlaceholder = isWeapon && item.output === item.sketch;

  imageRow.appendChild(createImageColumn(item.sketch, 'Your Drawing', false));
  imageRow.appendChild(
    createImageColumn(
      showWeaponPlaceholder ? null : item.output,
      'AI Result',
      showWeaponPlaceholder,
    ),
  );

  panel.appendChild(imageRow);
  modal.appendChild(panel);

  // Append to the overlay's panel wrapper (find it)
  if (overlay) {
    const panelWrap = overlay.querySelector('#gallery-overlay > div');
    if (panelWrap) {
      panelWrap.appendChild(modal);
    } else {
      overlay.appendChild(modal);
    }
  }
}

// ---------------------------------------------------------------------------
// Card rendering
// ---------------------------------------------------------------------------

function renderCards(items: GalleryItem[]): void {
  if (!gridEl) return;
  // Clear previous cards
  while (gridEl.firstChild) {
    gridEl.removeChild(gridEl.firstChild);
  }

  if (items.length === 0) {
    showEmpty();
    return;
  }

  for (const item of items) {
    const card = document.createElement('div');
    Object.assign(card.style, {
      background: 'rgba(244, 228, 193, 0.6)',
      border: '2px solid rgba(42, 26, 10, 0.3)',
      borderRadius: '10px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      cursor: 'pointer',
      transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    });
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = '#daa520';
      card.style.transform = 'translateY(-3px)';
      card.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.borderColor = 'rgba(42, 26, 10, 0.3)';
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
    });
    card.addEventListener('click', () => showDetail(item));

    // Thumbnail — prefer output, fall back to sketch
    const thumbSrc = item.output || item.sketch;
    const thumbWrap = document.createElement('div');
    Object.assign(thumbWrap.style, {
      width: '100%',
      aspectRatio: '1 / 1',
      background: 'rgba(42, 26, 10, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    });

    if (thumbSrc) {
      const img = document.createElement('img');
      img.src = thumbSrc;
      img.alt = item.name;
      Object.assign(img.style, {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
      });
      thumbWrap.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      Object.assign(placeholder.style, {
        color: 'rgba(42, 26, 10, 0.3)',
        fontSize: '32px',
      });
      placeholder.textContent = item.category === 'weapon' ? '\u2694'
        : item.category === 'enemy' ? '\uD83D\uDC7E'
        : '\uD83C\uDFA8';
      thumbWrap.appendChild(placeholder);
    }
    card.appendChild(thumbWrap);

    // Info area
    const info = document.createElement('div');
    Object.assign(info.style, {
      padding: '10px 10px 8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    });

    // Name
    const nameEl = document.createElement('div');
    Object.assign(nameEl.style, {
      fontFamily: '"Courier New", Courier, monospace',
      fontWeight: '700',
      fontSize: '15px',
      color: '#3a2a1a',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    });
    nameEl.textContent = item.name;
    nameEl.title = item.name;
    info.appendChild(nameEl);

    // Category badge
    const badge = document.createElement('span');
    const badgeColors = BADGE_COLORS[item.category] || BADGE_COLORS.weapon;
    Object.assign(badge.style, {
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '10px',
      background: badgeColors.bg,
      color: badgeColors.text,
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '11px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      alignSelf: 'flex-start',
    });
    badge.textContent = item.category;
    info.appendChild(badge);

    card.appendChild(info);
    gridEl.appendChild(card);
  }

  showGrid();
}

async function refreshGallery(): Promise<void> {
  showLoading();
  try {
    const items = await fetchGallery(searchQuery, activeCategory);
    renderCards(items);
  } catch (err) {
    console.error('Gallery refresh error:', err);
    renderCards([]);
  }
}

// ---------------------------------------------------------------------------
// Tab update
// ---------------------------------------------------------------------------

function updateTabs(): void {
  const categories: CategoryFilter[] = ['', 'weapon', 'enemy', 'decoration'];
  for (let i = 0; i < tabButtons.length; i++) {
    const isActive = categories[i] === activeCategory;
    Object.assign(tabButtons[i].style, {
      background: isActive ? '#3a2a1a' : 'transparent',
      color: isActive ? '#f4e4c1' : '#3a2a1a',
      borderColor: isActive ? '#3a2a1a' : 'rgba(42, 26, 10, 0.3)',
    });
  }
}

// ---------------------------------------------------------------------------
// Keyboard handler
// ---------------------------------------------------------------------------

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    // If detail modal is open, close it first; otherwise close gallery
    if (detailModal) {
      hideDetail();
    } else {
      hideGalleryOverlay();
    }
  }
}

// ---------------------------------------------------------------------------
// Build overlay DOM
// ---------------------------------------------------------------------------

function buildOverlay(): HTMLDivElement {
  const root = document.createElement('div');
  root.id = 'gallery-overlay';
  Object.assign(root.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '10000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.75)',
    fontFamily: '"Courier New", Courier, monospace',
  });

  // Panel wrapper (sized to fit the parchment)
  const panelWrap = document.createElement('div');
  Object.assign(panelWrap.style, {
    position: 'relative',
    width: '94vw',
    maxWidth: '1200px',
    height: '90vh',
    maxHeight: '860px',
  });

  // Parchment background canvas
  const parchment = document.createElement('canvas');
  parchment.width = 1200;
  parchment.height = 860;
  Object.assign(parchment.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  });
  drawParchmentPanel(parchment);
  panelWrap.appendChild(parchment);

  // Content container (inside the parchment)
  const content = document.createElement('div');
  Object.assign(content.style, {
    position: 'absolute',
    top: '24px',
    left: '28px',
    right: '28px',
    bottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflow: 'hidden',
  });

  // --- Header row: title + close ---
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: '0',
  });

  const title = document.createElement('div');
  Object.assign(title.style, {
    fontFamily: '"Courier New", Courier, monospace',
    fontWeight: 'bold',
    fontSize: '22px',
    color: '#3a2a1a',
    letterSpacing: '1px',
  });
  title.textContent = 'Creation Gallery';
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  Object.assign(closeBtn.style, {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.6)',
    border: '2px solid rgba(255,136,48,0.5)',
    color: '#ff9944',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
    lineHeight: '1',
  });
  closeBtn.textContent = '\u00D7';
  closeBtn.addEventListener('click', hideGalleryOverlay);
  header.appendChild(closeBtn);
  content.appendChild(header);

  // --- Controls row: search + tabs ---
  const controls = document.createElement('div');
  Object.assign(controls.style, {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
    flexShrink: '0',
  });

  // Search input
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search creations...';
  Object.assign(searchInput.style, {
    flex: '1',
    minWidth: '160px',
    padding: '8px 12px',
    background: 'rgba(210, 180, 140, 0.3)',
    border: '2px solid #8b7355',
    borderRadius: '6px',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '14px',
    color: '#3a2a1a',
    outline: 'none',
    boxSizing: 'border-box',
  });
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      refreshGallery();
    }, 300);
  });
  controls.appendChild(searchInput);

  // Category tabs
  const tabRow = document.createElement('div');
  Object.assign(tabRow.style, {
    display: 'flex',
    gap: '4px',
  });

  const tabDefs: { label: string; value: CategoryFilter }[] = [
    { label: 'All', value: '' },
    { label: 'Weapons', value: 'weapon' },
    { label: 'Enemies', value: 'enemy' },
    { label: 'Decorations', value: 'decoration' },
  ];

  tabButtons = [];
  for (const tab of tabDefs) {
    const btn = document.createElement('button');
    Object.assign(btn.style, {
      padding: '6px 14px',
      border: '2px solid rgba(42, 26, 10, 0.3)',
      borderRadius: '6px',
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '12px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.15s',
      background: 'transparent',
      color: '#3a2a1a',
    });
    btn.textContent = tab.label;
    btn.addEventListener('click', () => {
      activeCategory = tab.value;
      updateTabs();
      refreshGallery();
    });
    tabButtons.push(btn);
    tabRow.appendChild(btn);
  }
  controls.appendChild(tabRow);
  content.appendChild(controls);

  // --- Loading spinner ---
  loadingEl = document.createElement('div');
  Object.assign(loadingEl.style, {
    display: 'none',
    flex: '1',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#3a2a1a',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '18px',
  });
  loadingEl.textContent = 'Loading...';
  content.appendChild(loadingEl);

  // --- Empty state ---
  emptyEl = document.createElement('div');
  Object.assign(emptyEl.style, {
    display: 'none',
    flex: '1',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '12px',
    color: 'rgba(58, 42, 26, 0.6)',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '16px',
    textAlign: 'center',
    padding: '20px',
  });
  const emptyIcon = document.createElement('div');
  emptyIcon.style.fontSize = '48px';
  emptyIcon.textContent = '\uD83D\uDD28';
  emptyEl.appendChild(emptyIcon);
  const emptyText = document.createElement('div');
  emptyText.textContent = 'No creations yet \u2014 open the forge to create something!';
  emptyEl.appendChild(emptyText);
  content.appendChild(emptyEl);

  // --- Card grid ---
  gridEl = document.createElement('div');
  Object.assign(gridEl.style, {
    display: 'none',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
    overflowY: 'auto',
    flex: '1',
    padding: '4px 8px 4px 4px',
  });
  content.appendChild(gridEl);

  panelWrap.appendChild(content);
  root.appendChild(panelWrap);

  // Close on backdrop click
  root.addEventListener('click', (e) => {
    if (e.target === root) hideGalleryOverlay();
  });

  return root;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function showGalleryOverlay(onClose?: () => void): void {
  if (isVisible) return;

  onCloseCallback = onClose ?? null;
  activeCategory = '';
  searchQuery = '';

  overlay = buildOverlay();
  document.body.appendChild(overlay);
  isVisible = true;

  // Set initial tab state
  updateTabs();

  // Fetch data
  refreshGallery();

  // Listen for Escape
  document.addEventListener('keydown', onKeyDown, true);
}

export function hideGalleryOverlay(): void {
  if (!isVisible || !overlay) return;

  document.removeEventListener('keydown', onKeyDown, true);
  clearTimeout(debounceTimer);

  hideDetail();

  overlay.remove();
  overlay = null;
  gridEl = null;
  loadingEl = null;
  emptyEl = null;
  tabButtons = [];
  isVisible = false;

  onCloseCallback?.();
  onCloseCallback = null;
}

export function isGalleryOverlayVisible(): boolean {
  return isVisible;
}
