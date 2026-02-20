import { createSketchPad } from './sketchPad.js';
import { createModelViewer } from './modelViewer.js';
import { createGallery } from './gallery.js';
import { forgeWeapon } from './api.js';

const canvas = document.getElementById('sketch-canvas') as HTMLCanvasElement;
const forgeBtn = document.getElementById('forge-btn') as HTMLButtonElement;
const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
const nameInput = document.getElementById('weapon-name') as HTMLInputElement;
const descriptionInput = document.getElementById('weapon-description') as HTMLTextAreaElement;
const viewerContainer = document.getElementById('viewer-container') as HTMLElement;
const galleryContainer = document.getElementById('gallery') as HTMLElement;
const loadingOverlay = document.getElementById('loading-overlay') as HTMLElement;
const weaponTypeBtns = document.querySelectorAll<HTMLButtonElement>('.weapon-type-btn');

let selectedWeaponType = 'sword';

const sketchPad = createSketchPad(canvas);
const viewer = createModelViewer(viewerContainer);
const gallery = createGallery(galleryContainer, (glb) => viewer.loadGLB(glb));

// Load existing weapons
gallery.refresh();

undoBtn.addEventListener('click', () => sketchPad.undo());
clearBtn.addEventListener('click', () => sketchPad.clear());

weaponTypeBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    weaponTypeBtns.forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedWeaponType = btn.dataset.type!;
  });
});

forgeBtn.addEventListener('click', async () => {
  forgeBtn.disabled = true;
  loadingOverlay.classList.remove('hidden');

  try {
    const result = await forgeWeapon(
      sketchPad.toDataURL(),
      nameInput.value.trim(),
      selectedWeaponType,
      descriptionInput.value.trim()
    );
    await viewer.loadGLB(result.glb);
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
