# HUD System

Canvas2D overlay rendering all in-game UI elements: health bar, score, floor number, crosshair, weapon sprite, and damage flash.

## Files

| File | Purpose |
|------|---------|
| `src/hud/hud.ts` | HUD manager, canvas setup, draw coordination |
| `src/hud/healthBar.ts` | Red/dark health bar with low-health pulsing |
| `src/hud/scoreDisplay.ts` | Gold score counter, top-right |
| `src/hud/floorDisplay.ts` | Gold floor number, top-center |
| `src/hud/crosshair.ts` | White crosshair with center gap |
| `src/hud/weaponSprite.ts` | Procedural sword with swing animation |
| `src/hud/damageOverlay.ts` | Red radial vignette on hit |

## HUD Manager (`hud.ts`)

`class HUD`

### HUDState Interface

```typescript
interface HUDState {
  health: number;
  maxHealth: number;
  score: number;
  floor: number;
  isAttacking: boolean;
  attackProgress: number;
  damageFlash: number;    // 0-1, fades over time
}
```

### Lifecycle

| Method | Description |
|--------|-------------|
| `constructor()` | Creates fullscreen canvas, appends to DOM |
| `update(state, delta)` | Clears and redraws all HUD elements |
| `show() / hide()` | Toggle canvas visibility |
| `resize()` | Update canvas dimensions for DPR |
| `dispose()` | Remove canvas from DOM |

### Rendering

- Canvas covers full viewport (`100vw x 100vh`), `pointer-events: none`
- DPR-aware: scales canvas buffer by `min(devicePixelRatio, 2)`
- Element sizes scale relative to viewport height (`h / 1080`)
- All elements drawn every frame (no dirty tracking — simpler, fast enough)

## Elements

### Health Bar (`healthBar.ts`)

`drawHealthBar(ctx, x, y, width, height, health, maxHealth)`

- Position: top-left (20px margin)
- Background: dark red (#330000)
- Fill: bright red (#cc2222), width proportional to health %
- Border: 1px gray
- Label: "HP" in white monospace, left-aligned inside bar
- Low health (<30%): fill pulses via `sin(time)` opacity modulation

### Score Display (`scoreDisplay.ts`)

`drawScore(ctx, x, y, score)`

- Position: top-right (20px margin)
- Format: `SCORE: 001234` (zero-padded to 6 digits)
- Color: gold (#daa520)
- Font: bold 24px monospace (scaled)
- Text aligned right

### Floor Display (`floorDisplay.ts`)

`drawFloorNumber(ctx, x, y, floor)`

- Position: top-center
- Format: `FLOOR 1`
- Color: gold (#daa520)
- Font: bold 18px monospace (scaled)
- Text aligned center

### Crosshair (`crosshair.ts`)

`drawCrosshair(ctx, cx, cy)`

- Position: screen center
- White lines with 4px gap at center
- Arm length: 12px, line width: 2px
- Subtle shadow for visibility on bright backgrounds

### Weapon Sprite (`weaponSprite.ts`)

`class WeaponSprite`

Procedural sword drawn at bottom-center of screen:
- Blade: gradient from steel gray to white highlight
- Guard: gold cross-piece
- Grip: dark brown with wrap marks
- Pommel: gold circle

Attack animation (0.6s):
- Rotation: swings -30 to +45 degrees and back
- Translation: slight upward arc during swing
- Triggered by `startAttack()`, driven by `update(delta)`

### Damage Overlay (`damageOverlay.ts`)

`drawDamageOverlay(ctx, w, h, intensity)`

- Fullscreen red radial gradient vignette
- Intensity 0-1 controls opacity
- Fades out at `3x` speed per second (controlled in `gameLoop.ts`)
- Clear center, red edges — simulates blood screen effect

## Layout

```
+--[HP BAR]--------[FLOOR 1]--------[SCORE: 000100]--+
|                                                      |
|                                                      |
|                     [+]                              |
|                  crosshair                           |
|                                                      |
|                                                      |
|                   [SWORD]                            |
+------------------------------------------------------+
```

## Adding HUD Elements

1. Create a draw function in `src/hud/` that takes `ctx` and position/state params
2. Import and call it in `hud.ts` `update()` method
3. Add any new state fields to `HUDState` interface
4. Pass the new state from `gameLoop.ts`
