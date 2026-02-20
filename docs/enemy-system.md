# Enemy System

Billboard sprite enemies with AI state machine, damage/death effects, and an extensible type registry.

## Files

| File | Purpose |
|------|---------|
| `src/enemies/enemyTypes.ts` | Enemy type registry (stats + sprite generator) |
| `src/enemies/enemyAI.ts` | State machine AI logic |
| `src/enemies/enemyManager.ts` | Spawning, lifecycle, rendering |
| `src/enemies/sprites/skeleton.ts` | Procedural 64x64 skeleton canvas sprite |

## Enemy Types (`enemyTypes.ts`)

```typescript
interface EnemyType {
  name: string;
  health: number;
  speed: number;          // Units per second
  damage: number;         // Damage per attack
  attackRange: number;    // Distance to trigger attack
  attackCooldown: number; // Seconds between attacks
  points: number;         // Score on kill
  spriteGenerator: () => THREE.CanvasTexture;
}
```

### Current Types

| Type | HP | Speed | Damage | Range | Cooldown | Points |
|------|----|-------|--------|-------|----------|--------|
| SKELETON | 30 | 2 | 10 | 1.5 | 1.0s | 100 |

## AI State Machine (`enemyAI.ts`)

```
IDLE ──(player within 10 units)──> CHASE
CHASE ──(within attack range)──> ATTACK
ATTACK ──(instant)──> COOLDOWN
COOLDOWN ──(timer expired)──> CHASE
Any state ──(health <= 0)──> DEAD
```

### States

| State | Behavior |
|-------|----------|
| `IDLE` | Stationary. Transitions to CHASE when player enters detection range (10 units). |
| `CHASE` | Moves toward player at `speed` units/sec. Uses grid collision with wall sliding. |
| `ATTACK` | Deals `damage` to player. Instantly transitions to COOLDOWN. |
| `COOLDOWN` | Waits `attackCooldown` seconds, then returns to CHASE. |
| `DEAD` | No behavior. EnemyManager handles fade-out and removal. |

### Movement

- Direction: normalized vector from enemy to player (Y zeroed)
- Collision: AABB check against grid (radius 0.3), with axis-separated wall sliding (same approach as player)
- Reusable `_direction` vector avoids per-frame allocation

### `updateAI()` Function

Pure function: takes current state + context, returns `EnemyAction`:
- `newState` — Next AI state
- `moveDirection` — Movement vector (or null)
- `dealDamage` — Whether to hurt the player this frame

## Enemy Manager (`enemyManager.ts`)

`class EnemyManager`

### Spawning

`spawnEnemiesInRoom(roomCenter, count, enemyType)` — Places enemies in a circle around the room center (radius 2-4 units). Each gets its own `SpriteMaterial` (cloned per enemy for individual tinting).

### Update Loop

`update(delta, playerPos, grid): { damageToPlayer }` — Per frame:
1. **Dead enemies**: Fade opacity over 0.5s, then remove
2. **Hit flash**: Red tint for 0.15s after taking damage, then reset to white
3. **AI update**: Calls `updateAI()`, applies state/movement/damage
4. **Cooldown tick**: Decrements cooldown timer
5. Returns total `damageToPlayer` for the frame

### Combat Interface

| Method | Description |
|--------|-------------|
| `getTargets()` | Returns `{ position, id }[]` of all living enemies for sword hit detection |
| `applyDamage(id, damage)` | Reduces enemy health, triggers red flash, triggers death if HP <= 0 |
| `getKilledPoints()` | Returns accumulated kill points and resets counter |

### Visual Effects

- **Hit flash**: `SpriteMaterial.color` set to red (#ff2222) for 0.15s
- **Death fade**: Opacity fades from 1 to 0 over 0.5s, then enemy is removed from scene
- **Billboard**: Three.js `Sprite` always faces camera automatically

### Disposal

`dispose()` — Removes all enemies, disposes their materials and textures.

`removeEnemy(index)` — Removes from scene, disposes material + texture, splices from array.

## Skeleton Sprite (`sprites/skeleton.ts`)

`createSkeletonSprite(): THREE.CanvasTexture`

Draws a 64x64 pixel art skeleton on a canvas:
- Skull (oval + hollow eyes + nose)
- Ribcage (spine + curved ribs)
- Pelvis (trapezoid)
- Arms (upper + forearm segments)
- Legs (upper + lower segments)

Returns a `CanvasTexture` with `NearestFilter` for crisp pixel art look.

## Adding New Enemy Types

1. Create a sprite generator in `src/enemies/sprites/` (returns `CanvasTexture`)
2. Add entry to `ENEMY_TYPES` in `enemyTypes.ts`:
   ```typescript
   GOBLIN: {
     name: 'Goblin',
     health: 20,
     speed: 3.5,
     damage: 5,
     attackRange: 1.2,
     attackCooldown: 0.6,
     points: 50,
     spriteGenerator: createGoblinSprite,
   },
   ```
3. The dungeon generator and enemy manager will automatically use it — enemies are selected randomly from `Object.values(ENEMY_TYPES)` in `gameLoop.ts`.

## Adding New AI Behaviors

Modify the `updateAI()` switch statement in `enemyAI.ts`. Add new states to `EnemyAIState` enum. The function is pure (no side effects), so new behaviors are easy to test in isolation.
