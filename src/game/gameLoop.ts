import * as THREE from 'three';
import { generateFloor } from '../dungeon/generator';
import { buildFloorMesh, disposeFloorMesh, type FloorMeshResult } from '../dungeon/dungeonFloor';
import { getFloorConfig } from '../dungeon/floorConfig';
import { PlayerController } from '../player/playerController';
import { SwordCombat } from '../player/combat';
import { EnemyManager } from '../enemies/enemyManager';
import { ENEMY_TYPES } from '../enemies/enemyTypes';
import { HUD, type HUDState } from '../hud/hud';
import type { DungeonFloor } from '../dungeon/types';
import { fadeToBlack, fadeFromBlack } from './transition';
import { SwordModel } from '../weapons/swordModel';
import { type MusicPlayer, type SfxPlayer, AudioEvent } from '../audio';
import { createDungeonLights, updateDungeonLights, disposeDungeonLights, type DungeonLight } from '../dungeon/dungeonLights';
import { spawnDecorations, disposeDecorations } from '../decorations/decorationPlacer';
import { disposeDecorationShared } from '../decorations/decorationModels';
import { spawnItems } from '../items/itemPlacer';
import { ItemPickupSystem } from '../items/itemPickup';
import { ItemType, disposeItemShared } from '../items/itemTypes';

export interface GameLoopContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  dispose: () => void;
  update: (delta: number, time: number) => void;
  isGameOver: () => boolean;
  getScore: () => number;
  getFloor: () => number;
}

export async function createGameLoop(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  fadeOverlay: HTMLDivElement,
  ambientLight: THREE.AmbientLight,
  fog: THREE.FogExp2,
  musicPlayer: MusicPlayer | null,
  sfxPlayer: SfxPlayer | null,
): Promise<GameLoopContext> {
  let currentFloorNumber = 1;
  let dungeonFloor: DungeonFloor;
  let floorResult: FloorMeshResult | null = null;
  let transitioning = false;
  let damageFlash = 0;
  let decorations: THREE.Group[] = [];
  let dungeonLights: DungeonLight[] = [];
  const itemPickup = new ItemPickupSystem();

  // Footstep tracking
  let footstepDistance = 0;
  const FOOTSTEP_INTERVAL = 2.5;
  let lastPlayerX = 0;
  let lastPlayerZ = 0;

  // Track whether hit was already checked this attack
  let attackHitChecked = false;

  // Ambient + fog for dungeon atmosphere
  ambientLight.color.setHex(0x1a1a2e);
  ambientLight.intensity = 0.5;
  const menuFogDensity = fog.density;
  fog.density = 0.015;

  // Player torch — PointLight attached to camera
  const playerTorch = new THREE.PointLight(0xffeedd, 5, 20, 1.2);
  playerTorch.position.set(0, 0, 0);
  camera.add(playerTorch);

  const player = new PlayerController(camera, [[]]);
  const combat = new SwordCombat();
  const enemies = new EnemyManager(scene);
  const hud = new HUD();
  const swordModel = new SwordModel(camera);

  // Load 3D sword from API, fall back to procedural geometry
  swordModel.loadFromAPI().catch(() => {
    swordModel.loadFallback();
  });

  // Start dungeon music
  if (musicPlayer) {
    musicPlayer.play(musicPlayer.getTrackForFloor(currentFloorNumber));
  }

  // Preload critical SFX
  if (sfxPlayer) {
    sfxPlayer.preload([
      AudioEvent.SWORD_SWING,
      AudioEvent.SWORD_HIT,
      AudioEvent.FOOTSTEP,
      AudioEvent.PLAYER_HURT,
    ]).catch(() => {/* ignore preload failures */});
  }

  function triggerAttack() {
    combat.startAttack();
    attackHitChecked = false;
    sfxPlayer?.play(AudioEvent.SWORD_SWING);
  }

  // Click to attack, or re-acquire pointer lock if lost
  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    if (document.pointerLockElement) {
      triggerAttack();
    } else if (!transitioning && !player.isDead) {
      player.requestPointerLock();
    }
  };
  document.addEventListener('mousedown', onMouseDown);

  // Space key attack
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' && document.pointerLockElement && !player.isDead) {
      e.preventDefault();
      triggerAttack();
    }
  };
  document.addEventListener('keydown', onKeyDown);

  function loadFloor(floorNum: number) {
    // Clean previous floor
    if (floorResult) {
      scene.remove(floorResult.group);
      disposeFloorMesh(floorResult);
    }
    disposeDecorations(decorations);
    disposeDungeonLights(dungeonLights);
    itemPickup.dispose();
    enemies.dispose();

    // Generate new floor
    const config = getFloorConfig(floorNum);
    dungeonFloor = generateFloor(config);
    floorResult = buildFloorMesh(dungeonFloor);
    scene.add(floorResult.group);

    // Room torches (distance-culled, max 6 active)
    dungeonLights = createDungeonLights(dungeonFloor.rooms, floorResult.group);

    // Spawn decorations
    decorations = spawnDecorations(dungeonFloor, floorResult.group);

    // Spawn items
    const items = spawnItems(dungeonFloor, floorResult.group);
    itemPickup.setItems(items);

    // Place player
    player.setGrid(dungeonFloor.grid);
    player.setPosition(dungeonFloor.playerStart.x, dungeonFloor.playerStart.z);

    // Initialize footstep tracking
    lastPlayerX = dungeonFloor.playerStart.x;
    lastPlayerZ = dungeonFloor.playerStart.z;
    footstepDistance = 0;

    // Spawn enemies in each room (skip first room where player starts)
    const enemyTypes = Object.values(ENEMY_TYPES);
    const [minEnemies, maxEnemies] = config.enemiesPerRoom;
    for (const spawnPoint of dungeonFloor.spawnPoints) {
      const count = minEnemies + Math.floor(Math.random() * (maxEnemies - minEnemies + 1));
      const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      enemies.spawnEnemiesInRoom(spawnPoint, count, enemyType);
    }

    // Update music for floor
    if (musicPlayer) {
      musicPlayer.play(musicPlayer.getTrackForFloor(floorNum));
    }
  }

  // Load first floor
  loadFloor(currentFloorNumber);
  player.requestPointerLock();
  hud.show();

  async function nextFloor() {
    if (transitioning) return;
    transitioning = true;
    player.exitPointerLock();

    sfxPlayer?.play(AudioEvent.FLOOR_TRANSITION);

    await fadeToBlack(fadeOverlay, 800);
    currentFloorNumber++;
    loadFloor(currentFloorNumber);
    await fadeFromBlack(fadeOverlay, 800);

    player.requestPointerLock();
    transitioning = false;
  }

  function update(delta: number, time: number) {
    if (transitioning || player.isDead) return;

    // Player movement
    player.update(delta);

    // Footstep SFX — track distance walked
    const pos = player.getPosition();
    const dx = pos.x - lastPlayerX;
    const dz = pos.z - lastPlayerZ;
    const moved = Math.sqrt(dx * dx + dz * dz);
    if (moved > 0.01) {
      footstepDistance += moved;
      lastPlayerX = pos.x;
      lastPlayerZ = pos.z;
      if (footstepDistance >= FOOTSTEP_INTERVAL) {
        footstepDistance -= FOOTSTEP_INTERVAL;
        sfxPlayer?.play(AudioEvent.FOOTSTEP);
      }
    }

    // Player torch flicker
    const flicker =
      Math.sin(time * 8) * 0.3 +
      Math.sin(time * 13 + 2.3) * 0.2;
    playerTorch.intensity = 5 + flicker;

    // Room torches — distance-cull to nearest 6
    updateDungeonLights(dungeonLights, pos, time);

    // Enemy AI
    const enemyResult = enemies.update(delta, pos, dungeonFloor.grid);
    if (enemyResult.damageToPlayer > 0) {
      player.takeDamage(enemyResult.damageToPlayer);
      damageFlash = 1;
      sfxPlayer?.play(AudioEvent.PLAYER_HURT);
    }

    // Combat
    combat.update(delta);
    swordModel.update(combat.isAttacking(), combat.getAttackProgress(), delta);
    if (combat.isAttacking() && combat.getAttackProgress() < 0.1 && !attackHitChecked) {
      attackHitChecked = true;
      const targets = enemies.getTargets();
      const hitIds = combat.checkHits(pos, player.getDirection(), targets);
      if (hitIds.length > 0) {
        sfxPlayer?.play(AudioEvent.SWORD_HIT);
      }
      for (const id of hitIds) {
        enemies.applyDamage(id, combat.damage);
      }
    }

    // Collect points from killed enemies
    const points = enemies.getKilledPoints();
    if (points > 0) {
      player.addScore(points);
    }

    // Door auto-open when player is within 2 units
    for (const door of dungeonFloor.doors) {
      if (!door.isOpen) {
        const ddx = pos.x - door.gridX;
        const ddz = pos.z - door.gridZ;
        if (ddx * ddx + ddz * ddz < 4) {
          door.isOpen = true;
          sfxPlayer?.play(AudioEvent.STONE_CREAK);
        }
      }
      if (door.isOpen && door.openProgress < 1) {
        door.openProgress = Math.min(1, door.openProgress + delta * 3);
        const doorMesh = floorResult!.doorMeshes.get(`${door.gridX},${door.gridZ}`);
        if (doorMesh) {
          // Animate the inner pivot (first child) — swings the door panel
          const pivot = doorMesh.children[0];
          if (pivot) {
            pivot.rotation.y = door.openProgress * (Math.PI / 2);
          }
        }
      }
    }

    // Item pickup
    const collected = itemPickup.update(pos, delta);
    for (const item of collected) {
      if (item.def.type === ItemType.HEALTH_POTION) {
        player.health = Math.min(100, player.health + item.def.healAmount);
        sfxPlayer?.play(AudioEvent.ITEM_PICKUP);
      } else if (item.def.type === ItemType.SCORE_GEM) {
        player.addScore(item.def.points);
        sfxPlayer?.play(AudioEvent.ITEM_PICKUP);
      } else if (item.def.type === ItemType.BLUEPRINT) {
        player.addScore(item.def.points);
        sfxPlayer?.play(AudioEvent.BLUEPRINT_FOUND);
      }
    }

    // Check exit
    const ex = dungeonFloor.exitPosition;
    if (Math.abs(pos.x - ex.x) < 1.5 && Math.abs(pos.z - ex.z) < 1.5) {
      nextFloor();
    }

    // Fade damage flash
    if (damageFlash > 0) {
      damageFlash = Math.max(0, damageFlash - delta * 3);
    }

    // Update HUD
    const hudState: HUDState = {
      health: player.health,
      maxHealth: 100,
      score: player.score,
      floor: currentFloorNumber,
      isAttacking: combat.isAttacking(),
      attackProgress: combat.getAttackProgress(),
      damageFlash,
    };
    hud.update(hudState, delta);
  }

  function dispose() {
    document.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('keydown', onKeyDown);
    player.exitPointerLock();
    player.dispose();
    enemies.dispose();
    hud.dispose();
    swordModel.dispose();
    camera.remove(playerTorch);
    playerTorch.dispose();
    disposeDecorations(decorations);
    disposeDungeonLights(dungeonLights);
    itemPickup.dispose();
    disposeDecorationShared();
    disposeItemShared();
    if (floorResult) {
      scene.remove(floorResult.group);
      disposeFloorMesh(floorResult);
    }
    if (musicPlayer) {
      musicPlayer.stop();
    }
    ambientLight.color.setHex(0x111111);
    ambientLight.intensity = 1;
    fog.density = menuFogDensity;
  }

  return {
    scene,
    camera,
    dispose,
    update,
    isGameOver: () => player.isDead,
    getScore: () => player.score,
    getFloor: () => currentFloorNumber,
  };
}
