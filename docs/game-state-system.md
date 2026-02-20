# Game State System

Controls the application lifecycle: menu, gameplay, transitions, and game over.

## Files

| File | Purpose |
|------|---------|
| `src/game/gameState.ts` | State enum and observer-based state machine |
| `src/game/gameLoop.ts` | Main gameplay loop orchestrating all systems |
| `src/game/transition.ts` | Fade-to/from-black screen transitions |
| `src/main.ts` | Top-level state management, menu, animate loop |

## State Machine (`gameState.ts`)

```
MENU ──(click Start)──> FADE_TO_GAME ──> PLAYING ──(player dies)──> GAME_OVER ──(click)──> FADE_TO_MENU ──> MENU
```

### States

| State | Description |
|-------|-------------|
| `MENU` | Splash screen corridor with title + menu items. Raycaster hover detection. |
| `FADE_TO_GAME` | 1s fade to black, dispose menu, create game loop, fade from black. |
| `PLAYING` | Active gameplay. Player, enemies, combat, HUD all updating. |
| `GAME_OVER` | Score overlay displayed. Player is dead. Click to continue. |
| `FADE_TO_MENU` | 1s fade to black, dispose game loop, recreate menu, fade from black. |

### `GameStateMachine` Class

Simple observer pattern:
- `current: GameStateType` — Current state
- `transition(to)` — Set state and notify listeners
- `onTransition(fn)` — Register state change listener

Note: `main.ts` currently uses a plain `state` variable directly rather than the class instance, but the class is available for more complex state management if needed.

## Transitions (`transition.ts`)

### `createFadeOverlay(): HTMLDivElement`

Creates a fixed-position black div covering the viewport (z-index 20). Starts transparent.

### `fadeToBlack(overlay, duration = 1000): Promise<void>`

CSS opacity transition from 0 to 1. Blocks pointer events during fade. Resolves after `duration` ms.

### `fadeFromBlack(overlay, duration = 1000): Promise<void>`

CSS opacity transition from 1 to 0. Re-enables pointer events after fade completes.

## Game Loop (`gameLoop.ts`)

`createGameLoop(scene, camera, fadeOverlay): Promise<GameLoopContext>`

### Setup

1. Creates `PlayerController`, `SwordCombat`, `EnemyManager`, `HUD`
2. Registers mouse click handler for attacks (left-click when pointer locked)
3. Loads first floor
4. Requests pointer lock
5. Shows HUD

### Update Sequence (per frame)

```
1. player.update(delta)           # WASD + mouse, collision
2. enemies.update(delta, ...)     # AI, movement, damage to player
3. combat.update(delta)           # Cooldown + animation
4. combat.checkHits(...)          # Hit detection (only on attack start)
5. enemies.applyDamage(...)       # Apply sword hits
6. enemies.getKilledPoints()      # Collect score
7. Check exit proximity           # Trigger floor transition
8. Fade damage flash              # Visual effect decay
9. hud.update(hudState, delta)    # Redraw all HUD elements
```

### Floor Transitions

When player is within 1.5 units of `exitPosition`:
1. Exit pointer lock
2. Fade to black (800ms)
3. Increment floor number
4. Load new floor (dispose old, generate new, place player, spawn enemies)
5. Fade from black (800ms)
6. Re-enter pointer lock

### Floor Loading

`loadFloor(floorNum)`:
1. Remove previous floor group from scene + dispose
2. Dispose all enemies
3. Generate new floor from `getFloorConfig(floorNum)`
4. Build floor mesh and add to scene
5. Set player grid and position
6. Spawn enemies in each room (random type, random count per config)

### GameLoopContext

Returned interface for `main.ts` to interact with:

```typescript
interface GameLoopContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  dispose: () => void;        // Clean up everything
  update: (delta, time) => void;  // Per-frame update
  isGameOver: () => boolean;  // Check player death
  getScore: () => number;     // Final score
  getFloor: () => number;     // Current floor
}
```

## Main Entry Point (`main.ts`)

### Menu State

- Corridor with torches auto-scrolling
- Title text (arched 3D "DungeonSlopper")
- Menu items (Start, Settings, Credits) with raycaster hover
- Click "Start" triggers `startGame()`

### Game Over

- Canvas overlay with "GAME OVER", score, floor number
- "Click to return to menu" prompt
- 500ms delay before click listener activates (prevents immediate trigger)

### Animate Loop

Runs at requestAnimationFrame rate:
- Delta clamped to 50ms max (prevents physics explosion on tab-away)
- Routes to menu update or game update based on `state`
- Always renders via EffectComposer (post-processing chain)

## Adding Game States

1. Add new value to `GameStateType` enum
2. Handle transition logic in `main.ts` (what to create/dispose)
3. Add update branch in the animate loop if the new state has per-frame behavior
