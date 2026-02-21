import * as THREE from 'three';
import { generateFloor } from '../dungeon/generator';
import { buildFloorMesh, disposeFloorMesh, type FloorMeshResult } from '../dungeon/dungeonFloor';
import { getFloorConfig } from '../dungeon/floorConfig';
import { PlayerController } from '../player/playerController';
import { SwordCombat } from '../player/combat';
import { EnemyManager } from '../enemies/enemyManager';
import { ENEMY_TYPES } from '../enemies/enemyTypes';
import { HUD, type HUDState } from '../hud/hud';
import { RoomType, type DungeonFloor, type SpawnPoint } from '../dungeon/types';
import { fadeToBlack, fadeFromBlack } from './transition';
import { SwordModel } from '../weapons/swordModel';
import { type MusicPlayer, type SfxPlayer, AudioEvent } from '../audio';
import { createDungeonLights, updateDungeonLights, disposeDungeonLights, type DungeonLight } from '../dungeon/dungeonLights';
import { spawnDecorations, disposeDecorations } from '../decorations/decorationPlacer';
import { disposeDecorationShared } from '../decorations/decorationModels';
import { spawnPaintings, disposePaintings, type PlacedPainting } from '../decorations/paintingPlacer';
import { disposePaintingShared } from '../decorations/paintingModel';
import { createCustomEnemyType } from '../enemies/customEnemyModel';
import { spawnItems, spawnBlueprintAtPosition } from '../items/itemPlacer';
import { ItemPickupSystem } from '../items/itemPickup';
import { ItemType, disposeItemShared } from '../items/itemTypes';
import { RoomTracker } from '../dungeon/roomTracker';
import { setDoorLocked } from '../dungeon/doorMesh';
import { ProjectileManager } from '../projectiles/projectileManager';
import { PROJECTILE_TYPES } from '../projectiles/projectileTypes';
import { disposeProjectileShared } from '../projectiles/projectileModels';
import { showDrawingOverlay, hideDrawingOverlay, showForgeProgress, hideForgeProgress } from '../drawing/drawingOverlay';
import { forgeCreation, arrayBufferToDataUrl } from '../forge/forgeCreation';
import { communityCache } from '../community/communityCache';
import { setOnCloseCallback, isConsoleOpen } from '../cheats/cheatConsole';
import { registerGameCheats } from '../cheats/gameCheats';

export interface GameLoopContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  dispose: () => void;
  update: (delta: number, time: number) => void;
  isGameOver: () => boolean;
  getScore: () => number;
  getFloor: () => number;
  pause: () => void;
  resume: () => void;
  isPaused: () => boolean;
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
  let paintings: PlacedPainting[] = [];
  let dungeonLights: DungeonLight[] = [];
  const itemPickup = new ItemPickupSystem();

  // New Phase 1 state
  let paused = false;
  let bossDefeated = false;
  let equippedWeapon: 'melee' | 'ranged' = 'melee';
  let roomTracker: RoomTracker | null = null;
  let projectileManager: ProjectileManager | null = null;
  interface QueuedSprite { dataUrl: string; name: string; id: number; }
  const customEnemyQueue: QueuedSprite[] = [];
  const customPaintingQueue: QueuedSprite[] = [];
  let bossEnemy: { id: number; health: number; maxHealth: number; name: string } | null = null;

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

  // Create ProjectileManager
  projectileManager = new ProjectileManager(scene, PROJECTILE_TYPES.MAGIC_BOLT);

  // Preload community cache
  communityCache.preload().catch(() => {});

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

  // Cheat console pointer lock restore
  setOnCloseCallback(() => {
    if (!player.isDead && !transitioning && !paused) {
      player.requestPointerLock();
    }
  });

  // Register game cheats
  registerGameCheats({
    getPlayer: () => player,
    getEnemyManager: () => enemies,
    getCurrentFloor: () => currentFloorNumber,
    loadFloor: (n) => { currentFloorNumber = n; loadFloor(n); },
  });

  function triggerAttack() {
    combat.startAttack();
    attackHitChecked = false;
    sfxPlayer?.play(AudioEvent.SWORD_SWING);
  }

  // Click to attack, or re-acquire pointer lock if lost
  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    if (isConsoleOpen()) return;
    if (document.pointerLockElement) {
      if (equippedWeapon === 'ranged') {
        projectileManager?.spawn(player.getPosition(), player.getDirection(), PROJECTILE_TYPES.MAGIC_BOLT, 'player');
        sfxPlayer?.play(AudioEvent.PROJECTILE_FIRE);
      } else {
        triggerAttack();
      }
    } else if (!transitioning && !player.isDead && !paused) {
      player.requestPointerLock();
    }
  };
  document.addEventListener('mousedown', onMouseDown);

  // Space key attack + weapon switching
  const onKeyDown = (e: KeyboardEvent) => {
    if (isConsoleOpen()) return;
    if (e.code === 'Space' && document.pointerLockElement && !player.isDead) {
      e.preventDefault();
      triggerAttack();
    }
    if (e.code === 'Digit1') equippedWeapon = 'melee';
    if (e.code === 'Digit2') equippedWeapon = 'ranged';
  };
  document.addEventListener('keydown', onKeyDown);

  function loadFloor(floorNum: number) {
    // Clean previous floor
    if (floorResult) {
      scene.remove(floorResult.group);
      disposeFloorMesh(floorResult);
    }
    disposeDecorations(decorations);
    disposePaintings(paintings);
    disposeDungeonLights(dungeonLights);
    itemPickup.dispose();
    enemies.dispose();
    projectileManager?.deactivateAll();
    bossDefeated = false;
    bossEnemy = null;

    // Generate new floor
    const config = getFloorConfig(floorNum);
    dungeonFloor = generateFloor(config);
    floorResult = buildFloorMesh(dungeonFloor);
    scene.add(floorResult.group);

    // Room torches (distance-culled, max 6 active)
    dungeonLights = createDungeonLights(dungeonFloor.rooms, floorResult.group);

    // Spawn decorations
    decorations = spawnDecorations(dungeonFloor, floorResult.group);

    // Spawn wall paintings from queued custom paintings + community sprites
    const paintingUrls: string[] = [];
    while (customPaintingQueue.length > 0) {
      const queued = customPaintingQueue.shift()!;
      paintingUrls.push(queued.dataUrl);
    }
    // Community decoration sprites on floors 4+
    if (floorNum >= 4) {
      communityCache.getRandomDecorationSprite().then(sprite => {
        if (sprite) {
          spawnPaintings(dungeonFloor, [sprite.dataUrl], floorResult!.group).then(placed => {
            paintings.push(...placed);
          }).catch(() => {});
        }
      }).catch(() => {});
    }
    if (paintingUrls.length > 0) {
      spawnPaintings(dungeonFloor, paintingUrls, floorResult.group).then(placed => {
        paintings.push(...placed);
      }).catch(() => {});
    }

    // Spawn items (blueprints now only from room clearing)
    const items = spawnItems(dungeonFloor, floorResult.group);
    itemPickup.setItems(items);

    // Place player
    player.setGrid(dungeonFloor.grid);
    player.setPosition(dungeonFloor.playerStart.x, dungeonFloor.playerStart.z);

    // Initialize footstep tracking
    lastPlayerX = dungeonFloor.playerStart.x;
    lastPlayerZ = dungeonFloor.playerStart.z;
    footstepDistance = 0;

    // Create room tracker
    roomTracker = new RoomTracker(dungeonFloor.rooms, dungeonFloor.doors);

    // Per-room enemy spawning
    const spawnPoints = dungeonFloor.spawnPoints;
    const spawnsByRoom = new Map<number, SpawnPoint[]>();
    for (const sp of spawnPoints) {
      const list = spawnsByRoom.get(sp.roomIndex) || [];
      list.push(sp);
      spawnsByRoom.set(sp.roomIndex, list);
    }

    // Filter out special enemy types from random pool
    const regularEnemyTypes = Object.values(ENEMY_TYPES).filter(
      t => t.name !== 'Boss Skeleton' && t.name !== 'Skeleton Archer'
    );

    for (const room of dungeonFloor.rooms) {
      const roomSpawns = spawnsByRoom.get(room.index) || [];
      if (roomSpawns.length === 0) continue;

      let count: number;

      if (room.type === RoomType.BOSS) {
        // Boss + minions
        const bossSpawn = roomSpawns.find(s => s.isBoss) || roomSpawns[0];
        enemies.spawnEnemiesInRoom(bossSpawn, 1, ENEMY_TYPES.BOSS_SKELETON, room.index);
        // 2-3 regular enemies
        count = 2 + Math.floor(Math.random() * 2);
        const minionSpawns = roomSpawns.filter(s => !s.isBoss).slice(0, count);
        for (const sp of minionSpawns) {
          const type = regularEnemyTypes[Math.floor(Math.random() * regularEnemyTypes.length)];
          enemies.spawnEnemiesInRoom(sp, 1, type, room.index);
        }
        roomTracker.registerEnemiesInRoom(room.index, 1 + minionSpawns.length);
      } else if (room.type === RoomType.BLUEPRINT) {
        count = 4 + Math.floor(Math.random() * 3); // 4-6 enemies
        const actualCount = Math.min(count, roomSpawns.length);
        for (let i = 0; i < actualCount; i++) {
          const type = regularEnemyTypes[Math.floor(Math.random() * regularEnemyTypes.length)];
          enemies.spawnEnemiesInRoom(roomSpawns[i], 1, type, room.index);
        }
        roomTracker.registerEnemiesInRoom(room.index, actualCount);
      } else if (room.type === RoomType.NORMAL) {
        const [minE, maxE] = config.enemiesPerRoom;
        count = minE + Math.floor(Math.random() * (maxE - minE + 1));
        const actualCount = Math.min(count, roomSpawns.length);
        for (let i = 0; i < actualCount; i++) {
          const type = regularEnemyTypes[Math.floor(Math.random() * regularEnemyTypes.length)];
          enemies.spawnEnemiesInRoom(roomSpawns[i], 1, type, room.index);
        }
        roomTracker.registerEnemiesInRoom(room.index, actualCount);
      }
      // SPAWN rooms get no enemies
    }

    // Spawn custom sprite enemies from queue
    const spriteEnemyPromises: Promise<void>[] = [];
    while (customEnemyQueue.length > 0) {
      const queued = customEnemyQueue.shift()!;
      const normalRooms = dungeonFloor.rooms.filter(r => r.type === RoomType.NORMAL);
      if (normalRooms.length > 0) {
        const room = normalRooms[Math.floor(Math.random() * normalRooms.length)];
        const cx = room.x + room.width / 2;
        const cz = room.y + room.height / 2;
        const stats = { health: 30, speed: 2, damage: 10, points: 100 };
        spriteEnemyPromises.push(
          createCustomEnemyType(queued.dataUrl, stats, queued.name).then(customType => {
            enemies.spawnEnemiesInRoom({ x: cx, z: cz }, 1, customType, room.index);
          }).catch(() => {})
        );
      }
    }

    // Community sprite enemies on floors 4+
    if (floorNum >= 4) {
      spriteEnemyPromises.push(
        communityCache.getRandomEnemySprite().then(async sprite => {
          if (!sprite) return;
          const normalRooms = dungeonFloor.rooms.filter(r => r.type === RoomType.NORMAL);
          if (normalRooms.length === 0) return;
          const room = normalRooms[Math.floor(Math.random() * normalRooms.length)];
          const cx = room.x + room.width / 2;
          const cz = room.y + room.height / 2;
          const stats = {
            health: sprite.stats.health,
            speed: sprite.stats.speed,
            damage: sprite.stats.damage,
            points: sprite.stats.points,
          };
          const customType = await createCustomEnemyType(sprite.dataUrl, stats, sprite.name);
          enemies.spawnEnemiesInRoom({ x: cx, z: cz }, 1, customType, room.index);
        }).catch(() => {})
      );
    }

    // Fire and forget — sprite enemies load async
    Promise.all(spriteEnemyPromises).catch(() => {});

    // Room entered callback
    roomTracker.setOnRoomEntered((roomIndex) => {
      const room = dungeonFloor.rooms[roomIndex];
      if (!room) return;
      if ((room.type === RoomType.BLUEPRINT || room.type === RoomType.BOSS) && !roomTracker!.isRoomCleared(roomIndex)) {
        roomTracker!.lockRoom(roomIndex);
        // Visual lock on doors
        for (const door of dungeonFloor.doors) {
          if (door.isLocked) {
            const doorMesh = floorResult!.doorMeshes.get(`${door.gridX},${door.gridZ}`);
            if (doorMesh) setDoorLocked(doorMesh, true);
          }
        }
        sfxPlayer?.play(AudioEvent.DOOR_LOCK);
        if (room.type === RoomType.BOSS) {
          sfxPlayer?.play(AudioEvent.BOSS_ROAR);
          musicPlayer?.play(AudioEvent.MUSIC_BOSS);
          // Track boss for health bar
          const allEnemies = enemies.getEnemies();
          const boss = allEnemies.find(e => e.roomIndex === roomIndex && e.type.name === 'Boss Skeleton');
          if (boss) {
            bossEnemy = { id: boss.id, health: boss.health, maxHealth: boss.type.health, name: boss.type.name };
          }
        }
      }
    });

    // Room cleared callback
    roomTracker.setOnRoomCleared((roomIndex) => {
      const room = dungeonFloor.rooms[roomIndex];
      if (!room) return;
      roomTracker!.unlockRoom(roomIndex);
      // Visual unlock
      for (const door of dungeonFloor.doors) {
        if (door.adjacentRoomIndices.includes(roomIndex)) {
          const doorMesh = floorResult!.doorMeshes.get(`${door.gridX},${door.gridZ}`);
          if (doorMesh) setDoorLocked(doorMesh, false);
        }
      }
      sfxPlayer?.play(AudioEvent.DOOR_UNLOCK);

      if (room.type === RoomType.BLUEPRINT) {
        // Drop blueprint at room center
        const cx = room.x + room.width / 2;
        const cz = room.y + room.height / 2;
        const blueprintItem = spawnBlueprintAtPosition(cx, cz, floorResult!.group);
        itemPickup.addItem(blueprintItem);
      }

      if (room.type === RoomType.BOSS) {
        bossDefeated = true;
        bossEnemy = null;
        // Change exit marker to green
        if (floorResult?.exitMarker) {
          (floorResult.exitMarker.material as THREE.MeshBasicMaterial).color.setHex(0x00ff66);
          (floorResult.exitMarker.material as THREE.MeshBasicMaterial).opacity = 0.6;
        }
        sfxPlayer?.play(AudioEvent.FLOOR_TRANSITION);
        if (musicPlayer) {
          musicPlayer.play(musicPlayer.getTrackForFloor(currentFloorNumber));
        }
      }
    });

    // Set enemy killed callback
    enemies.setOnEnemyKilled((roomIndex) => {
      roomTracker?.onEnemyKilled(roomIndex);
    });

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

  async function handleBlueprintPickup() {
    paused = true;
    player.exitPointerLock();

    const drawingResult = await showDrawingOverlay();
    if (!drawingResult) {
      paused = false;
      player.requestPointerLock();
      return;
    }

    showForgeProgress();
    try {
      const forgedItem = await forgeCreation(drawingResult);
      hideForgeProgress();
      hideDrawingOverlay();

      if (forgedItem.category === 'weapon') {
        await swordModel.loadGLB(forgedItem.data);
        swordModel.currentWeaponName = forgedItem.name;
        swordModel.currentWeaponId = forgedItem.id;
        sfxPlayer?.play(AudioEvent.ITEM_PICKUP);
      } else if (forgedItem.category === 'enemy') {
        const dataUrl = arrayBufferToDataUrl(forgedItem.data, 'image/png');
        customEnemyQueue.push({ dataUrl, name: forgedItem.name, id: forgedItem.id });
        sfxPlayer?.play(AudioEvent.ITEM_PICKUP);
      } else if (forgedItem.category === 'decoration') {
        const dataUrl = arrayBufferToDataUrl(forgedItem.data, 'image/png');
        customPaintingQueue.push({ dataUrl, name: forgedItem.name, id: forgedItem.id });
        sfxPlayer?.play(AudioEvent.ITEM_PICKUP);
      }
    } catch (err) {
      console.error('Forge failed:', err);
      hideForgeProgress();
      hideDrawingOverlay();
    }

    paused = false;
    player.requestPointerLock();
  }

  function update(delta: number, time: number) {
    if (transitioning || player.isDead || paused) return;

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

    // Room tracker update
    roomTracker?.updatePlayerPosition(pos.x, pos.z);

    // Player torch flicker
    const flicker =
      Math.sin(time * 8) * 0.3 +
      Math.sin(time * 13 + 2.3) * 0.2;
    playerTorch.intensity = 5 + flicker;

    // Room torches — distance-cull to nearest 6
    updateDungeonLights(dungeonLights, pos, time);

    // Enemy AI (pass projectileManager so ranged enemies can fire)
    const enemyResult = enemies.update(delta, pos, dungeonFloor.grid, projectileManager);
    if (enemyResult.damageToPlayer > 0) {
      player.takeDamage(enemyResult.damageToPlayer);
      damageFlash = 1;
      sfxPlayer?.play(AudioEvent.PLAYER_HURT);
    }

    // Projectile update
    if (projectileManager) {
      const targets = enemies.getTargets();
      const projResult = projectileManager.update(delta, dungeonFloor.grid, targets, pos, 0.3);
      for (const hit of projResult.enemyHits) {
        enemies.applyDamage(hit.enemyId, hit.damage);
      }
      if (projResult.playerDamage > 0) {
        player.takeDamage(projResult.playerDamage);
        damageFlash = 1;
        sfxPlayer?.play(AudioEvent.PLAYER_HURT);
      }
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
      // Skip locked doors
      if (door.isLocked) continue;

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
        handleBlueprintPickup();
      }
    }

    // Check exit — requires boss defeated
    const ex = dungeonFloor.exitPosition;
    if (bossDefeated && Math.abs(pos.x - ex.x) < 1.5 && Math.abs(pos.z - ex.z) < 1.5) {
      nextFloor();
    }

    // Update boss health tracking
    if (bossEnemy) {
      const boss = enemies.getEnemies().find(e => e.id === bossEnemy!.id);
      if (boss) {
        bossEnemy.health = boss.health;
      }
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
      showBoss: bossEnemy != null,
      bossName: bossEnemy?.name,
      bossHealth: bossEnemy?.health,
      bossMaxHealth: bossEnemy?.maxHealth,
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
    disposePaintings(paintings);
    disposeDungeonLights(dungeonLights);
    itemPickup.dispose();
    disposeDecorationShared();
    disposePaintingShared();
    disposeItemShared();
    projectileManager?.dispose();
    disposeProjectileShared();
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
    pause: () => { paused = true; player.exitPointerLock(); },
    resume: () => { paused = false; player.requestPointerLock(); },
    isPaused: () => paused,
  };
}
