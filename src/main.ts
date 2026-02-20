import * as THREE from 'three';
import { createScene } from './scene/createScene';
import { createCorridor, updateCorridor } from './scene/corridor';
import { createTorches, updateTorches } from './scene/torches';
import { createTitleText } from './scene/titleText';
import { createMenuItems } from './scene/menuItems';
import { setupComposer } from './postprocessing/setupComposer';
import { createDebugPanel } from './debugPanel';
import {
  showDrawingOverlay,
  hideDrawingOverlay,
  isDrawingOverlayVisible,
} from './drawing/drawingOverlay';
import { initCheatConsole } from './cheats/cheatConsole';
import { registerDefaultCheats } from './cheats/defaultCheats';
import { forgeEnemy } from './api/enemyApi';
import { loadEnemyModel } from './enemy/enemyLoader';
import { createEnemyInstance, EnemyInstance } from './enemy/enemyController';
import { createGenerationOverlay } from './enemy/generationOverlay';

async function init() {
  const { scene, camera, renderer } = createScene();

  const corridorState = createCorridor(scene);
  createTorches(corridorState.segments);
  scene.add(camera);

  const [title, menu] = await Promise.all([
    createTitleText(camera),
    createMenuItems(camera),
  ]);

  const { composer, bloomPass, retroPass } =
    setupComposer(renderer, scene, camera);

  // Hover detection for menu items
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoveredIndex = -1;

  // Cache hit targets array (avoid per-frame allocation)
  const allHitTargets = menu.items.flatMap((item) => [item.mesh, item.hitArea]);

  renderer.domElement.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  renderer.domElement.style.cursor = 'default';

  createDebugPanel({
    title,
    menu,
    bloomPass,
    retroPass,
    fog: scene.fog as THREE.FogExp2,
  });

  // Enemy generation state
  const generationOverlay = createGenerationOverlay();
  let activeEnemy: EnemyInstance | null = null;

  // Drawing overlay (press D to open)
  window.addEventListener('keydown', (e) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }
    if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      if (isDrawingOverlayVisible()) {
        hideDrawingOverlay();
      } else {
        showDrawingOverlay({
          onSubmit: async (result) => {
            hideDrawingOverlay();

            if (result.categoryId !== 'enemy') {
              console.log('Drawing submitted:', result.categoryId, result.imageData.length);
              return;
            }

            generationOverlay.show();

            try {
              generationOverlay.setStage('mesh', 'Conjuring form...');
              const forgeResult = await forgeEnemy(result.imageData, (progress) => {
                generationOverlay.setStage(progress.stage, progress.message);
              });

              generationOverlay.setStage('loading', 'Summoning creature...');
              const enemyModel = await loadEnemyModel(forgeResult.animations);

              activeEnemy?.dispose();
              const spawnZ = corridorState.cameraZ - 30;
              activeEnemy = createEnemyInstance(enemyModel, scene, spawnZ);

              generationOverlay.hide();
            } catch (err) {
              console.error('Enemy forge failed:', err);
              generationOverlay.setError(
                err instanceof Error ? err.message : 'Unknown error'
              );
            }
          },
        });
      }
    }
  });

  // Cheat console (press T to open)
  registerDefaultCheats({ scene, camera, bloomPass, retroPass });
  initCheatConsole();


  let lastTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;
    const time = now / 1000;

    updateCorridor(corridorState, camera, delta, time);
    updateTorches(time, corridorState.cameraZ);
    activeEnemy?.update(delta, corridorState.cameraZ);
    retroPass.uniforms['time'].value = time;

    // Menu hover glow
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(allHitTargets);

    let newHoveredIndex = -1;
    if (hits.length > 0) {
      const hitObj = hits[0].object;
      newHoveredIndex = menu.items.findIndex(
        (item) => item.mesh === hitObj || item.hitArea === hitObj
      );
    }

    if (newHoveredIndex !== hoveredIndex) {
      if (hoveredIndex >= 0) {
        menu.items[hoveredIndex].material.emissiveIntensity = 2.4;
      }
      if (newHoveredIndex >= 0) {
        menu.items[newHoveredIndex].material.emissiveIntensity = 2.55;
      }
      hoveredIndex = newHoveredIndex;
      renderer.domElement.style.cursor = newHoveredIndex >= 0 ? 'pointer' : 'default';
    }

    composer.render();
  }

  animate();
}

init().catch((err) => {
  console.error('Failed to initialize DungeonSlopper:', err);
});
