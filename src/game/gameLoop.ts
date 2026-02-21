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
import { DualSwordModel } from '../weapons/dualSwordModel';
import { type MusicPlayer, type SfxPlayer, AudioEvent } from '../audio';
import { createDungeonLights, updateDungeonLights, disposeDungeonLights, type DungeonLight } from '../dungeon/dungeonLights';
import { spawnDecorations, disposeDecorations, getPlacedDecorations } from '../decorations/decorationPlacer';
import { disposeDecorationShared } from '../decorations/decorationModels';
import { spawnPaintings, disposePaintings, type PlacedPainting } from '../decorations/paintingPlacer';
import { disposePaintingShared } from '../decorations/paintingModel';
import { createCustomEnemyType } from '../enemies/customEnemyModel';
import { spawnItems, spawnBlueprintAtPosition, type PlacedItem } from '../items/itemPlacer';
import { ItemPickupSystem } from '../items/itemPickup';
import { ItemType, ITEM_DEFS, disposeItemShared } from '../items/itemTypes';
import { RoomTracker } from '../dungeon/roomTracker';
import { setDoorLocked } from '../dungeon/doorMesh';
import { ProjectileManager } from '../projectiles/projectileManager';
import { PROJECTILE_TYPES, type ProjectileType } from '../projectiles/projectileTypes';
import { disposeProjectileShared } from '../projectiles/projectileModels';
import { showDrawingOverlay, hideDrawingOverlay, showForgeProgress, hideForgeProgress } from '../drawing/drawingOverlay';
import { forgeCreation, arrayBufferToDataUrl } from '../forge/forgeCreation';
import { communityCache } from '../community/communityCache';
import { setOnCloseCallback, isConsoleOpen } from '../cheats/cheatConsole';
import { registerGameCheats } from '../cheats/gameCheats';
import { BreakableSystem } from '../decorations/breakableSystem';
import { pushAwayFromCircles, type CircleObstacle } from '../player/collision';
import { cheats } from '../cheats/cheatState';
import { EnemyAIState } from '../enemies/enemyAI';
import { createPauseMenu3D } from '../ui/pauseMenu3d';
import { showLoadingText3D, hideLoadingText3D } from '../ui/loadingScreen3d';
import { showCrosshair, hideCrosshair, showClickHint, hideClickHint, setGameCursor, setDefaultCursor, disposeCursor } from '../ui/gameCursor';

import type { EnemyType } from '../enemies/enemyTypes';

/** Create a boss-scaled version of any enemy type. */
function makeBossVersion(baseType: EnemyType): EnemyType {
  return {
    ...baseType,
    name: `Boss ${baseType.name}`,
    health: Math.round(baseType.health * 4),
    damage: Math.round(baseType.damage * 2),
    speed: baseType.speed * 0.85,
    points: Math.round(baseType.points * 5),
    attackRange: (baseType.attackRange || 1.5) * 1.3,
    attackCooldown: baseType.attackCooldown,
    scale: (baseType.scale || 1.0) * 1.5,
  };
}

export interface CreationUsed {
  name: string;
  category: string;
}

export interface RunStats {
  score: number;
  floor: number;
  enemiesKilled: number;
  creationsUsed: CreationUsed[];
}

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
  getRunStats: () => RunStats;
  /** Called when the player selects "Restart" from the pause menu. */
  onRestart: (() => void) | null;
  /** Called when the player selects "Quit to Menu" from the pause menu. */
  onQuit: (() => void) | null;
  /** Called when the player dies. */
  onGameOver: (() => void) | null;
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
  let cameraShake = 0;
  let lowHealthActive = false;
  let heartbeatTimer = 0;
  let decorations: THREE.Group[] = [];
  let paintings: PlacedPainting[] = [];
  let dungeonLights: DungeonLight[] = [];
  const itemPickup = new ItemPickupSystem();
  const breakableSystem = new BreakableSystem(scene);

  // New Phase 1 state
  let paused = false;
  let bossDefeated = false;
  let equippedWeapon: 'melee' | 'ranged' = 'melee';
  let roomTracker: RoomTracker | null = null;
  let projectileManager: ProjectileManager | null = null;
  let customProjectileType: ProjectileType | null = null;
  interface QueuedSprite { dataUrl: string; name: string; id: number; }
  const customEnemyQueue: QueuedSprite[] = [];
  const customPaintingQueue: QueuedSprite[] = [];
  let bossEnemy: { id: number; health: number; maxHealth: number; name: string } | null = null;

  // Weapon inventory
  interface InventoryWeapon {
    name: string;
    id: number | null;
    glbData: ArrayBuffer | null; // null = default sword
    type: 'sword' | 'dual' | 'staff' | 'bow';
  }
  const weaponInventory: InventoryWeapon[] = [
    { name: 'Default Sword', id: null, glbData: null, type: 'sword' },
  ];
  let currentWeaponIndex = 0;

  // Run stats tracking
  let enemiesKilledCount = 0;
  const creationsUsed: CreationUsed[] = [];
  let onGameOverCb: (() => void) | null = null;

  // Footstep tracking
  let footstepDistance = 0;
  const FOOTSTEP_INTERVAL = 2.5;
  let lastPlayerX = 0;
  let lastPlayerZ = 0;

  // Track whether hit was already checked this attack
  let attackHitChecked = false;

  // Pre-allocated obstacle buffer for circle collision (never allocate in animate loop)
  const _obstacleBuffer: CircleObstacle[] = [];
  for (let i = 0; i < 300; i++) _obstacleBuffer.push({ x: 0, z: 0, radius: 0 });
  let _obstacleCount = 0;

  // Ambient + fog for dungeon atmosphere
  ambientLight.color.setHex(0x1a1a2e);
  ambientLight.intensity = 0.55;
  const menuFogDensity = fog.density;
  fog.density = 0.013;

  // Player flashlight — wide SpotLight cone (Slenderman style)
  const playerTorch = new THREE.SpotLight(0xff9944, 9, 30, Math.PI / 3, 0.4, 1.2);
  playerTorch.position.set(0, 0, 0);
  const torchTarget = new THREE.Object3D();
  torchTarget.position.set(0, -0.5, -5);
  camera.add(torchTarget);
  playerTorch.target = torchTarget;
  camera.add(playerTorch);

  const player = new PlayerController(camera, [[]]);
  const combat = new SwordCombat();
  const enemies = new EnemyManager(scene);
  const hud = new HUD();
  const pauseMenu = await createPauseMenu3D(camera);
  const swordModel = new SwordModel(camera);
  let dualSwordModel: DualSwordModel | null = null;
  let activeWeaponModel: 'sword' | 'dual' = 'sword';

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

  // ESC detection flag — browsers fire keydown(Escape) BEFORE exiting pointer lock
  let escPressedRecently = false;

  const onEscKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && document.pointerLockElement) {
      escPressedRecently = true;
      setTimeout(() => { escPressedRecently = false; }, 200);
    }
  };
  document.addEventListener('keydown', onEscKeyDown, true);

  // Pointer lock change — only pause on ESC, otherwise show click-to-resume hint
  const onPointerLockChange = () => {
    if (document.pointerLockElement) {
      // Lock acquired — show crosshair, hide hint, set game cursor
      showCrosshair();
      hideClickHint();
      return;
    }
    // Lock lost
    hideCrosshair();
    if (player.isDead || transitioning || paused) return;
    if (isConsoleOpen()) return;

    if (escPressedRecently) {
      // User pressed ESC — pause and show menu
      escPressedRecently = false;
      paused = true;
      pauseMenu.show();
      setDefaultCursor();
    } else {
      // Lost focus for another reason — show hint, re-acquire on click
      setGameCursor();
      showClickHint();
    }
  };
  document.addEventListener('pointerlockchange', onPointerLockChange);

  // onRestart / onQuit — set by main.ts
  let onRestartCb: (() => void) | null = null;
  let onQuitCb: (() => void) | null = null;

  // Pause menu callbacks
  pauseMenu.setCallbacks({
    onResume: () => {
      pauseMenu.hide();
      paused = false;
      hideClickHint();
      player.requestPointerLock();
    },
    onRestart: () => {
      pauseMenu.hide();
      paused = false;
      onRestartCb?.();
    },
    onQuit: () => {
      pauseMenu.hide();
      paused = false;
      onQuitCb?.();
    },
  });

  // Spawn a custom sprite enemy at the player's position
  async function spawnEnemyFromDB(enemyId: number): Promise<string> {
    try {
      const metaRes = await fetch('/api/enemies');
      if (!metaRes.ok) return 'Failed to fetch enemies';
      const allEnemies = await metaRes.json() as { id: number; name: string; health: number; speed: number; damage: number; points: number }[];
      const meta = allEnemies.find(e => e.id === enemyId);
      if (!meta) return `Enemy id ${enemyId} not found`;

      const spriteRes = await fetch(`/api/enemies/${enemyId}/model`);
      if (!spriteRes.ok) return `Failed to fetch enemy sprite`;
      const spriteBuffer = await spriteRes.arrayBuffer();
      const dataUrl = arrayBufferToDataUrl(spriteBuffer, 'image/png');

      const stats = { health: meta.health, speed: meta.speed, damage: meta.damage, points: meta.points };
      const customType = await createCustomEnemyType(dataUrl, stats, meta.name);

      const pos = player.getPosition();
      const spawnX = pos.x + player.getDirection().x * 3;
      const spawnZ = pos.z + player.getDirection().z * 3;
      enemies.spawnEnemiesInRoom({ x: spawnX, z: spawnZ }, 1, customType, dungeonFloor.grid, -1);
      return `Spawned "${meta.name}" ahead of you!`;
    } catch (err) {
      return `Spawn failed: ${err}`;
    }
  }

  // Register game cheats
  registerGameCheats({
    getPlayer: () => player,
    getEnemyManager: () => enemies,
    getCurrentFloor: () => currentFloorNumber,
    loadFloor: async (n) => { currentFloorNumber = n; await loadFloor(n); },
    spawnBlueprint: () => {
      const pos = player.getPosition();
      const item = spawnBlueprintAtPosition(pos.x, pos.z, floorResult!.group);
      itemPickup.addItem(item);
    },
    spawnEnemy: (id) => spawnEnemyFromDB(id),
  });

  function triggerAttack() {
    combat.startAttack();
    attackHitChecked = false;
    sfxPlayer?.play(AudioEvent.SWORD_SWING);
    if (activeWeaponModel === 'dual' && dualSwordModel) {
      dualSwordModel.startAttack();
    }
  }

  async function switchToWeapon(weapon: InventoryWeapon) {
    if (weapon.type === 'dual' && weapon.glbData) {
      swordModel.setVisible(false);
      if (!dualSwordModel) {
        dualSwordModel = new DualSwordModel(camera);
      }
      await dualSwordModel.loadGLB(weapon.glbData);
      dualSwordModel.setVisible(true);
      dualSwordModel.currentWeaponName = weapon.name;
      dualSwordModel.currentWeaponId = weapon.id;
      activeWeaponModel = 'dual';
      equippedWeapon = 'melee';
    } else if (weapon.glbData) {
      if (dualSwordModel) dualSwordModel.setVisible(false);
      swordModel.setVisible(true);
      await swordModel.loadGLB(weapon.glbData);
      swordModel.currentWeaponName = weapon.name;
      swordModel.currentWeaponId = weapon.id;
      activeWeaponModel = 'sword';
      equippedWeapon = (weapon.type === 'staff' || weapon.type === 'bow') ? 'ranged' : 'melee';
    } else {
      // Default sword
      if (dualSwordModel) dualSwordModel.setVisible(false);
      swordModel.setVisible(true);
      swordModel.loadFallback();
      swordModel.currentWeaponName = 'Default Sword';
      swordModel.currentWeaponId = null;
      activeWeaponModel = 'sword';
      equippedWeapon = 'melee';
    }
  }

  // Click to attack, or re-acquire pointer lock if lost
  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    if (isConsoleOpen()) return;
    if (document.pointerLockElement) {
      if (equippedWeapon === 'ranged') {
        projectileManager?.spawn(player.getPosition(), player.getDirection(), customProjectileType ?? PROJECTILE_TYPES.MAGIC_BOLT, 'player');
        sfxPlayer?.play(AudioEvent.PROJECTILE_FIRE);
      } else {
        triggerAttack();
      }
    } else if (!transitioning && !player.isDead && !paused) {
      hideClickHint();
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
    if (e.code === 'KeyF' && document.pointerLockElement && !player.isDead) {
      if (weaponInventory.length > 1) {
        currentWeaponIndex = (currentWeaponIndex + 1) % weaponInventory.length;
        const weapon = weaponInventory[currentWeaponIndex];
        switchToWeapon(weapon);
      }
    }
    if (e.code === 'KeyG' && document.pointerLockElement && !player.isDead) {
      if (weaponInventory.length > 1 && currentWeaponIndex > 0) {
        // Drop current weapon — spawn a crate at player position
        const dropped = weaponInventory.splice(currentWeaponIndex, 1)[0];
        currentWeaponIndex = Math.min(currentWeaponIndex, weaponInventory.length - 1);
        const weapon = weaponInventory[currentWeaponIndex];
        switchToWeapon(weapon);

        // Drop a visual crate at player position
        if (floorResult) {
          const pos = player.getPosition();
          const crateDef = ITEM_DEFS[ItemType.WEAPON_CRATE];
          const crateModel = crateDef.modelGenerator();
          crateModel.position.set(pos.x, 0.5, pos.z);
          floorResult.group.add(crateModel);
          // Store the dropped weapon data on the item for re-pickup
          const droppedItem: PlacedItem = {
            def: crateDef,
            model: crateModel,
            position: new THREE.Vector3(pos.x, 0, pos.z),
            collected: false,
          };
          (droppedItem as unknown as Record<string, unknown>)._weaponData = dropped;
          itemPickup.addItem(droppedItem);
        }
        sfxPlayer?.play(AudioEvent.ITEM_PICKUP);
      }
    }
  };
  document.addEventListener('keydown', onKeyDown);

  async function loadFloor(floorNum: number) {
    // Clean previous floor
    if (floorResult) {
      scene.remove(floorResult.group);
      disposeFloorMesh(floorResult);
    }
    disposeDecorations(decorations);
    disposePaintings(paintings);
    disposeDungeonLights(dungeonLights);
    itemPickup.dispose();
    breakableSystem.clear();
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

    // Register breakable decorations
    const placedDecos = getPlacedDecorations();
    for (const pd of placedDecos) {
      if (pd.def.breakable) {
        breakableSystem.register({
          mesh: pd.model,
          worldX: pd.worldX,
          worldZ: pd.worldZ,
          health: pd.def.health || 1,
          lootType: pd.def.lootType,
        });
      }
    }

    // Register doors as breakable
    for (const door of dungeonFloor.doors) {
      door.health = 3; // 3 hits to break
      const doorMesh = floorResult!.doorMeshes.get(`${door.gridX},${door.gridZ}`);
      if (doorMesh) {
        breakableSystem.register({
          mesh: doorMesh,
          worldX: door.gridX + 0.5,
          worldZ: door.gridZ + 0.5,
          health: 3,
          onBreak: () => {
            door.isOpen = true;
            door.openProgress = 1;
            door.health = 0;
          },
        });
      }
    }

    // Spawn wall paintings from queued custom paintings + community sprites
    const paintingUrls: string[] = [];
    while (customPaintingQueue.length > 0) {
      const queued = customPaintingQueue.shift()!;
      paintingUrls.push(queued.dataUrl);
    }
    // Community decoration sprites on all floors
    if (floorNum >= 1) {
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

    // Demo: always drop a blueprint in the spawn room on floor 1
    if (currentFloorNumber === 1 && dungeonFloor.rooms.length > 0) {
      const spawnRoom = dungeonFloor.rooms[0];
      const cx = spawnRoom.x + spawnRoom.width / 2 + 3;
      const cz = spawnRoom.y + spawnRoom.height / 2;
      const bp = spawnBlueprintAtPosition(cx, cz, floorResult.group);
      items.push(bp);
    }

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

    // Build combined enemy spawn pool: built-in + DB enemies (all equally likely)
    const allEnemyTypes = Object.values(ENEMY_TYPES).filter(
      t => t.name !== 'Boss Skeleton' && t.name !== 'Skeleton Archer'
    );

    // Fetch DB enemies and add to spawn pool
    let demoBossType: EnemyType | null = null;
    try {
      const res = await fetch('/api/enemies');
      if (res.ok) {
        const dbEnemies = await res.json() as { id: number; name: string; health: number; speed: number; damage: number; points: number }[];
        for (const meta of dbEnemies) {
          const spriteRes = await fetch(`/api/enemies/${meta.id}/model`);
          if (!spriteRes.ok) continue;
          const spriteBuffer = await spriteRes.arrayBuffer();
          const dataUrl = arrayBufferToDataUrl(spriteBuffer, 'image/png');
          const stats = { health: meta.health, speed: meta.speed, damage: meta.damage, points: meta.points };
          const customType = await createCustomEnemyType(dataUrl, stats, meta.name);
          allEnemyTypes.push(customType);
          // Track enemy ID 4 for demo floor 1 boss
          if (meta.id === 4) demoBossType = customType;
        }
      }
    } catch {
      // Ignore — fall back to built-in enemies only
    }

    for (const room of dungeonFloor.rooms) {
      const roomSpawns = spawnsByRoom.get(room.index) || [];
      if (roomSpawns.length === 0) continue;

      let count: number;

      if (room.type === RoomType.BOSS) {
        // Floor 1 demo boss: always use enemy ID 4 if available
        const baseType = (currentFloorNumber === 1 && demoBossType)
          ? demoBossType
          : allEnemyTypes[Math.floor(Math.random() * allEnemyTypes.length)];
        const bossType = makeBossVersion(baseType);
        const bossSpawn = roomSpawns.find(s => s.isBoss) || roomSpawns[0];
        enemies.spawnEnemiesInRoom(bossSpawn, 1, bossType, dungeonFloor.grid, room.index);
        // 2-3 regular enemies
        count = 2 + Math.floor(Math.random() * 2);
        const minionSpawns = roomSpawns.filter(s => !s.isBoss).slice(0, count);
        for (const sp of minionSpawns) {
          const type = allEnemyTypes[Math.floor(Math.random() * allEnemyTypes.length)];
          enemies.spawnEnemiesInRoom(sp, 1, type, dungeonFloor.grid, room.index);
        }
        roomTracker.registerEnemiesInRoom(room.index, 1 + minionSpawns.length);
      } else if (room.type === RoomType.BLUEPRINT) {
        count = 4 + Math.floor(Math.random() * 3); // 4-6 enemies
        const actualCount = Math.min(count, roomSpawns.length);
        for (let i = 0; i < actualCount; i++) {
          const type = allEnemyTypes[Math.floor(Math.random() * allEnemyTypes.length)];
          enemies.spawnEnemiesInRoom(roomSpawns[i], 1, type, dungeonFloor.grid, room.index);
        }
        roomTracker.registerEnemiesInRoom(room.index, actualCount);
      } else if (room.type === RoomType.NORMAL) {
        const [minE, maxE] = config.enemiesPerRoom;
        count = minE + Math.floor(Math.random() * (maxE - minE + 1));
        const actualCount = Math.min(count, roomSpawns.length);
        for (let i = 0; i < actualCount; i++) {
          const type = allEnemyTypes[Math.floor(Math.random() * allEnemyTypes.length)];
          enemies.spawnEnemiesInRoom(roomSpawns[i], 1, type, dungeonFloor.grid, room.index);
        }
        roomTracker.registerEnemiesInRoom(room.index, actualCount);
      }
      // SPAWN rooms get no enemies
    }

    // Spawn custom sprite enemies from queue (newly forged, not yet in DB)
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
            enemies.spawnEnemiesInRoom({ x: cx, z: cz }, 1, customType, dungeonFloor.grid, room.index);
          }).catch(() => {})
        );
      }
    }

    // Fire and forget — queued sprite enemies load async
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
          // Track boss for health bar — find the boss by "Boss " name prefix
          const allEnemies = enemies.getEnemies();
          const boss = allEnemies.find(e => e.roomIndex === roomIndex && e.type.name.startsWith('Boss '));
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
        sfxPlayer?.play(AudioEvent.STINGER_FLOOR_CLEAR);
        if (musicPlayer) {
          musicPlayer.play(musicPlayer.getTrackForFloor(currentFloorNumber));
        }
      }
    });

    // Set enemy killed callback
    enemies.setOnEnemyKilled((roomIndex) => {
      roomTracker?.onEnemyKilled(roomIndex);
      enemiesKilledCount++;
    });

    // Spawn fragment explosion when enemies die
    enemies.setOnEnemyDied((x, z, color) => {
      breakableSystem.spawnFragmentsAt(x, z, color, 8, 1.5);
    });

    // Update music for floor
    if (musicPlayer) {
      musicPlayer.play(musicPlayer.getTrackForFloor(floorNum));
    }
  }

  // Load first floor
  await showLoadingText3D(camera, 'Entering the Dungeon...');
  await loadFloor(currentFloorNumber);
  hideLoadingText3D(camera);
  player.requestPointerLock();
  showCrosshair();
  hud.show();

  async function nextFloor() {
    if (transitioning) return;
    transitioning = true;
    player.exitPointerLock();
    hideCrosshair();
    hideClickHint();

    // Play stone creak (heavy door / stairway entrance) then the descent stinger
    sfxPlayer?.play(AudioEvent.STONE_CREAK);
    sfxPlayer?.play(AudioEvent.STINGER_FLOOR_DESCENT);

    await fadeToBlack(fadeOverlay, 800);
    await showLoadingText3D(camera, `Descending to Floor ${currentFloorNumber + 1}...`);
    currentFloorNumber++;
    await loadFloor(currentFloorNumber);
    hideLoadingText3D(camera);

    // Footstep on arrival at the new floor
    sfxPlayer?.play(AudioEvent.FOOTSTEP);

    await fadeFromBlack(fadeOverlay, 800);

    player.requestPointerLock();
    transitioning = false;
  }

  async function handleBlueprintPickup() {
    paused = true;
    player.exitPointerLock();
    hideCrosshair();
    hideClickHint();
    setDefaultCursor();

    const drawingResult = await showDrawingOverlay();
    if (!drawingResult) {
      paused = false;
      player.requestPointerLock();
      return;
    }

    showForgeProgress();

    // Start forge ambiance — play random forge SFX at intervals
    const forgeSfxEvents = [AudioEvent.CHAINS_RATTLE, AudioEvent.STONE_CREAK, AudioEvent.DISTANT_RUMBLE, AudioEvent.SWORD_HIT];
    const forgeInterval = setInterval(() => {
      const event = forgeSfxEvents[Math.floor(Math.random() * forgeSfxEvents.length)];
      sfxPlayer?.play(event);
    }, 2500);
    musicPlayer?.play(AudioEvent.MUSIC_COMBAT);

    try {
      const forgedItem = await forgeCreation(drawingResult);
      clearInterval(forgeInterval);
      hideForgeProgress();
      hideDrawingOverlay();

      sfxPlayer?.play(AudioEvent.FORGE_COMPLETE);
      if (musicPlayer) {
        musicPlayer.play(musicPlayer.getTrackForFloor(currentFloorNumber));
      }

      // Track creation for run summary
      creationsUsed.push({ name: forgedItem.name, category: forgedItem.category });

      if (forgedItem.category === 'weapon') {
        if (forgedItem.weaponType === 'dual-daggers') {
          // Switch to dual daggers
          swordModel.setVisible(false);
          if (!dualSwordModel) {
            dualSwordModel = new DualSwordModel(camera);
          }
          await dualSwordModel.loadGLB(forgedItem.data);
          dualSwordModel.setVisible(true);
          dualSwordModel.currentWeaponName = forgedItem.name;
          dualSwordModel.currentWeaponId = forgedItem.id;
          activeWeaponModel = 'dual';
        } else {
          // Single weapon (sword, staff, hammer, axe, spear, mace, bow)
          if (dualSwordModel) {
            dualSwordModel.setVisible(false);
          }
          swordModel.setVisible(true);
          activeWeaponModel = 'sword';
          await swordModel.loadGLB(forgedItem.data);
          swordModel.currentWeaponName = forgedItem.name;
          swordModel.currentWeaponId = forgedItem.id;
        }

        // Add forged weapon to inventory
        const forgedWeapon: InventoryWeapon = {
          name: forgedItem.name,
          id: forgedItem.id,
          glbData: forgedItem.data,
          type: forgedItem.weaponType === 'dual-daggers' ? 'dual' :
            (forgedItem.weaponType === 'staff' || forgedItem.weaponType === 'bow') ? forgedItem.weaponType as 'staff' | 'bow' : 'sword',
        };
        weaponInventory.push(forgedWeapon);
        currentWeaponIndex = weaponInventory.length - 1;

        // Staff or bow → ranged mode with custom projectile
        if (forgedItem.weaponType === 'staff' || forgedItem.weaponType === 'bow') {
          equippedWeapon = 'ranged';
          // Build custom ProjectileType from the drawing's projectile pad
          const projColor = drawingResult.projectileDominantColor ?? PROJECTILE_TYPES.MAGIC_BOLT.color;
          const projSprite = drawingResult.projectileImageData;
          customProjectileType = {
            name: forgedItem.name + ' Bolt',
            speed: 15,
            damage: 20,
            radius: 0.15,
            lifetime: 2,
            piercing: false,
            color: projColor,
            scale: 1,
            spriteDataUrl: projSprite,
          };
        } else {
          equippedWeapon = 'melee';
        }
      } else if (forgedItem.category === 'enemy') {
        // Spawn immediately on current floor + queue for future floors
        const dataUrl = arrayBufferToDataUrl(forgedItem.data, 'image/png');
        customEnemyQueue.push({ dataUrl, name: forgedItem.name, id: forgedItem.id });
        const pos = player.getPosition();
        const dir = player.getDirection();
        const spawnX = pos.x + dir.x * 4;
        const spawnZ = pos.z + dir.z * 4;
        const stats = { health: 30, speed: 2, damage: 10, points: 100 };
        createCustomEnemyType(dataUrl, stats, forgedItem.name).then(customType => {
          enemies.spawnEnemiesInRoom({ x: spawnX, z: spawnZ }, 1, customType, dungeonFloor.grid, -1);
        }).catch(() => {});
      } else if (forgedItem.category === 'decoration') {
        const dataUrl = arrayBufferToDataUrl(forgedItem.data, 'image/png');
        customPaintingQueue.push({ dataUrl, name: forgedItem.name, id: forgedItem.id });
        // Also place on current floor immediately
        if (dungeonFloor && floorResult) {
          spawnPaintings(dungeonFloor, [dataUrl], floorResult.group).then(placed => {
            paintings.push(...placed);
          }).catch(() => {});
        }
      }
    } catch (err) {
      clearInterval(forgeInterval);
      console.error('Forge failed:', err);
      hideForgeProgress();
      hideDrawingOverlay();
      if (musicPlayer) {
        musicPlayer.play(musicPlayer.getTrackForFloor(currentFloorNumber));
      }
    }

    paused = false;
    player.requestPointerLock();
  }

  function update(delta: number, time: number) {
    if (transitioning || player.isDead || paused) return;

    // Player movement
    player.update(delta);

    // Get player position (used for collision, footsteps, and everything below)
    let pos = player.getPosition();

    // Object collision — push player away from closed doors, pillars, enemies
    if (!cheats.noclip) {
      _obstacleCount = 0;

      // Closed doors (radius covers the doorway)
      for (const door of dungeonFloor.doors) {
        if (!door.isOpen && door.health > 0 && _obstacleCount < 300) {
          const obs = _obstacleBuffer[_obstacleCount++];
          obs.x = door.gridX + 0.5;
          obs.z = door.gridZ + 0.5;
          obs.radius = 1.0;
        }
      }

      // Alive enemies
      const aliveEnemies = enemies.getEnemies();
      for (const enemy of aliveEnemies) {
        if (enemy.state !== EnemyAIState.DEAD && _obstacleCount < 300) {
          const obs = _obstacleBuffer[_obstacleCount++];
          obs.x = enemy.position.x;
          obs.z = enemy.position.z;
          obs.radius = 0.4;
        }
      }

      // Surviving pillars (still in scene)
      const placedDecos = getPlacedDecorations();
      for (const pd of placedDecos) {
        if (pd.def.name === 'pillar' && pd.model.parent && _obstacleCount < 300) {
          const obs = _obstacleBuffer[_obstacleCount++];
          obs.x = pd.worldX;
          obs.z = pd.worldZ;
          obs.radius = 0.35;
        }
      }

      const pushed = pushAwayFromCircles(pos.x, pos.z, 0.45, _obstacleBuffer, _obstacleCount);
      if (pushed.x !== pos.x || pushed.z !== pos.z) {
        player.adjustPosition(pushed.x, pushed.z);
        pos = player.getPosition();
      }
    }

    // Footstep SFX — track distance walked
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

    // Player flashlight flicker — erratic torch feel
    const flicker =
      Math.sin(time * 7) * 0.6 +
      Math.sin(time * 13 + 2.3) * 0.4 +
      Math.sin(time * 23 + 5.1) * 0.3;
    playerTorch.intensity = 8 + flicker;
    // Subtle orange color shift with flicker
    const colorShift = Math.sin(time * 11) * 0.03;
    playerTorch.color.setRGB(1.0, 0.6 + colorShift, 0.25 - colorShift * 0.5);

    // Room torches — distance-cull to nearest 6
    updateDungeonLights(dungeonLights, pos, time);

    // Enemy AI (pass projectileManager so ranged enemies can fire)
    const enemyResult = enemies.update(delta, pos, dungeonFloor.grid, projectileManager);
    if (enemyResult.damageToPlayer > 0) {
      player.takeDamage(enemyResult.damageToPlayer);
      damageFlash = 1;
      cameraShake = 0.3;
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
        cameraShake = 0.3;
        sfxPlayer?.play(AudioEvent.PLAYER_HURT);
      }
    }

    // Combat
    combat.update(delta);
    if (activeWeaponModel === 'dual' && dualSwordModel) {
      dualSwordModel.update(combat.isAttacking(), combat.getAttackProgress(), delta);
    } else {
      swordModel.update(combat.isAttacking(), combat.getAttackProgress(), delta);
    }
    if (combat.isAttacking() && combat.getAttackProgress() < 0.1 && !attackHitChecked) {
      attackHitChecked = true;
      const targets = enemies.getTargets();
      const dir = player.getDirection();
      const hitIds = combat.checkHits(pos, dir, targets);
      if (hitIds.length > 0) {
        sfxPlayer?.play(AudioEvent.SWORD_HIT);
      }
      for (const id of hitIds) {
        enemies.applyDamage(id, combat.damage);
      }

      // Check breakable decorations
      const breakResult = breakableSystem.checkHit(pos.x, pos.z, dir.x, dir.z, 2.5);
      if (breakResult) {
        sfxPlayer?.play(AudioEvent.SWORD_HIT);
        // Spawn loot if the decoration had a loot type
        if (breakResult.lootType && floorResult) {
          const lootItemType = breakResult.lootType === 'health' ? ItemType.HEALTH_POTION : ItemType.SCORE_GEM;
          const lootDef = ITEM_DEFS[lootItemType];
          const lootModel = lootDef.modelGenerator();
          lootModel.position.set(breakResult.worldX, 0.5, breakResult.worldZ);
          floorResult.group.add(lootModel);
          itemPickup.addItem({
            def: lootDef,
            model: lootModel,
            position: new THREE.Vector3(breakResult.worldX, 0, breakResult.worldZ),
            collected: false,
          });
        }
      }
    }

    // Update breakable fragment physics
    breakableSystem.update(delta);

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
      } else if (item.def.type === ItemType.WEAPON_CRATE) {
        sfxPlayer?.play(AudioEvent.ITEM_PICKUP);

        // Check if this is a dropped weapon with stored data
        const weaponData = (item as unknown as Record<string, unknown>)._weaponData as InventoryWeapon | undefined;
        if (weaponData) {
          weaponInventory.push(weaponData);
          // Auto-switch to picked up weapon
          currentWeaponIndex = weaponInventory.length - 1;
          switchToWeapon(weaponData);
        } else {
          // Load random community weapon
          communityCache.getRandomWeaponGLB().then(async (result) => {
            if (result) {
              const newWeapon: InventoryWeapon = {
                name: result.name,
                id: null,
                glbData: result.glb,
                type: 'sword', // community weapons default to sword type
              };
              weaponInventory.push(newWeapon);
              // Auto-switch to new weapon
              currentWeaponIndex = weaponInventory.length - 1;
              await switchToWeapon(newWeapon);
            }
          }).catch(() => {});
        }
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

    // Fade damage flash (slower decay for visibility)
    if (damageFlash > 0) {
      damageFlash = Math.max(0, damageFlash - delta * 2);
    }

    // Camera shake on damage — temporary offset, non-accumulating
    if (cameraShake > 0) {
      const shakeIntensity = cameraShake * 0.02;
      const shakeX = (Math.random() - 0.5) * 2 * shakeIntensity;
      const shakeY = (Math.random() - 0.5) * 2 * shakeIntensity;
      camera.rotation.x += shakeX;
      camera.rotation.y += shakeY;
      cameraShake = Math.max(0, cameraShake - delta * 3);
      // Note: PlayerController.update() overwrites rotation next frame,
      // so these offsets are naturally non-accumulating.
    }

    // Low health warning — persistent red vignette + heartbeat SFX
    const isLowHealth = player.health > 0 && player.health <= 50;
    if (isLowHealth && !lowHealthActive) {
      lowHealthActive = true;
      heartbeatTimer = 0;
      sfxPlayer?.play(AudioEvent.PLAYER_HURT);
    } else if (!isLowHealth && lowHealthActive) {
      lowHealthActive = false;
    }
    if (lowHealthActive) {
      heartbeatTimer += delta;
      if (heartbeatTimer >= 2.0) {
        heartbeatTimer -= 2.0;
        sfxPlayer?.play(AudioEvent.HEARTBEAT);
      }
    }

    // Combine damage flash with persistent low-health vignette
    let effectiveDamageFlash = damageFlash;
    if (lowHealthActive) {
      // Pulsing red vignette that intensifies as health drops
      const healthRatio = player.health / 50; // 1.0 at 50hp, 0.0 at 0hp
      const pulseBase = 0.15 + (1 - healthRatio) * 0.25; // 0.15-0.40
      const pulse = pulseBase + Math.sin(heartbeatTimer * Math.PI) * 0.08;
      effectiveDamageFlash = Math.max(effectiveDamageFlash, pulse);
    }

    // Update HUD
    const hudState: HUDState = {
      health: player.health,
      maxHealth: 100,
      score: player.score,
      floor: currentFloorNumber,
      isAttacking: combat.isAttacking(),
      attackProgress: combat.getAttackProgress(),
      damageFlash: effectiveDamageFlash,
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
    document.removeEventListener('keydown', onEscKeyDown, true);
    document.removeEventListener('pointerlockchange', onPointerLockChange);
    disposeCursor();
    pauseMenu.dispose();
    player.exitPointerLock();
    player.dispose();
    enemies.dispose();
    hud.dispose();
    swordModel.dispose();
    dualSwordModel?.dispose();
    camera.remove(playerTorch);
    camera.remove(torchTarget);
    playerTorch.dispose();
    disposeDecorations(decorations);
    disposePaintings(paintings);
    disposeDungeonLights(dungeonLights);
    itemPickup.dispose();
    breakableSystem.dispose();
    disposeDecorationShared();
    disposePaintingShared();
    disposeItemShared();
    projectileManager?.dispose();
    disposeProjectileShared();
    if (floorResult) {
      scene.remove(floorResult.group);
      disposeFloorMesh(floorResult);
    }
    hideLoadingText3D(camera);
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
    pause: () => { paused = true; player.exitPointerLock(); hideCrosshair(); hideClickHint(); setDefaultCursor(); },
    resume: () => { paused = false; hideClickHint(); player.requestPointerLock(); },
    isPaused: () => paused,
    getRunStats: () => ({
      score: player.score,
      floor: currentFloorNumber,
      enemiesKilled: enemiesKilledCount,
      creationsUsed: [...creationsUsed],
    }),
    get onRestart() { return onRestartCb; },
    set onRestart(fn: (() => void) | null) { onRestartCb = fn; },
    get onQuit() { return onQuitCb; },
    set onQuit(fn: (() => void) | null) { onQuitCb = fn; },
    get onGameOver() { return onGameOverCb; },
    set onGameOver(fn: (() => void) | null) { onGameOverCb = fn; },
  };
}
