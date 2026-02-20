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

  // --- Menu state objects ---
  let corridorState: CorridorState | null = null;
  let title: TitleHandle | null = null;
  let menu: MenuHandle | null = null;
  let allHitTargets: THREE.Object3D[] = [];

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
    allHitTargets = [];
  }

  // --- Click handler ---
  renderer.domElement.addEventListener('click', async () => {
    if (state === GameStateType.MENU && hoveredIndex >= 0 && menu) {
      const label = menu.items[hoveredIndex].label;
      if (label === 'Start') {
        await startGame();
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

    await fadeToBlack(fadeOverlay, 1000);

    // Dispose menu objects
    disposeMenu();

    // Reset camera
    camera.position.set(0, 2.5, 0);
    camera.rotation.set(0, 0, 0);

    // Create game loop
    gameLoop = await createGameLoop(scene, camera, fadeOverlay, ambientLight, fog, musicPlayer, sfxPlayer);

    state = GameStateType.PLAYING;
    await fadeFromBlack(fadeOverlay, 1000);
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

  // --- Game over click to return ---
  document.addEventListener('click', () => {
    if (state === GameStateType.GAME_OVER) {
      returnToMenu();
    }
  });

  // Initial menu setup
  await setupMenu();

  // --- Game over overlay ---
  const gameOverCanvas = document.createElement('canvas');
  gameOverCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:15;display:none;';
  document.body.appendChild(gameOverCanvas);

  function showGameOver(score: number, floor: number) {
    gameOverCanvas.style.display = 'block';
    gameOverCanvas.width = window.innerWidth;
    gameOverCanvas.height = window.innerHeight;
    const ctx = gameOverCanvas.getContext('2d')!;

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, gameOverCanvas.width, gameOverCanvas.height);

    // Game Over text
    ctx.textAlign = 'center';
    ctx.fillStyle = '#cc2222';
    ctx.font = `bold ${Math.floor(gameOverCanvas.height / 8)}px monospace`;
    ctx.fillText('GAME OVER', gameOverCanvas.width / 2, gameOverCanvas.height * 0.35);

    // Score
    ctx.fillStyle = '#daa520';
    ctx.font = `bold ${Math.floor(gameOverCanvas.height / 16)}px monospace`;
    ctx.fillText(`SCORE: ${score}`, gameOverCanvas.width / 2, gameOverCanvas.height * 0.5);
    ctx.fillText(`FLOOR: ${floor}`, gameOverCanvas.width / 2, gameOverCanvas.height * 0.58);

    // Click to continue
    ctx.fillStyle = '#888';
    ctx.font = `${Math.floor(gameOverCanvas.height / 24)}px monospace`;
    ctx.fillText('Click to return to menu', gameOverCanvas.width / 2, gameOverCanvas.height * 0.72);
  }

  function hideGameOver() {
    gameOverCanvas.style.display = 'none';
  }

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
        state = GameStateType.GAME_OVER;
        sfxPlayer.play(AudioEvent.STINGER_GAME_OVER);
        showGameOver(gameLoop.getScore(), gameLoop.getFloor());

        // Return to menu after click
        const handleReturn = () => {
          document.removeEventListener('click', handleReturn);
          hideGameOver();
          gameOverShown = false;
          returnToMenu();
        };
        // Delay listener to avoid immediate trigger
        setTimeout(() => document.addEventListener('click', handleReturn), 500);
      }
    }

    composer.render();
  }

  animate();
}

init().catch((err) => {
  console.error('Failed to initialize DungeonSlopper:', err);
});
