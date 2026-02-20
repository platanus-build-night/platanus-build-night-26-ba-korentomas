# Cheat Console Design

## Overview

Sims-style cheat console activated by pressing `T`. Extensible registry pattern — register cheats declaratively, gameplay systems check flags.

## Architecture

```
src/
  cheats/
    cheatRegistry.ts    # Registry: register/lookup/execute cheats
    cheatState.ts       # Global cheat flags
    cheatConsole.ts     # HTML overlay UI (input + toast)
    defaultCheats.ts    # Built-in cheat definitions
```

## CheatRegistry

- `register(cheat)` — add a cheat by name with description and execute callback
- `execute(input)` — parse input string, find cheat, run callback
- `search(partial)` — autocomplete support
- `list()` — return all registered cheats
- Cheats can be toggles (no args) or accept arguments

## CheatState

Simple reactive flags object. Gameplay systems read from this:

```typescript
export const cheats = {
  god: false,
  onehit: false,
  speedMultiplier: 1,
  noclip: false,
};
```

## Console UI

- HTML overlay: dark translucent input bar at top
- Press `T` to open, `Escape`/`T` to close
- `Enter` executes, toast shows result
- Tab autocomplete from registered names
- Arrow up/down for command history
- Styled to match dungeon aesthetic (monospace, dark, subtle glow)

## Default Cheats (splash screen compatible)

- `god` — toggle invincibility flag
- `onehit` — toggle one-hit kill flag
- `speed <n>` — corridor scroll speed multiplier
- `disco` — randomize torch colors
- `fog <n>` — change fog density
- `retro` — toggle retro shader
- `bloom <n>` — bloom intensity
- `matrix` — green color grading
- `sway <n>` — camera sway multiplier
- `fov <n>` — camera field of view
- `help` — list all available cheats
- `reset` — reset all cheats to defaults

## Integration Points

- `main.ts` — keydown listener for `T`, init console
- `defaultCheats.ts` — receives scene/camera/composer refs to modify live values
- Future gameplay modules check `cheats.*` flags directly
