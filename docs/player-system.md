# Player System

First-person controller with WASD movement, mouse look, grid-based collision, and sword combat.

## Files

| File | Purpose |
|------|---------|
| `src/player/playerController.ts` | FPS movement, camera, input handling |
| `src/player/collision.ts` | Grid-based AABB collision with wall sliding |
| `src/player/combat.ts` | Sword attack with cone hit detection |

## Player Controller (`playerController.ts`)

`class PlayerController`

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `MOVE_SPEED` | 5 | Units per second |
| `MOUSE_SENSITIVITY` | 0.002 | Radians per pixel |
| `PITCH_LIMIT` | 80 deg | Max vertical look angle |
| `EYE_HEIGHT` | 2.5 | Camera Y position |
| `PLAYER_RADIUS` | 0.3 | Collision radius |

### Properties

- `health: number` — Starts at 100
- `score: number` — Accumulated points
- `isDead: boolean` — True when health <= 0

### Methods

| Method | Description |
|--------|-------------|
| `update(delta)` | Process input, move with collision, update camera |
| `setGrid(grid)` | Set dungeon grid reference (on floor change) |
| `setPosition(x, z)` | Teleport to grid position |
| `getPosition()` | Returns world position (cloned Vector3) |
| `getDirection()` | Returns normalized XZ forward direction |
| `takeDamage(amount)` | Reduce health (clamped to 0) |
| `addScore(points)` | Add to score |
| `requestPointerLock()` | Lock mouse cursor |
| `exitPointerLock()` | Release mouse cursor |
| `dispose()` | Remove all event listeners |

### Input

- **WASD** — Movement relative to facing direction
- **Mouse** — Yaw (horizontal) and pitch (vertical) via Pointer Lock API
- Diagonal movement is normalized to prevent faster diagonal speed

### Performance

- Forward/right/direction vectors are cached (never allocated in update loop)
- Key state stored as `Record<string, boolean>`, updated via keydown/keyup
- Event handlers are bound in constructor and cleaned up in `dispose()`

## Collision (`collision.ts`)

### `canMoveTo(grid, x, z, radius = 0.3): boolean`

Tests all 4 corners of the player's AABB against the grid. A cell is walkable if it's `FLOOR` or `DOOR`.

### `resolveMovement(grid, curX, curZ, targetX, targetZ, radius): { x, z }`

Wall sliding resolution:
1. Try full move (both X and Z)
2. If blocked, try X-only (slide along Z wall)
3. If blocked, try Z-only (slide along X wall)
4. If fully blocked, stay in place

## Combat (`combat.ts`)

`class SwordCombat`

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `ATTACK_COOLDOWN` | 0.5s | Time between attacks |
| `ATTACK_RANGE` | 2.5 | Max hit distance (units) |
| `ATTACK_CONE_COS` | cos(60 deg) | Forward cone half-angle |
| `DAMAGE_PER_HIT` | 15 | Damage per sword hit |

### Methods

| Method | Description |
|--------|-------------|
| `startAttack()` | Begin swing if off cooldown |
| `update(delta)` | Advance cooldown and animation |
| `isAttacking()` | True during active swing |
| `getAttackProgress()` | 0-1 swing progress |
| `checkHits(playerPos, playerDir, targets)` | Returns IDs of targets in range + cone |

### Hit Detection

A target is hit if:
1. Distance from player to target <= `ATTACK_RANGE` (2.5 units)
2. Dot product of normalized direction to target and player forward >= `cos(60 deg)`

The `_toTarget` vector is cached module-level to avoid per-frame allocations.

## Adding Content

**New weapons**: Create a new class similar to `SwordCombat` with different range/cone/damage/cooldown values. The `CombatTarget` interface is weapon-agnostic.

**Sprinting/crouching**: Modify `MOVE_SPEED` in `update()` based on additional key state.
