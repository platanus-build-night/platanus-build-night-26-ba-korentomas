import * as THREE from 'three';
import { createScene } from './scene/createScene';
import { createCorridor, updateCorridor, CorridorState } from './scene/corridor';
import { createTorches, updateTorches } from './scene/torches';
import { createTitleText, TitleHandle } from './scene/titleText';
import { createMenuItems, MenuHandle } from './scene/menuItems';
import { setupComposer } from './postprocessing/setupComposer';
import { GameStateType } from './game/gameState';
import { createGameLoop, GameLoopContext } from './game/gameLoop';
import { createFadeOverlay, fadeToBlack, fadeFromBlack } from './game/transition';
import { AudioManager, MusicPlayer, SfxPlayer, AudioEvent } from './audio';
import { initCheatConsole } from './cheats/cheatConsole';
import { registerDefaultCheats } from './cheats/defaultCheats';
import { showGalleryOverlay } from './ui/galleryOverlay';
import { showNameEntry } from './ui/nameEntry';
import { showRunSummary, type RunStats } from './ui/runSummary';

async function init() {
  const { scene, camera, renderer, ambientLight, fog } = createScene();
  const { composer, bloomPass, retroPass } = setupComposer(renderer, scene, camera);
  const fadeOverlay = createFadeOverlay();

  // Audio system
  const audioManager = new AudioManager();
  const musicPlayer = new MusicPlayer(audioManager);
  const sfxPlayer = new SfxPlayer(audioManager);

  // Resume audio context on first user gesture (browser autoplay policy)
  const resumeAudio = () => { audioManager.resume(); };
  document.addEventListener('click', resumeAudio, { once: true });

  // Initialize cheat console
  initCheatConsole();
  registerDefaultCheats({ scene, camera, bloomPass, retroPass });

  let state = GameStateType.MENU;
  let gameLoop: GameLoopContext | null = null;
  let playerName = 'AAA';

  // --- Menu state objects ---
  let corridorState: CorridorState | null = null;
  let title: TitleHandle | null = null;
  let menu: MenuHandle | null = null;
  let allHitTargets: THREE.Object3D[] = [];
  let creditsEl: HTMLDivElement | null = null;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoveredIndex = -1;

  async function setupMenu() {
    corridorState = createCorridor(scene);
    createTorches(corridorState.segments);
    scene.add(camera);

    [title, menu] = await Promise.all([
      createTitleText(camera),
      createMenuItems(camera),
    ]);

    allHitTargets = menu.items.flatMap((item) => [item.mesh, item.hitArea]);
    renderer.domElement.style.cursor = 'default';
    hoveredIndex = -1;

    // Credits bar
    creditsEl = document.createElement('div');
    creditsEl.style.cssText = 'position:fixed;bottom:24px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:8px;z-index:20;pointer-events:none;';

    const banana = document.createElement('video');
    banana.src = '/banana-spin.webm';
    banana.autoplay = true;
    banana.loop = true;
    banana.muted = true;
    banana.playsInline = true;
    banana.style.cssText = 'width:56px;height:56px;mix-blend-mode:screen;filter:contrast(1.3) brightness(1.1);image-rendering:pixelated;';

    const text = document.createElement('span');
    text.style.cssText = 'font-family:monospace;font-size:13px;color:#daa520;text-shadow:0 0 6px rgba(218,165,32,0.5);pointer-events:auto;';
    text.textContent = 'Made by Korenblit Tomas  |  Hacked during ';

    const link = document.createElement('a');
    link.href = 'https://platan.us';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'platan.us';
    link.style.cssText = 'color:#ff9944;text-decoration:underline;pointer-events:auto;';
    text.appendChild(link);

    creditsEl.appendChild(banana);
    creditsEl.appendChild(text);
    document.body.appendChild(creditsEl);

    // Start menu music
    musicPlayer.play(AudioEvent.MUSIC_MENU);
  }

  function disposeMenu() {
    if (title) {
      title.mesh.geometry.dispose();
      title.material.dispose();
      camera.remove(title.mesh);
      title = null;
    }
    if (menu) {
      for (const item of menu.items) {
        item.mesh.geometry.dispose();
        item.material.dispose();
        item.hitArea.geometry.dispose();
        (item.hitArea.material as THREE.Material).dispose();
      }
      camera.remove(menu.group);
      menu = null;
    }
    if (corridorState) {
      for (const seg of corridorState.segments) {
        scene.remove(seg.group);
      }
      corridorState = null;
    }
    if (creditsEl) {
      creditsEl.remove();
      creditsEl = null;
    }
    allHitTargets = [];
  }

  // --- Click handler ---
  renderer.domElement.addEventListener('click', async () => {
    if (state === GameStateType.MENU && hoveredIndex >= 0 && menu) {
      const label = menu.items[hoveredIndex].label;
      if (label === 'Start') {
        await startGame();
      } else if (label === 'Gallery') {
        showGalleryOverlay();
      }
    }
  });

  renderer.domElement.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  async function startGame() {
    state = GameStateType.FADE_TO_GAME;
    renderer.domElement.style.cursor = 'default';

    sfxPlayer.play(AudioEvent.MENU_SELECT);
    musicPlayer.stop();

    // Show name entry
    playerName = await showNameEntry();

    await fadeToBlack(fadeOverlay, 1000);

    // Dispose menu objects
    disposeMenu();

    // Reset camera
    camera.position.set(0, 2.5, 0);
    camera.rotation.set(0, 0, 0);

    // Create game loop
    gameLoop = await createGameLoop(scene, camera, fadeOverlay, ambientLight, fog, musicPlayer, sfxPlayer);

    // Wire pause menu actions
    gameLoop.onRestart = async () => {
      if (gameLoop) {
        gameLoop.dispose();
        gameLoop = null;
      }
      await startGameDirect();
    };
    gameLoop.onQuit = () => {
      returnToMenu();
    };

    // Wire game over handler
    gameLoop.onGameOver = () => {
      handleGameOver();
    };

    state = GameStateType.PLAYING;
    await fadeFromBlack(fadeOverlay, 1000);
  }

  /** Start game without name entry (used for Restart from pause menu). */
  async function startGameDirect() {
    state = GameStateType.FADE_TO_GAME;
    renderer.domElement.style.cursor = 'default';

    await fadeToBlack(fadeOverlay, 1000);

    // Reset camera
    camera.position.set(0, 2.5, 0);
    camera.rotation.set(0, 0, 0);

    // Create game loop
    gameLoop = await createGameLoop(scene, camera, fadeOverlay, ambientLight, fog, musicPlayer, sfxPlayer);

    // Wire pause menu actions
    gameLoop.onRestart = async () => {
      if (gameLoop) {
        gameLoop.dispose();
        gameLoop = null;
      }
      await startGameDirect();
    };
    gameLoop.onQuit = () => {
      returnToMenu();
    };
    gameLoop.onGameOver = () => {
      handleGameOver();
    };

    state = GameStateType.PLAYING;
    await fadeFromBlack(fadeOverlay, 1000);
  }

  async function handleGameOver() {
    if (!gameLoop) return;
    state = GameStateType.GAME_OVER;

    sfxPlayer.play(AudioEvent.STINGER_GAME_OVER);

    const runStats = gameLoop.getRunStats();
    const summaryStats: RunStats = {
      playerName,
      score: runStats.score,
      floor: runStats.floor,
      enemiesKilled: runStats.enemiesKilled,
      creationsUsed: runStats.creationsUsed,
    };

    const result = await showRunSummary(summaryStats);

    if (gameLoop) {
      gameLoop.dispose();
      gameLoop = null;
    }

    if (result.action === 'play_again') {
      playerName = await showNameEntry();
      await startGameDirect();
    } else {
      await returnToMenu();
    }
  }

  async function returnToMenu() {
    state = GameStateType.FADE_TO_MENU;

    await fadeToBlack(fadeOverlay, 1000);

    if (gameLoop) {
      gameLoop.dispose();
      gameLoop = null;
    }

    // Reset ambient light (also done in gameLoop.dispose, but ensure it's reset)
    ambientLight.color.setHex(0x111111);

    // Reset camera
    camera.position.set(0, 2.5, 0);
    camera.rotation.set(0, 0, 0);

    await setupMenu();
    state = GameStateType.MENU;

    await fadeFromBlack(fadeOverlay, 1000);
  }

  // Initial menu setup
  await setupMenu();

  // --- Animate loop ---
  let lastTime = performance.now();
  let gameOverShown = false;

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const delta = Math.min((now - lastTime) / 1000, 0.05); // clamp to 50ms
    lastTime = now;
    const time = now / 1000;

    retroPass.uniforms['time'].value = time;

    if (state === GameStateType.MENU && corridorState) {
      updateCorridor(corridorState, camera, delta, time);
      updateTorches(time, corridorState.cameraZ);

      // Menu hover
      if (menu) {
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
          if (hoveredIndex >= 0) menu.items[hoveredIndex].material.emissiveIntensity = 2.4;
          if (newHoveredIndex >= 0) {
            menu.items[newHoveredIndex].material.emissiveIntensity = 2.55;
            sfxPlayer.play(AudioEvent.MENU_HOVER);
          }
          hoveredIndex = newHoveredIndex;
          renderer.domElement.style.cursor = newHoveredIndex >= 0 ? 'pointer' : 'default';
        }
      }
    }

    if (state === GameStateType.PLAYING && gameLoop) {
      gameLoop.update(delta, time);

      if (gameLoop.isGameOver() && !gameOverShown) {
        gameOverShown = true;
        gameLoop.onGameOver?.();
      }
    }

    // Reset gameOverShown when we leave GAME_OVER state
    if (state !== GameStateType.PLAYING && state !== GameStateType.GAME_OVER) {
      gameOverShown = false;
    }

    composer.render();
  }

  animate();
}

init().catch((err) => {
  console.error('Failed to initialize DungeonSlopper:', err);
});
