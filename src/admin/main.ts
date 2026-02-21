const API_BASE = '/api/admin';

interface AdminItem {
  id: number;
  name: string;
  category: 'weapon' | 'enemy' | 'decoration';
  subtype: string;
  has_sketch: boolean;
  has_output: boolean;
  created_at: string;
  thumbnail: string | null;
}

interface Stats {
  weapons: number;
  enemies: number;
  decorations: number;
  total: number;
}

let adminSecret = '';
let items: AdminItem[] = [];
let selectedIds = new Set<string>(); // "category:id"
let filterCategory = '';

function key(item: AdminItem): string {
  return `${item.category}:${item.id}`;
}

/** Remove all children from an element safely */
function clearChildren(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

// ─── Auth ────────────────────────────────────────────────────────────────

async function apiCall(path: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Secret': adminSecret,
      ...(opts.headers || {}),
    },
  });
}

async function authenticate(secret: string): Promise<boolean> {
  adminSecret = secret;
  const res = await apiCall('/auth', { method: 'POST' });
  return res.ok;
}

// ─── Login Screen ────────────────────────────────────────────────────────

function showLogin(): void {
  clearChildren(document.body);
  const wrap = mkEl('div', {
    style: 'display:flex;align-items:center;justify-content:center;min-height:100vh;',
  });
  const card = mkEl('div', {
    style: `
      background: #1a1a24; border: 1px solid #333; border-radius: 12px;
      padding: 48px; max-width: 400px; width: 90%; text-align: center;
    `,
  });
  card.appendChild(mkEl('h1', {
    style: 'font-size:24px;margin-bottom:8px;color:#daa520;',
    textContent: 'DungeonSlopper Admin',
  }));
  card.appendChild(mkEl('p', {
    style: 'color:#888;margin-bottom:32px;font-size:14px;',
    textContent: 'Enter the admin secret to continue',
  }));

  const input = mkEl('input', {
    type: 'password',
    placeholder: 'Admin Secret',
    style: `
      width: 100%; padding: 12px 16px; font-size: 16px; border-radius: 8px;
      border: 1px solid #444; background: #0a0a0f; color: #e8e0d0;
      outline: none; margin-bottom: 16px;
    `,
  }) as HTMLInputElement;

  const error = mkEl('p', {
    style: 'color:#e74c3c;font-size:13px;margin-bottom:16px;display:none;',
    textContent: 'Invalid secret. Try again.',
  });

  const btn = mkEl('button', {
    textContent: 'Sign In',
    style: `
      width: 100%; padding: 12px; font-size: 16px; font-weight: 600;
      border: none; border-radius: 8px; background: #daa520; color: #1a1a24;
      cursor: pointer; transition: background 0.2s;
    `,
  });

  async function submit(): Promise<void> {
    const val = input.value.trim();
    if (!val) return;
    btn.textContent = 'Authenticating...';
    (btn as HTMLButtonElement).disabled = true;
    const ok = await authenticate(val);
    if (ok) {
      sessionStorage.setItem('admin_secret', val);
      showDashboard();
    } else {
      error.style.display = 'block';
      btn.textContent = 'Sign In';
      (btn as HTMLButtonElement).disabled = false;
      input.focus();
    }
  }

  btn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') submit(); });

  card.appendChild(input);
  card.appendChild(error);
  card.appendChild(btn);
  wrap.appendChild(card);
  document.body.appendChild(wrap);
  input.focus();
}

// ─── Dashboard ───────────────────────────────────────────────────────────

async function showDashboard(): Promise<void> {
  clearChildren(document.body);
  document.body.appendChild(buildLayout());
  await refreshData();
}

function buildLayout(): HTMLElement {
  const root = mkEl('div', { style: 'max-width:1200px;margin:0 auto;padding:24px;' });

  // Header
  const header = mkEl('div', {
    style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;',
  });
  header.appendChild(mkEl('h1', {
    style: 'font-size:22px;color:#daa520;',
    textContent: 'DungeonSlopper Admin',
  }));
  const logout = mkEl('button', {
    textContent: 'Sign Out',
    style: `
      padding: 8px 16px; font-size: 13px; border: 1px solid #444; border-radius: 6px;
      background: transparent; color: #888; cursor: pointer;
    `,
  });
  logout.addEventListener('click', () => {
    sessionStorage.removeItem('admin_secret');
    adminSecret = '';
    showLogin();
  });
  header.appendChild(logout);
  root.appendChild(header);

  // Stats bar
  const statsBar = mkEl('div', {
    id: 'stats-bar',
    style: 'display:flex;gap:12px;margin-bottom:24px;',
  });
  root.appendChild(statsBar);

  // Toolbar
  const toolbar = mkEl('div', {
    style: 'display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;',
  });

  // Category filter
  const categories = ['', 'weapon', 'enemy', 'decoration'];
  const labels = ['All', 'Weapons', 'Enemies', 'Decorations'];
  categories.forEach((cat, i) => {
    const btn = mkEl('button', {
      textContent: labels[i],
      className: 'filter-btn',
      style: filterBtnStyle(cat === filterCategory),
    });
    btn.addEventListener('click', () => {
      filterCategory = cat;
      document.querySelectorAll('.filter-btn').forEach((b, j) => {
        (b as HTMLElement).style.cssText = filterBtnStyle(categories[j] === filterCategory);
      });
      renderTable();
    });
    toolbar.appendChild(btn);
  });

  // Bulk actions
  const bulkDelete = mkEl('button', {
    id: 'bulk-delete-btn',
    textContent: 'Delete Selected (0)',
    style: `
      margin-left:auto; padding:8px 16px; font-size:13px; border:1px solid #e74c3c;
      border-radius:6px; background:transparent; color:#e74c3c; cursor:pointer;
      opacity:0.4; pointer-events:none;
    `,
  });
  bulkDelete.addEventListener('click', bulkDeleteSelected);
  toolbar.appendChild(bulkDelete);

  root.appendChild(toolbar);

  // Table container
  root.appendChild(mkEl('div', { id: 'table-container' }));

  return root;
}

function filterBtnStyle(active: boolean): string {
  return active
    ? 'padding:8px 16px;font-size:13px;border:1px solid #daa520;border-radius:6px;background:#daa520;color:#1a1a24;cursor:pointer;font-weight:600;'
    : 'padding:8px 16px;font-size:13px;border:1px solid #444;border-radius:6px;background:transparent;color:#aaa;cursor:pointer;';
}

async function refreshData(): Promise<void> {
  const [itemsRes, statsRes] = await Promise.all([
    apiCall('/creations'),
    apiCall('/stats'),
  ]);
  if (!itemsRes.ok || !statsRes.ok) {
    if (itemsRes.status === 401 || statsRes.status === 401) {
      showLogin();
      return;
    }
    return;
  }
  const itemsData = await itemsRes.json();
  const statsData: Stats = await statsRes.json();
  items = itemsData.items;
  selectedIds.clear();
  renderStats(statsData);
  renderTable();
}

function renderStats(stats: Stats): void {
  const bar = document.getElementById('stats-bar');
  if (!bar) return;
  clearChildren(bar);
  const entries = [
    { label: 'Total', value: stats.total, color: '#daa520' },
    { label: 'Weapons', value: stats.weapons, color: '#4a90d9' },
    { label: 'Enemies', value: stats.enemies, color: '#e74c3c' },
    { label: 'Decorations', value: stats.decorations, color: '#27ae60' },
  ];
  for (const e of entries) {
    const card = mkEl('div', {
      style: `
        flex:1; background:#1a1a24; border:1px solid #333; border-radius:8px;
        padding:16px; text-align:center; min-width:120px;
      `,
    });
    card.appendChild(mkEl('div', {
      style: `font-size:28px;font-weight:700;color:${e.color};`,
      textContent: String(e.value),
    }));
    card.appendChild(mkEl('div', {
      style: 'font-size:12px;color:#888;margin-top:4px;text-transform:uppercase;letter-spacing:1px;',
      textContent: e.label,
    }));
    bar.appendChild(card);
  }
}

function renderTable(): void {
  const container = document.getElementById('table-container');
  if (!container) return;
  clearChildren(container);

  const filtered = filterCategory
    ? items.filter((i) => i.category === filterCategory)
    : items;

  if (filtered.length === 0) {
    container.appendChild(mkEl('p', {
      style: 'text-align:center;color:#666;padding:48px;',
      textContent: 'No creations found.',
    }));
    return;
  }

  const table = mkEl('table', {
    style: `
      width:100%; border-collapse:collapse; background:#1a1a24;
      border:1px solid #333; border-radius:8px; overflow:hidden;
    `,
  });

  // Header
  const thead = mkEl('thead');
  const headerRow = mkEl('tr', { style: 'background:#111118;' });
  const headerCells = ['', 'Thumb', 'Name', 'Category', 'Subtype', 'Created', 'Actions'];
  headerCells.forEach((text) => {
    const th = mkEl('th', {
      textContent: text,
      style: 'padding:12px 16px;text-align:left;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #333;',
    });
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = mkEl('tbody');
  for (const item of filtered) {
    const k = key(item);
    const row = mkEl('tr', {
      style: 'border-bottom:1px solid #222;transition:background 0.15s;',
    });
    row.addEventListener('mouseenter', () => { row.style.background = '#1e1e2a'; });
    row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });

    // Checkbox
    const checkTd = mkEl('td', { style: 'padding:12px 16px;width:40px;' });
    const checkbox = mkEl('input', { type: 'checkbox' }) as HTMLInputElement;
    checkbox.checked = selectedIds.has(k);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedIds.add(k);
      else selectedIds.delete(k);
      updateBulkButton();
    });
    checkTd.appendChild(checkbox);
    row.appendChild(checkTd);

    // Thumbnail
    const thumbTd = mkEl('td', { style: 'padding:8px 16px;width:56px;' });
    if (item.thumbnail) {
      const img = mkEl('img', {
        style: 'width:40px;height:40px;object-fit:cover;border-radius:4px;border:1px solid #333;',
      }) as HTMLImageElement;
      img.src = item.thumbnail;
      thumbTd.appendChild(img);
    } else {
      thumbTd.appendChild(mkEl('div', {
        style: 'width:40px;height:40px;border-radius:4px;background:#222;border:1px solid #333;',
      }));
    }
    row.appendChild(thumbTd);

    // Name
    row.appendChild(mkEl('td', {
      textContent: item.name,
      style: 'padding:12px 16px;font-weight:500;',
    }));

    // Category badge
    const catTd = mkEl('td', { style: 'padding:12px 16px;' });
    const badgeColors: Record<string, string> = {
      weapon: '#4a90d9',
      enemy: '#e74c3c',
      decoration: '#27ae60',
    };
    const badge = mkEl('span', {
      textContent: item.category,
      style: `
        display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;
        background:${badgeColors[item.category] || '#666'}22;
        color:${badgeColors[item.category] || '#666'};
        border:1px solid ${badgeColors[item.category] || '#666'}44;
        text-transform:capitalize;
      `,
    });
    catTd.appendChild(badge);
    row.appendChild(catTd);

    // Subtype
    row.appendChild(mkEl('td', {
      textContent: item.subtype,
      style: 'padding:12px 16px;color:#888;font-size:13px;',
    }));

    // Date
    const date = new Date(item.created_at);
    row.appendChild(mkEl('td', {
      textContent: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      style: 'padding:12px 16px;color:#666;font-size:13px;',
    }));

    // Actions
    const actionTd = mkEl('td', { style: 'padding:12px 16px;' });
    const delBtn = mkEl('button', {
      textContent: 'Delete',
      style: `
        padding:6px 12px;font-size:12px;border:1px solid #e74c3c44;border-radius:4px;
        background:transparent;color:#e74c3c;cursor:pointer;transition:all 0.15s;
      `,
    });
    delBtn.addEventListener('mouseenter', () => {
      delBtn.style.background = '#e74c3c';
      delBtn.style.color = '#fff';
    });
    delBtn.addEventListener('mouseleave', () => {
      delBtn.style.background = 'transparent';
      delBtn.style.color = '#e74c3c';
    });
    delBtn.addEventListener('click', () => deleteSingle(item));
    actionTd.appendChild(delBtn);
    row.appendChild(actionTd);

    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  container.appendChild(table);
  updateBulkButton();
}

function updateBulkButton(): void {
  const btn = document.getElementById('bulk-delete-btn') as HTMLButtonElement | null;
  if (!btn) return;
  const count = selectedIds.size;
  btn.textContent = `Delete Selected (${count})`;
  btn.style.opacity = count > 0 ? '1' : '0.4';
  btn.style.pointerEvents = count > 0 ? 'auto' : 'none';
}

// ─── Delete Operations ───────────────────────────────────────────────────

async function deleteSingle(item: AdminItem): Promise<void> {
  if (!confirm(`Delete "${item.name}" (${item.category} #${item.id})?\n\nThis cannot be undone.`)) return;

  const res = await apiCall(`/creations/${item.category}/${item.id}`, { method: 'DELETE' });
  if (res.ok) {
    await refreshData();
  } else {
    alert('Delete failed. Check console.');
    console.error(await res.text());
  }
}

async function bulkDeleteSelected(): Promise<void> {
  if (selectedIds.size === 0) return;
  if (!confirm(`Delete ${selectedIds.size} item(s)?\n\nThis cannot be undone.`)) return;

  const deleteItems = Array.from(selectedIds).map((k) => {
    const [category, id] = k.split(':');
    return { category, id: parseInt(id, 10) };
  });

  const res = await apiCall('/creations/bulk', {
    method: 'DELETE',
    body: JSON.stringify({ items: deleteItems }),
  });
  if (res.ok) {
    await refreshData();
  } else {
    alert('Bulk delete failed. Check console.');
    console.error(await res.text());
  }
}

// ─── Util ────────────────────────────────────────────────────────────────

function mkEl(tag: string, props: Record<string, unknown> = {}): HTMLElement {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'style') (e as HTMLElement).style.cssText = v as string;
    else if (k === 'textContent') e.textContent = v as string;
    else if (k === 'className') e.className = v as string;
    else (e as unknown as Record<string, unknown>)[k] = v;
  }
  return e;
}

// ─── Init ────────────────────────────────────────────────────────────────

const stored = sessionStorage.getItem('admin_secret');
if (stored) {
  adminSecret = stored;
  authenticate(stored).then((ok) => {
    if (ok) showDashboard();
    else showLogin();
  });
} else {
  showLogin();
}
