# DungeonSlopper Game Design

## Overview

Transform the splash screen into a Doom-style first-person dungeon crawler. Click "Start" on the menu, screen fades to black, fades into a procedurally generated dungeon. Slay enemies with a sword, earn points, descend floors.

## Game State Machine

```
MENU -> FADE_OUT -> FADE_IN -> PLAYING -> DEAD -> GAME_OVER -> MENU
                                  |
                              FLOOR_TRANSITION (stairs found)
                                  |
                              FADE_OUT -> generate next floor -> FADE_IN -> PLAYING
```

## Dungeon Generation

### Grid-based room system
- 2D grid (50x50 cells, each cell = 1 world unit)
- Rooms: rectangular regions (6-12 cells wide/tall)
- BSP or random placement connects rooms with corridors
- Each floor is a `DungeonFloor` with rooms, corridors, spawn points, exit staircase

### Data structures
```typescript
interface DungeonFloor {
  grid: CellType[][];
  rooms: Room[];
  spawnPoints: Vector2[];
  playerStart: Vector2;
  exitPosition: Vector2;
}

interface Room {
  x: number; y: number;
  width: number; height: number;
  connections: Room[];
}

enum CellType { WALL, FLOOR, DOOR }
```

### Floor configuration (generalized)
```typescript
interface FloorConfig {
  floorNumber: number;
  roomCount: [min: number, max: number];
  gridSize: number;
  enemyTypes: EnemyType[];
  enemiesPerRoom: [min: number, max: number];
}
```

## Player

- **WASD movement** + **mouse look** (pointer lock API)
- Grid-based AABB collision against wall cells
- Camera: y=2.5 (eye height), FOV 70
- Health: starts at 100
- Speed: ~5 units/sec

## Combat

### Sword (default weapon)
- Left click to swing
- Short range check (2-3 units) in front of player
- Damage enemies in a forward cone
- Attack cooldown: ~0.5s
- Visual: Doom-style weapon sprite at bottom of screen

### Feedback
- Enemy hit: flash red, knockback
- Player hit: screen edges flash red
- Enemy death: sprite fades out, score += enemy.points
- Player death: slow-mo, fade to red, "GAME OVER"

## Enemy System (Generalized)

### Registry pattern
```typescript
interface EnemyType {
  name: string;
  health: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  points: number;
  spriteGenerator: () => CanvasTexture;
}
```

### AI states
```
IDLE -> CHASE (player detected) -> ATTACK (in range) -> COOLDOWN -> CHASE
```

### MVP enemy: Skeleton
- Health: 30, Speed: 2, Damage: 10
- Melee range: 1.5 units
- Procedural canvas sprite (bone-white humanoid shape)

### Rendering
- Doom-style billboard sprites (THREE.Sprite, always face camera)
- Procedural canvas textures (no external assets)

## HUD

Canvas-based overlays (no HTML DOM):
- Health bar (top-left, red bar)
- Score counter (top-right)
- Floor number (top-center)
- Crosshair (center dot/cross)
- Weapon sprite (bottom-center, Doom-style sword)

## Transitions

- **Menu -> Game**: CSS/canvas fade to black (1s), dispose splash objects, generate dungeon, fade in (1s)
- **Floor -> Floor**: Touch stairs -> fade out -> generate new floor -> fade in
- **Death**: Slow-mo -> red overlay -> "GAME OVER" text -> score display -> click to return to menu

## Reused Systems

- Scene setup (camera, renderer, fog)
- Procedural textures (brick walls, stone floors)
- Torch system (placed in dungeon rooms)
- Post-processing pipeline (bloom + retro effects)
- Font loader (for HUD/game over text)
- Debug panel (extended for gameplay tuning)

## New Modules

```
src/
  game/
    gameState.ts          # State machine (menu/playing/dead)
    gameLoop.ts           # Gameplay animate loop
    transition.ts         # Fade in/out transitions
  dungeon/
    generator.ts          # BSP/random room placement
    dungeonFloor.ts       # Floor data + mesh construction
    floorConfig.ts        # Per-floor difficulty configs
  player/
    playerController.ts   # WASD + mouse look + pointer lock
    collision.ts          # Grid-based AABB collision
    combat.ts             # Sword attack logic
  enemies/
    enemyManager.ts       # Spawn, update, dispose enemies
    enemyTypes.ts         # Enemy type registry
    enemyAI.ts            # State machine AI
    sprites/
      skeleton.ts         # Procedural skeleton sprite
  hud/
    hud.ts                # Canvas overlay manager
    healthBar.ts          # Health bar renderer
    scoreDisplay.ts       # Score counter
    weaponSprite.ts       # Doom-style weapon at bottom
    crosshair.ts          # Center crosshair
```

## Performance Constraints

- Max 6 active PointLights (torches near player only)
- Enemy count per room capped (5-8 max visible)
- Billboard sprites are cheap (1 draw call each)
- Grid collision is O(1) per check (no spatial hashing needed)
- Dungeon mesh: merge static geometry per room where possible
