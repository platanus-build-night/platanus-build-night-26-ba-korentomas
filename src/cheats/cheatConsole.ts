import { executeCheat, searchCheats } from './cheatRegistry';

const HISTORY_MAX = 50;
const TOAST_DURATION_MS = 2500;

let container: HTMLDivElement;
let inputEl: HTMLInputElement;
let suggestionsEl: HTMLDivElement;
let toastEl: HTMLDivElement;
let isOpen = false;
const history: string[] = [];
let historyIndex = -1;
let toastTimeout = 0;
let onCloseCb: (() => void) | null = null;

function createDOM(): void {
  // Container
  container = document.createElement('div');
  container.id = 'cheat-console';
  Object.assign(container.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    zIndex: '9999',
    display: 'none',
    fontFamily: '"Courier New", Courier, monospace',
  });

  // Input bar
  inputEl = document.createElement('input');
  inputEl.type = 'text';
  inputEl.placeholder = 'Enter cheat code...';
  inputEl.spellcheck = false;
  inputEl.autocomplete = 'off';
  Object.assign(inputEl.style, {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 16px',
    background: 'rgba(0, 0, 0, 0.85)',
    border: 'none',
    borderBottom: '1px solid rgba(255, 136, 48, 0.4)',
    color: '#ff9944',
    fontSize: '16px',
    fontFamily: 'inherit',
    outline: 'none',
    letterSpacing: '1px',
  });

  // Autocomplete suggestions
  suggestionsEl = document.createElement('div');
  Object.assign(suggestionsEl.style, {
    background: 'rgba(0, 0, 0, 0.75)',
    padding: '0',
    fontSize: '13px',
    color: 'rgba(255, 136, 48, 0.6)',
    display: 'none',
  });

  container.appendChild(inputEl);
  container.appendChild(suggestionsEl);
  document.body.appendChild(container);

  // Toast (shows cheat result)
  toastEl = document.createElement('div');
  Object.assign(toastEl.style, {
    position: 'fixed',
    top: '60px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 20px',
    background: 'rgba(0, 0, 0, 0.8)',
    border: '1px solid rgba(255, 136, 48, 0.5)',
    borderRadius: '4px',
    color: '#ff9944',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '14px',
    zIndex: '9999',
    opacity: '0',
    transition: 'opacity 0.3s ease',
    pointerEvents: 'none',
    whiteSpace: 'pre-line',
    textAlign: 'center',
    maxWidth: '80%',
  });
  document.body.appendChild(toastEl);

  // Input event handlers
  inputEl.addEventListener('keydown', onInputKeydown);
  inputEl.addEventListener('input', onInputChange);
}

function onInputKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    e.preventDefault();
    const value = inputEl.value.trim();
    if (value) {
      if (history[0] !== value) {
        history.unshift(value);
        if (history.length > HISTORY_MAX) history.pop();
      }
      historyIndex = -1;

      const result = executeCheat(value);
      if (result instanceof Promise) {
        showToast('Running...');
        result.then(msg => showToast(msg)).catch(err => showToast(`Error: ${err}`));
      } else {
        showToast(result);
      }
      inputEl.value = '';
      hideSuggestions();
      close();
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    close();
  } else if (e.key === 'Tab') {
    e.preventDefault();
    const partial = inputEl.value.trim();
    if (partial) {
      const matches = searchCheats(partial);
      if (matches.length === 1) {
        inputEl.value = matches[0].name + ' ';
        hideSuggestions();
      }
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (history.length > 0) {
      historyIndex = Math.min(historyIndex + 1, history.length - 1);
      inputEl.value = history[historyIndex];
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (historyIndex > 0) {
      historyIndex--;
      inputEl.value = history[historyIndex];
    } else {
      historyIndex = -1;
      inputEl.value = '';
    }
  }
}

function onInputChange(): void {
  const partial = inputEl.value.trim();
  if (!partial) {
    hideSuggestions();
    return;
  }
  const matches = searchCheats(partial);
  if (matches.length > 0 && partial !== matches[0]?.name) {
    showSuggestions(matches.map((m) => ({ name: m.name, desc: m.description })));
  } else {
    hideSuggestions();
  }
}

function showSuggestions(items: { name: string; desc: string }[]): void {
  // Clear previous suggestions using safe DOM methods
  while (suggestionsEl.firstChild) {
    suggestionsEl.removeChild(suggestionsEl.firstChild);
  }

  for (const item of items.slice(0, 6)) {
    const row = document.createElement('div');
    Object.assign(row.style, {
      padding: '4px 16px',
      borderBottom: '1px solid rgba(255,136,48,0.1)',
    });
    row.textContent = `${item.name} \u2014 ${item.desc}`;
    suggestionsEl.appendChild(row);
  }
  suggestionsEl.style.display = 'block';
}

function hideSuggestions(): void {
  suggestionsEl.style.display = 'none';
  while (suggestionsEl.firstChild) {
    suggestionsEl.removeChild(suggestionsEl.firstChild);
  }
}

function showToast(message: string): void {
  toastEl.textContent = message;
  toastEl.style.opacity = '1';
  clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toastEl.style.opacity = '0';
  }, TOAST_DURATION_MS);
}

function open(): void {
  isOpen = true;
  container.style.display = 'block';
  inputEl.value = '';
  historyIndex = -1;
  hideSuggestions();
  inputEl.focus();
}

function close(): void {
  isOpen = false;
  container.style.display = 'none';
  inputEl.blur();
  onCloseCb?.();
}

export function setOnCloseCallback(cb: () => void): void {
  onCloseCb = cb;
}

export function isConsoleOpen(): boolean {
  return isOpen;
}

let suppressed = false;

/** Suppress cheat console keybind (e.g. during name entry overlays). */
export function suppressCheatConsole(value: boolean): void {
  suppressed = value;
}

export function initCheatConsole(): void {
  createDOM();

  window.addEventListener('keydown', (e) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    if (suppressed) return;

    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      if (isOpen) {
        close();
      } else {
        open();
      }
    }
  });
}
