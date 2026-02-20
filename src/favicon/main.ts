import { createSketchPad } from './sketchPad.js';
import { createFaviconPreview } from './faviconPreview.js';
import { createGallery } from './gallery.js';
import { forgeFavicon } from './api.js';

const canvas = document.getElementById('sketch-canvas') as HTMLCanvasElement;
const forgeBtn = document.getElementById('forge-btn') as HTMLButtonElement;
const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
const nameInput = document.getElementById('favicon-name') as HTMLInputElement;
const descriptionInput = document.getElementById('favicon-description') as HTMLTextAreaElement;
const previewContainer = document.getElementById('preview-container') as HTMLElement;
const galleryContainer = document.getElementById('gallery') as HTMLElement;
const loadingOverlay = document.getElementById('loading-overlay') as HTMLElement;
const styleBtns = document.querySelectorAll<HTMLButtonElement>('.weapon-type-btn');

let selectedStyle = 'dark-dungeon';

const sketchPad = createSketchPad(canvas);
const preview = createFaviconPreview(previewContainer);
const gallery = createGallery(galleryContainer, (image, name) => preview.loadImage(image, name));

gallery.refresh();

undoBtn.addEventListener('click', () => sketchPad.undo());
clearBtn.addEventListener('click', () => sketchPad.clear());

styleBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    styleBtns.forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedStyle = btn.dataset.type!;
  });
});

forgeBtn.addEventListener('click', async () => {
  forgeBtn.disabled = true;
  loadingOverlay.classList.remove('hidden');

  try {
    const result = await forgeFavicon(
      sketchPad.toDataURL(),
      nameInput.value.trim(),
      selectedStyle,
      descriptionInput.value.trim()
    );
    preview.loadImage(result.image, result.name);
    nameInput.value = '';
    descriptionInput.value = '';
    gallery.refresh();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Forge failed');
  } finally {
    forgeBtn.disabled = false;
    loadingOverlay.classList.add('hidden');
  }
});
