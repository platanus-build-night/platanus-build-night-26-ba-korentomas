/**
 * 3D Name Entry — camera-attached Three.js overlay for 3-letter initials.
 *
 * Replaces the DOM-based nameEntry.ts with TextGeometry meshes rendered
 * through the EffectComposer pipeline. Pre-caches all 26 letter geometries
 * to avoid per-keystroke allocations.
 */

import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { getFont } from '../utils/fontLoader';
import {
  createOverlayText,
  createOverlayButton,
  createOverlayBackdrop,
  disposeOverlayObjects,
  type ButtonResult,
} from './overlay3d';
import { suppressCheatConsole } from '../cheats/cheatConsole';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const Z_DEPTH = -7;
const MAX_CHARS = 3;
const SLOT_POSITIONS = [-1.8, 0, 1.8];

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Show the 3D name entry overlay. Resolves with a 3-character name string
 * (padded with underscores if fewer than 3 letters entered).
 */
export function showNameEntry3D(
  camera: THREE.PerspectiveCamera,
): Promise<string> {
  return new Promise<string>((resolve) => {
    const letters: string[] = [];
    let disposed = false;
    let animFrameId = 0;

    // Track all objects for cleanup
    const overlayObjects: Array<{
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material;
      mesh?: THREE.Object3D;
    }> = [];

    // ---- Backdrop ----
    const backdrop = createOverlayBackdrop(0.9);
    camera.add(backdrop);
    overlayObjects.push({ mesh: backdrop, material: backdrop.material as THREE.Material, geometry: backdrop.geometry });

    // Container group for easier management
    const container = new THREE.Group();
    container.position.set(0, 0, Z_DEPTH);
    container.renderOrder = 999;
    camera.add(container);

    // ---- Build UI (async) ----
    buildUI().then(() => {
      suppressCheatConsole(true);
      document.addEventListener('keydown', onKeyDown, { capture: true });
      startAnimLoop();
    });

    // ---- Slot frames ----
    const slotFrames: THREE.Mesh[] = [];
    const slotGroups: THREE.Group[] = [];
    const letterMeshes: (THREE.Mesh | null)[] = [null, null, null];

    // ---- Cursor ----
    let cursorMesh: THREE.Mesh | null = null;
    let cursorMaterial: THREE.MeshBasicMaterial | null = null;

    // ---- Button ----
    let enterButton: ButtonResult | null = null;
    let enterButtonEnabled = false;

    // ---- Hover detection ----
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isHovering = false;

    function onPointerMove(e: PointerEvent) {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    function onPointerClick() {
      if (isHovering && enterButtonEnabled) {
        submit();
      }
    }

    // ---- Letter geometry cache ----
    const letterCache = new Map<string, THREE.BufferGeometry>();

    async function buildUI() {
      const font = await getFont('Gentilis');

      // Pre-cache letter geometries A-Z
      for (let code = 65; code <= 90; code++) {
        const ch = String.fromCharCode(code);
        const geo = new TextGeometry(ch, {
          font,
          size: 0.8,
          depth: 0.08,
          curveSegments: 4,
          bevelEnabled: true,
          bevelThickness: 0.02,
          bevelSize: 0.01,
          bevelSegments: 2,
        });
        geo.computeBoundingBox();
        const bbox = geo.boundingBox!;
        const offsetX = (bbox.max.x + bbox.min.x) / 2;
        const offsetY = (bbox.max.y + bbox.min.y) / 2;
        geo.translate(-offsetX, -offsetY, 0);
        letterCache.set(ch, geo);
      }

      // ---- Title: "INSCRIBE YOUR NAME" ----
      const title = await createOverlayText('INSCRIBE YOUR NAME', {
        size: 0.5,
        color: 0x8b7355,
        emissive: 0x554430,
        emissiveIntensity: 1.5,
      });
      title.mesh.position.set(0, 2.5, 0);
      container.add(title.mesh);
      overlayObjects.push(title);

      // ---- Slot frames ----
      const slotGeo = new THREE.BoxGeometry(1.2, 1.5, 0.05);
      const slotMat = new THREE.MeshStandardMaterial({
        color: 0x1a1008,
        emissive: 0x4a3a28,
        emissiveIntensity: 0.3,
        roughness: 0.8,
        metalness: 0.2,
        toneMapped: false,
        depthTest: false,
      });

      for (let i = 0; i < MAX_CHARS; i++) {
        const group = new THREE.Group();
        group.position.set(SLOT_POSITIONS[i], 0.8, 0);
        group.renderOrder = 999;

        const frame = new THREE.Mesh(slotGeo, slotMat);
        frame.renderOrder = 999;
        frame.raycast = () => {}; // Don't intercept raycasts
        group.add(frame);
        slotFrames.push(frame);
        slotGroups.push(group);
        container.add(group);
      }
      overlayObjects.push({ geometry: slotGeo, material: slotMat });

      // ---- Cursor (thin blinking bar) ----
      const cursorGeo = new THREE.PlaneGeometry(0.08, 0.8);
      cursorMaterial = new THREE.MeshBasicMaterial({
        color: 0xdaa520,
        transparent: true,
        opacity: 1.0,
        depthTest: false,
        toneMapped: false,
      });
      cursorMesh = new THREE.Mesh(cursorGeo, cursorMaterial);
      cursorMesh.renderOrder = 999;
      cursorMesh.position.set(0, 0, 0.04);
      slotGroups[0].add(cursorMesh);
      overlayObjects.push({ geometry: cursorGeo, material: cursorMaterial });

      // ---- Enter button ----
      enterButton = await createOverlayButton('ENTER THE DUNGEON', {
        size: 0.35,
        color: 0x8b7355,
        emissive: 0x554430,
        emissiveIntensity: 1.5,
      });
      enterButton.mesh.position.set(0, -0.8, 0);
      enterButton.material.transparent = true;
      enterButton.material.opacity = 0.4;
      container.add(enterButton.mesh);
      overlayObjects.push(enterButton);

      // ---- Hint text ----
      const hint = await createOverlayText('Type initials, then Enter', {
        size: 0.15,
        color: 0x8b7355,
        emissive: 0x554430,
        emissiveIntensity: 0.6,
      });
      hint.mesh.position.set(0, -1.8, 0);
      container.add(hint.mesh);
      overlayObjects.push(hint);

      // Wire pointer events
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('click', onPointerClick);
    }

    function addLetterMesh(index: number, ch: string) {
      const cachedGeo = letterCache.get(ch);
      if (!cachedGeo) return;

      const clonedGeo = cachedGeo.clone();
      const mat = new THREE.MeshStandardMaterial({
        color: 0xdaa520,
        emissive: 0xcc7700,
        emissiveIntensity: 2.4,
        roughness: 0.7,
        metalness: 0.45,
        toneMapped: false,
        depthTest: false,
      });
      const mesh = new THREE.Mesh(clonedGeo, mat);
      mesh.renderOrder = 999;
      mesh.position.set(0, 0, 0.04);
      mesh.raycast = () => {};
      slotGroups[index].add(mesh);
      letterMeshes[index] = mesh;
    }

    function removeLetterMesh(index: number) {
      const mesh = letterMeshes[index];
      if (mesh) {
        slotGroups[index].remove(mesh);
        (mesh.geometry as THREE.BufferGeometry).dispose();
        (mesh.material as THREE.Material).dispose();
        letterMeshes[index] = null;
      }
    }

    function updateCursor() {
      if (!cursorMesh) return;
      // Move cursor to the active slot
      const activeIndex = Math.min(letters.length, MAX_CHARS - 1);
      if (letters.length >= MAX_CHARS) {
        // All slots full, hide cursor
        cursorMesh.visible = false;
      } else {
        cursorMesh.visible = true;
        // Remove from old parent, add to new
        cursorMesh.parent?.remove(cursorMesh);
        slotGroups[activeIndex].add(cursorMesh);
      }
    }

    function updateButtonState() {
      if (!enterButton) return;
      enterButtonEnabled = letters.length > 0;
      enterButton.material.opacity = enterButtonEnabled ? 1.0 : 0.4;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (disposed) return;

      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        if (letters.length < MAX_CHARS) {
          const ch = e.key.toUpperCase();
          const idx = letters.length;
          letters.push(ch);
          addLetterMesh(idx, ch);
          updateCursor();
          updateButtonState();
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        if (letters.length > 0) {
          const idx = letters.length - 1;
          letters.pop();
          removeLetterMesh(idx);
          updateCursor();
          updateButtonState();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (letters.length > 0) submit();
      }
    }

    function submit() {
      // Pad with underscores to 3 chars
      while (letters.length < MAX_CHARS) letters.push('_');
      const name = letters.join('');
      cleanup();
      resolve(name);
    }

    function startAnimLoop() {
      function tick() {
        if (disposed) return;
        animFrameId = requestAnimationFrame(tick);

        const time = performance.now() / 1000;

        // Blink cursor
        if (cursorMaterial && cursorMesh?.visible) {
          cursorMaterial.opacity = 0.5 + 0.5 * Math.sin(time * 5);
        }

        // Hover detection for enter button
        if (enterButton && enterButtonEnabled) {
          raycaster.setFromCamera(pointer, camera);
          const hits = raycaster.intersectObject(enterButton.hitArea);
          const nowHovering = hits.length > 0;
          if (nowHovering !== isHovering) {
            isHovering = nowHovering;
            enterButton.material.emissiveIntensity = isHovering ? 2.4 : 1.5;
            document.body.style.cursor = isHovering ? 'pointer' : 'default';
          }
        } else if (isHovering) {
          isHovering = false;
          document.body.style.cursor = 'default';
        }
      }
      tick();
    }

    function cleanup() {
      disposed = true;
      cancelAnimationFrame(animFrameId);

      suppressCheatConsole(false);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('click', onPointerClick);
      document.body.style.cursor = 'default';

      // Dispose letter meshes
      for (let i = 0; i < MAX_CHARS; i++) {
        removeLetterMesh(i);
      }

      // Dispose cached letter geometries
      for (const geo of letterCache.values()) {
        geo.dispose();
      }
      letterCache.clear();

      // Dispose all overlay objects
      disposeOverlayObjects(overlayObjects);

      // Remove container
      camera.remove(container);
      camera.remove(backdrop);
    }
  });
}
