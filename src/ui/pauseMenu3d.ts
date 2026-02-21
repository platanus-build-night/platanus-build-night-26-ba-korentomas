/**
 * 3D Pause Menu — camera-attached Three.js text overlay.
 *
 * Replaces the DOM-based pause menu with 3D TextGeometry buttons
 * rendered through the existing EffectComposer pipeline. Meshes are
 * pre-created (async) and added/removed from the camera on show/hide.
 */

import * as THREE from 'three';
import {
  createOverlayBackdrop,
  createOverlayText,
  createOverlayButton,
  disposeOverlayObjects,
  type TextMeshResult,
  type ButtonResult,
} from './overlay3d';

/* ------------------------------------------------------------------ */
/*  Types (same interface as the DOM pause menu)                       */
/* ------------------------------------------------------------------ */

export interface PauseMenuCallbacks {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export interface PauseMenu {
  show: () => void;
  hide: () => void;
  isVisible: () => boolean;
  dispose: () => void;
  setCallbacks: (cb: PauseMenuCallbacks) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const Z_DEPTH = -7;
const BUTTON_SIZE = 0.45;
const HOVER_EMISSIVE = 2.55;
const DEFAULT_EMISSIVE = 2.4;

/* ------------------------------------------------------------------ */
/*  Factory                                                            */
/* ------------------------------------------------------------------ */

export async function createPauseMenu3D(
  camera: THREE.PerspectiveCamera,
): Promise<PauseMenu> {
  let visible = false;
  let callbacks: PauseMenuCallbacks | null = null;
  let disposed = false;
  let rafId = 0;

  // ---- Pre-create all meshes ----

  // Backdrop
  const backdrop = createOverlayBackdrop(0.7);

  // Title: "PAUSED"
  const titleResult: TextMeshResult = await createOverlayText('PAUSED', {
    size: 1.2,
    color: 0xdaa520,
    emissive: 0xcc7700,
    emissiveIntensity: 2.45,
    letterSpacing: 0.15,
  });
  titleResult.mesh.position.set(0, 1.8, Z_DEPTH);

  // Buttons
  const resumeBtn: ButtonResult = await createOverlayButton('Resume', {
    size: BUTTON_SIZE,
    color: 0xdaa520,
    emissive: 0xcc7700,
    emissiveIntensity: DEFAULT_EMISSIVE,
  });
  resumeBtn.mesh.position.set(0, 0.3, Z_DEPTH);

  const restartBtn: ButtonResult = await createOverlayButton('Restart', {
    size: BUTTON_SIZE,
    color: 0xdaa520,
    emissive: 0xcc7700,
    emissiveIntensity: DEFAULT_EMISSIVE,
  });
  restartBtn.mesh.position.set(0, -0.6, Z_DEPTH);

  const quitBtn: ButtonResult = await createOverlayButton('Quit to Menu', {
    size: BUTTON_SIZE,
    color: 0xdaa520,
    emissive: 0xcc7700,
    emissiveIntensity: DEFAULT_EMISSIVE,
  });
  quitBtn.mesh.position.set(0, -1.5, Z_DEPTH);

  // Hint text
  const hintResult: TextMeshResult = await createOverlayText(
    'Press ESC to resume',
    {
      size: 0.18,
      color: 0xdaa520,
      emissive: 0xcc7700,
      emissiveIntensity: 0.8,
    },
  );
  hintResult.mesh.position.set(0, -2.5, Z_DEPTH);

  // ---- Raycaster + hover state ----

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(9999, 9999); // offscreen default

  const buttons: Array<{ btn: ButtonResult; action: 'resume' | 'restart' | 'quit' }> = [
    { btn: resumeBtn, action: 'resume' },
    { btn: restartBtn, action: 'restart' },
    { btn: quitBtn, action: 'quit' },
  ];

  // Cache hit area array for raycasting (avoid allocations)
  const hitAreas = buttons.map(b => b.btn.hitArea);

  let hoveredAction: 'resume' | 'restart' | 'quit' | null = null;

  // ---- Event handlers ----

  const onPointerMove = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };

  const onClick = (e: MouseEvent) => {
    if (!visible || !callbacks) return;
    e.stopPropagation();
    if (hoveredAction === 'resume') callbacks.onResume();
    else if (hoveredAction === 'restart') callbacks.onRestart();
    else if (hoveredAction === 'quit') callbacks.onQuit();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!visible) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      callbacks?.onResume();
    }
  };

  // ---- Hover detection loop ----

  function hoverLoop() {
    if (!visible || disposed) return;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(hitAreas, false);

    let newHovered: 'resume' | 'restart' | 'quit' | null = null;

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      for (const entry of buttons) {
        if (entry.btn.hitArea === hit) {
          newHovered = entry.action;
          break;
        }
      }
    }

    // Update hover visuals only on change
    if (newHovered !== hoveredAction) {
      // Reset previous
      if (hoveredAction !== null) {
        const prev = buttons.find(b => b.action === hoveredAction);
        if (prev) prev.btn.material.emissiveIntensity = DEFAULT_EMISSIVE;
      }
      // Highlight new
      if (newHovered !== null) {
        const curr = buttons.find(b => b.action === newHovered);
        if (curr) curr.btn.material.emissiveIntensity = HOVER_EMISSIVE;
        document.body.style.cursor = 'pointer';
      } else {
        document.body.style.cursor = 'default';
      }
      hoveredAction = newHovered;
    }

    rafId = requestAnimationFrame(hoverLoop);
  }

  // ---- Show / Hide ----

  function addMeshesToCamera() {
    camera.add(backdrop);
    camera.add(titleResult.mesh);
    camera.add(resumeBtn.mesh);
    camera.add(restartBtn.mesh);
    camera.add(quitBtn.mesh);
    camera.add(hintResult.mesh);
  }

  function removeMeshesFromCamera() {
    camera.remove(backdrop);
    camera.remove(titleResult.mesh);
    camera.remove(resumeBtn.mesh);
    camera.remove(restartBtn.mesh);
    camera.remove(quitBtn.mesh);
    camera.remove(hintResult.mesh);
  }

  function show() {
    if (visible || disposed) return;
    visible = true;
    addMeshesToCamera();

    // Start event listeners + hover loop
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown, true);
    rafId = requestAnimationFrame(hoverLoop);
  }

  function hide() {
    if (!visible) return;
    visible = false;
    removeMeshesFromCamera();

    // Stop event listeners + hover loop
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKeyDown, true);
    cancelAnimationFrame(rafId);
    rafId = 0;

    // Reset cursor
    document.body.style.cursor = 'default';
    hoveredAction = null;

    // Reset button emissive intensities
    for (const entry of buttons) {
      entry.btn.material.emissiveIntensity = DEFAULT_EMISSIVE;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    hide();

    // Dispose backdrop
    (backdrop.geometry as THREE.BufferGeometry).dispose();
    (backdrop.material as THREE.Material).dispose();

    // Dispose text + buttons
    disposeOverlayObjects([
      titleResult,
      { geometry: resumeBtn.geometry, material: resumeBtn.material, mesh: resumeBtn.mesh },
      { geometry: restartBtn.geometry, material: restartBtn.material, mesh: restartBtn.mesh },
      { geometry: quitBtn.geometry, material: quitBtn.material, mesh: quitBtn.mesh },
      hintResult,
    ]);

    // Dispose hit area geometries/materials
    for (const entry of buttons) {
      entry.btn.hitArea.geometry.dispose();
      (entry.btn.hitArea.material as THREE.Material).dispose();
    }
  }

  return {
    show,
    hide,
    isVisible: () => visible,
    dispose,
    setCallbacks: (cb: PauseMenuCallbacks) => { callbacks = cb; },
  };
}
