/**
 * 3D Run Summary — camera-attached Three.js game-over screen.
 *
 * Replaces the DOM-based runSummary.ts with TextGeometry meshes and a
 * CanvasTexture plane for leaderboard/creations, rendered through the
 * EffectComposer pipeline.
 */

import * as THREE from 'three';
import {
  createOverlayText,
  createOverlayButton,
  createOverlayBackdrop,
  createOverlayLight,
  disposeOverlayObjects,
  type ButtonResult,
} from './overlay3d';
import { suppressCheatConsole } from '../cheats/cheatConsole';
import { getScores, addScore, isHighScore } from './leaderboard';

/* ------------------------------------------------------------------ */
/*  Types (re-exported for consumers)                                  */
/* ------------------------------------------------------------------ */

export interface RunStats {
  playerName: string;
  score: number;
  floor: number;
  enemiesKilled: number;
  creationsUsed: { name: string; category: string }[];
}

export interface RunSummaryResult {
  action: 'play_again' | 'quit';
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const Z_DEPTH = -7;

/* ------------------------------------------------------------------ */
/*  Canvas texture for leaderboard + creations                         */
/* ------------------------------------------------------------------ */

const BADGE_COLORS: Record<string, string> = {
  weapon: '#5a5a5a',
  enemy: '#6b2020',
  decoration: '#2a5a2a',
};

function createInfoCanvasTexture(
  stats: RunStats,
  madeLeaderboard: boolean,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const leftCol = 40;
  const rightCol = 540;
  let leftY = 30;
  let rightY = 30;

  // ---- Left column: Creations Forged ----
  if (stats.creationsUsed.length > 0) {
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = '#daa520';
    ctx.fillText('CREATIONS FORGED', leftCol, leftY);
    leftY += 8;

    // Separator line
    ctx.strokeStyle = 'rgba(218, 165, 32, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftCol, leftY);
    ctx.lineTo(leftCol + 440, leftY);
    ctx.stroke();
    leftY += 20;

    for (const c of stats.creationsUsed) {
      // Badge
      const badgeColor = BADGE_COLORS[c.category] || '#444';
      const badgeText = c.category.toUpperCase();
      ctx.font = 'bold 11px "Courier New", monospace';
      const badgeWidth = ctx.measureText(badgeText).width + 12;

      ctx.fillStyle = badgeColor;
      ctx.beginPath();
      ctx.roundRect(leftCol, leftY - 12, badgeWidth, 18, 3);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(badgeText, leftCol + 6, leftY + 1);

      // Name
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = '#8b7b65';
      ctx.fillText(c.name, leftCol + badgeWidth + 10, leftY + 1);
      leftY += 26;
    }
  } else {
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = 'rgba(107, 91, 69, 0.4)';
    ctx.fillText('NO CREATIONS FORGED', leftCol, leftY);
    leftY += 30;
  }

  // ---- Right column: Leaderboard ----
  const scores = getScores();
  if (scores.length > 0) {
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = madeLeaderboard ? '#daa520' : '#6b5b45';
    ctx.fillText(
      madeLeaderboard ? 'NEW HIGH SCORE!' : 'HALL OF THE FALLEN',
      rightCol,
      rightY,
    );
    rightY += 8;

    ctx.strokeStyle = 'rgba(107, 91, 69, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rightCol, rightY);
    ctx.lineTo(rightCol + 440, rightY);
    ctx.stroke();
    rightY += 22;

    for (let i = 0; i < scores.length; i++) {
      const entry = scores[i];
      const isCurrentRun =
        madeLeaderboard &&
        entry.name === stats.playerName &&
        entry.score === stats.score &&
        entry.floor === stats.floor;

      // Highlight row
      if (isCurrentRun) {
        ctx.fillStyle = 'rgba(218, 165, 32, 0.08)';
        ctx.fillRect(rightCol - 6, rightY - 14, 450, 22);
        ctx.fillStyle = 'rgba(218, 165, 32, 0.4)';
        ctx.fillRect(rightCol - 6, rightY - 14, 2, 22);
      }

      // Rank
      ctx.font = '13px "Courier New", monospace';
      ctx.fillStyle = 'rgba(107, 91, 69, 0.5)';
      ctx.textAlign = 'right';
      ctx.fillText(`${i + 1}.`, rightCol + 20, rightY);

      // Name
      ctx.textAlign = 'left';
      ctx.font = isCurrentRun
        ? 'bold 14px "Courier New", monospace'
        : '14px "Courier New", monospace';
      ctx.fillStyle = isCurrentRun ? '#daa520' : '#8b7b65';
      ctx.fillText(entry.name, rightCol + 32, rightY);

      // Score
      ctx.textAlign = 'right';
      ctx.fillStyle = isCurrentRun ? '#daa520' : 'rgba(139, 123, 101, 0.6)';
      ctx.fillText(entry.score.toLocaleString(), rightCol + 320, rightY);

      // Floor
      ctx.fillStyle = 'rgba(107, 91, 69, 0.4)';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText(`F${entry.floor}`, rightCol + 400, rightY);
      ctx.textAlign = 'left';

      rightY += 24;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function showRunSummary3D(
  stats: RunStats,
  camera: THREE.PerspectiveCamera,
): Promise<RunSummaryResult> {
  return new Promise<RunSummaryResult>((resolve) => {
    let disposed = false;
    let animFrameId = 0;
    let keyboardEnabled = false;

    // Save score before displaying
    const madeLeaderboard = isHighScore(stats.score);
    if (madeLeaderboard) {
      addScore({
        name: stats.playerName,
        score: stats.score,
        floor: stats.floor,
        date: new Date().toISOString().slice(0, 10),
      });
    }

    // Track all objects for cleanup
    const overlayObjects: Array<{
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material;
      mesh?: THREE.Object3D;
    }> = [];

    // ---- Backdrop (dark red tint) ----
    const backdrop = createOverlayBackdrop(0.35, 0x050000);
    camera.add(backdrop);

    // UI light for camera-attached MeshStandardMaterial
    const uiLight = createOverlayLight();
    camera.add(uiLight);
    overlayObjects.push({
      mesh: backdrop,
      material: backdrop.material as THREE.Material,
      geometry: backdrop.geometry,
    });

    // Container group
    const container = new THREE.Group();
    container.position.set(0, 0, Z_DEPTH);
    container.renderOrder = 999;
    camera.add(container);

    // ---- Buttons ----
    let riseButton: ButtonResult | null = null;
    let retreatButton: ButtonResult | null = null;
    let titleMaterial: THREE.MeshStandardMaterial | null = null;

    // ---- Hover detection ----
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredButton: 'rise' | 'retreat' | null = null;

    function onPointerMove(e: PointerEvent) {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    function onPointerClick() {
      if (hoveredButton === 'rise') {
        finish('play_again');
      } else if (hoveredButton === 'retreat') {
        finish('quit');
      }
    }

    // ---- Build UI ----
    buildUI().then(() => {
      suppressCheatConsole(true);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('click', onPointerClick);
      startAnimLoop();

      // Delay keyboard binding 600ms
      setTimeout(() => {
        if (!disposed) {
          keyboardEnabled = true;
          document.addEventListener('keydown', onKeyDown, { capture: true });
        }
      }, 600);
    });

    async function buildUI() {
      // ---- "YOU DIED" title ----
      const title = await createOverlayText('YOU DIED', {
        size: 1.0,
        depth: 0.2,
        color: 0xb41e1e,
        emissive: 0x8b1010,
        emissiveIntensity: 5.0,
        letterSpacing: 0.15,
      });
      title.mesh.position.set(0, 3.8, 0);
      container.add(title.mesh);
      titleMaterial = title.material;
      overlayObjects.push(title);

      // ---- Player name ----
      const nameText = await createOverlayText(`- ${stats.playerName} -`, {
        size: 0.3,
        color: 0x6b5b45,
        emissive: 0x3a3020,
        emissiveIntensity: 4.0,
      });
      nameText.mesh.position.set(0, 3.0, 0);
      container.add(nameText.mesh);
      overlayObjects.push(nameText);

      // ---- Stat values (large) ----
      const scoreText = await createOverlayText(
        stats.score.toLocaleString(),
        {
          size: 0.6,
          depth: 0.08,
          color: 0xdaa520,
          emissive: 0xcc7700,
          emissiveIntensity: 2.4,
        },
      );
      scoreText.mesh.position.set(-2.5, 2.0, 0);
      container.add(scoreText.mesh);
      overlayObjects.push(scoreText);

      const floorText = await createOverlayText(String(stats.floor), {
        size: 0.6,
        depth: 0.08,
        color: 0xc4a35a,
        emissive: 0x8a7030,
        emissiveIntensity: 2.0,
      });
      floorText.mesh.position.set(0, 2.0, 0);
      container.add(floorText.mesh);
      overlayObjects.push(floorText);

      const killsText = await createOverlayText(
        String(stats.enemiesKilled),
        {
          size: 0.6,
          depth: 0.08,
          color: 0xa04040,
          emissive: 0x802020,
          emissiveIntensity: 2.0,
        },
      );
      killsText.mesh.position.set(2.5, 2.0, 0);
      container.add(killsText.mesh);
      overlayObjects.push(killsText);

      // ---- Stat labels ----
      const scoreLabel = await createOverlayText('SCORE', {
        size: 0.2,
        color: 0x5a4a3a,
        emissive: 0x3a3020,
        emissiveIntensity: 4.0,
      });
      scoreLabel.mesh.position.set(-2.5, 1.5, 0);
      container.add(scoreLabel.mesh);
      overlayObjects.push(scoreLabel);

      const floorLabel = await createOverlayText('FLOOR', {
        size: 0.2,
        color: 0x5a4a3a,
        emissive: 0x3a3020,
        emissiveIntensity: 4.0,
      });
      floorLabel.mesh.position.set(0, 1.5, 0);
      container.add(floorLabel.mesh);
      overlayObjects.push(floorLabel);

      const slainLabel = await createOverlayText('SLAIN', {
        size: 0.2,
        color: 0x5a4a3a,
        emissive: 0x3a3020,
        emissiveIntensity: 4.0,
      });
      slainLabel.mesh.position.set(2.5, 1.5, 0);
      container.add(slainLabel.mesh);
      overlayObjects.push(slainLabel);

      // ---- Canvas texture plane (leaderboard + creations) ----
      const canvasTexture = createInfoCanvasTexture(stats, madeLeaderboard);
      const planeGeo = new THREE.PlaneGeometry(6, 3);
      const planeMat = new THREE.MeshBasicMaterial({
        map: canvasTexture,
        transparent: true,
        depthTest: false,
        toneMapped: false,
      });
      const plane = new THREE.Mesh(planeGeo, planeMat);
      plane.renderOrder = 998;
      plane.position.set(0, -0.5, 0);
      plane.raycast = () => {};
      container.add(plane);
      overlayObjects.push({ geometry: planeGeo, material: planeMat, mesh: plane });

      // ---- Buttons ----
      riseButton = await createOverlayButton('RISE AGAIN', {
        size: 0.35,
        color: 0xdaa520,
        emissive: 0xcc7700,
        emissiveIntensity: 4.0,
      });
      riseButton.mesh.position.set(-1.8, -3.3, 0);
      container.add(riseButton.mesh);
      overlayObjects.push(riseButton);

      retreatButton = await createOverlayButton('RETREAT', {
        size: 0.35,
        color: 0x8b7355,
        emissive: 0x554430,
        emissiveIntensity: 4.0,
      });
      retreatButton.mesh.position.set(1.8, -3.3, 0);
      container.add(retreatButton.mesh);
      overlayObjects.push(retreatButton);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (disposed || !keyboardEnabled) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        finish('play_again');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        finish('quit');
      }
    }

    function finish(action: 'play_again' | 'quit') {
      if (disposed) return;
      cleanup();
      resolve({ action });
    }

    function startAnimLoop() {
      function tick() {
        if (disposed) return;
        animFrameId = requestAnimationFrame(tick);

        const time = performance.now() / 1000;

        // "YOU DIED" pulsing emissive
        if (titleMaterial) {
          titleMaterial.emissiveIntensity = 2.0 + Math.sin(time * 2) * 0.5;
        }

        // Hover detection
        raycaster.setFromCamera(pointer, camera);

        const hitAreas: THREE.Object3D[] = [];
        if (riseButton) hitAreas.push(riseButton.hitArea);
        if (retreatButton) hitAreas.push(retreatButton.hitArea);

        const intersects = raycaster.intersectObjects(hitAreas, false);
        let newHovered: 'rise' | 'retreat' | null = null;

        if (intersects.length > 0) {
          const hit = intersects[0].object;
          if (riseButton && hit === riseButton.hitArea) newHovered = 'rise';
          else if (retreatButton && hit === retreatButton.hitArea) newHovered = 'retreat';
        }

        if (newHovered !== hoveredButton) {
          // Reset old
          if (hoveredButton === 'rise' && riseButton) {
            riseButton.material.emissiveIntensity = 1.5;
            riseButton.mesh.scale.setScalar(1.0);
          }
          if (hoveredButton === 'retreat' && retreatButton) {
            retreatButton.material.emissiveIntensity = 1.0;
            retreatButton.mesh.scale.setScalar(1.0);
          }
          // Set new
          if (newHovered === 'rise' && riseButton) {
            riseButton.material.emissiveIntensity = 3.5;
            riseButton.mesh.scale.setScalar(1.15);
          }
          if (newHovered === 'retreat' && retreatButton) {
            retreatButton.material.emissiveIntensity = 3.0;
            retreatButton.mesh.scale.setScalar(1.15);
          }
          hoveredButton = newHovered;
          document.body.style.cursor = newHovered ? 'pointer' : 'default';
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

      // Dispose overlay objects
      disposeOverlayObjects(overlayObjects);

      // Remove container + light
      camera.remove(container);
      camera.remove(backdrop);
      camera.remove(uiLight);
      uiLight.dispose();
    }
  });
}
