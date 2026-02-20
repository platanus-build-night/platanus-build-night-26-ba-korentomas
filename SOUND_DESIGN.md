# DungeonSlopper Sound Design

All audio assets needed for the game, organized by category.

---

## Music Tracks

### Ambient / Exploration

| # | Track | Description | Loop | Mood |
|---|-------|-------------|------|------|
| 1 | **Dungeon Ambient (Floors 1-3)** | Low drone, distant drips, faint wind through stone. Minimal melody. | Yes | Uneasy, exploratory |
| 2 | **Dungeon Deep (Floors 4-6)** | Darker drone, deeper reverb, subtle dissonant strings. Tension builds. | Yes | Dread, claustrophobia |
| 3 | **Dungeon Abyss (Floors 7+)** | Oppressive bass, metallic scrapes, whispered textures. Almost industrial. | Yes | Hostile, relentless |
| 4 | **Menu Theme** | Slow, foreboding organ/choir over the existing torch-lit corridor. Gothic. | Yes | Atmospheric, inviting-but-dark |

### Combat

| # | Track | Description | Loop | Mood |
|---|-------|-------------|------|------|
| 5 | **Combat Tension** | Kicks in when enemies detect the player. Percussive, driving, medieval. | Yes | Urgent, aggressive |
| 6 | **Boss Fight** | Full orchestral/metal hybrid. Heavy drums, distorted lute, choir stabs. Escalating phases. | Yes | Epic, overwhelming |

### Stingers (one-shots, not looped)

| # | Track | Description | Duration |
|---|-------|-------------|----------|
| 7 | **Floor Clear** | Triumphant brass/choir swell when all enemies on a floor are dead | ~3s |
| 8 | **Game Over** | Low, mournful bell toll + reverb decay | ~4s |
| 9 | **New Floor Descent** | Descending chromatic passage as player takes stairs down | ~2s |

---

## Player Sounds

### Movement

| # | Sound | Description | Trigger |
|---|-------|-------------|---------|
| 10 | **Footstep Stone (x4 variations)** | Heavy boot on stone slab. Slight echo. 4 variations to avoid repetition. | Each step while walking |
| 11 | **Footstep Run (x4 variations)** | Faster, harder impacts. More urgency. | Each step while running (if sprint added) |
| 12 | **Breathing Idle** | Slow, calm breathing loop. Faint. | When standing still |
| 13 | **Breathing Active** | Heavier breathing after sustained movement | After moving for 5+ seconds |
| 14 | **Breathing Low HP** | Labored, ragged gasping | Below 30% health |

### Combat

| # | Sound | Description | Trigger |
|---|-------|-------------|---------|
| 15 | **Sword Swing** | Metallic whoosh through air | Left-click attack |
| 16 | **Sword Hit Flesh** | Wet impact + bone crack | Sword connects with enemy |
| 17 | **Sword Hit Miss** | Extended whoosh, no impact | Swing hits nothing |
| 18 | **Player Hurt (x3 variations)** | Grunt/gasp of pain. Short. | Taking damage from enemy |
| 19 | **Player Death** | Final groan, body collapse thud | Health reaches 0 |
| 20 | **Heartbeat Low HP** | Slow, thumping heartbeat loop | Below 30% health (layered with breathing) |

---

## Enemy Sounds — Skeleton

### Movement

| # | Sound | Description | Trigger |
|---|-------|-------------|---------|
| 21 | **Bone Footstep (x3 variations)** | Dry clicking/clacking of bones on stone | Each step while chasing |
| 22 | **Bone Rattle Idle** | Subtle creaking/rattling when stationary | Idle state ambient |

### Combat

| # | Sound | Description | Trigger |
|---|-------|-------------|---------|
| 23 | **Skeleton Attack** | Sharp bone strike/slash sound | Attack animation |
| 24 | **Skeleton Aggro** | Hollow screech/rattle — alerting to player | Transitioning from IDLE to CHASE |
| 25 | **Skeleton Hit React (x2 variations)** | Bones cracking/shifting from impact | Taking damage |
| 26 | **Skeleton Death** | Bones scattering/collapsing on stone | Health reaches 0 |

### Spatial

| # | Sound | Description | Trigger |
|---|-------|-------------|---------|
| 27 | **Skeleton Ambient Nearby** | Faint bone creaks heard through walls/around corners | Enemy within 10 units but not visible |

---

## Future Enemy Sounds (template per enemy type)

_When new enemies are added, each needs:_

- Footsteps (x3+ variations)
- Idle ambient
- Aggro alert
- Attack
- Hit reaction (x2+ variations)
- Death
- Nearby ambient (spatial audio cue)

---

## Environment Sounds

### Dungeon Ambience

| # | Sound | Description | Trigger |
|---|-------|-------------|---------|
| 28 | **Water Drip (x3 variations)** | Single drip with echo, randomized timing | Random ambient, positional |
| 29 | **Wind Draft** | Low moaning wind through corridors | Looped, varies by area |
| 30 | **Stone Creak** | Subtle settling/shifting of stone architecture | Random ambient, rare |
| 31 | **Distant Rumble** | Deep underground tremor | Random ambient, very rare |
| 32 | **Chains Rattle** | Metal chains clinking in the distance | Random ambient |

### Torches

| # | Sound | Description | Trigger |
|---|-------|-------------|---------|
| 33 | **Torch Crackle Loop** | Fire crackling, constant. Positional audio. | Near any active torch |
| 34 | **Torch Flare** | Brief intensification of flame | When torch flicker peaks |

---

## UI / Interaction Sounds

### Menu

| # | Sound | Description | Trigger |
|---|-------|-------------|---------|
| 35 | **Menu Hover** | Subtle stone scrape or low chime | Hovering over menu item |
| 36 | **Menu Select** | Heavier stone impact or deep bell tone | Clicking menu item |
| 37 | **Menu Back** | Reverse/softer version of select | Going back in menus |

### Game Events

| # | Sound | Description | Trigger |
|---|-------|-------------|---------|
| 38 | **Blueprint Found** | Zelda-style item fanfare — ascending arpeggio, bright, triumphant. Short and iconic. | Picking up a blueprint |
| 39 | **Item Pickup Generic** | Quick sparkle/chime | Picking up any minor item |
| 40 | **Stairs Found** | Ominous descending tone + stone grinding | Reaching the floor exit |
| 41 | **Door Open** | Heavy stone/wood door grinding open | Opening a door (if added) |
| 42 | **Score Tick** | Tiny click/ping for score incrementing | Score number changing |

### HUD Feedback

| # | Sound | Description | Trigger |
|---|-------|-------------|---------|
| 43 | **Health Warning Pulse** | Dull alarm/pulse synced with HP bar pulsing | HP below 30%, looped |
| 44 | **Floor Transition Whoosh** | Rushing wind during black screen between floors | Fade out/in during floor change |

---

## Summary

| Category | Count |
|----------|-------|
| Music tracks | 6 |
| Music stingers | 3 |
| Player sounds | 11 (+ variations = ~20 files) |
| Skeleton sounds | 7 (+ variations = ~12 files) |
| Environment sounds | 7 (+ variations = ~12 files) |
| UI / interaction sounds | 10 |
| **Total unique sounds** | **~44 entries, ~63 files with variations** |

---

## Open Questions

- [ ] Will there be more enemy types beyond Skeleton? Each needs a full sound set.
- [ ] Is there a sprint mechanic? Determines if running footsteps are needed now.
- [ ] Boss enemy — is it a larger skeleton or a distinct creature? Changes the boss fight sounds.
- [ ] Blueprints — what do they do in-game? Affects how "important" the pickup sound feels.
- [ ] Should music crossfade between exploration and combat, or hard-cut?
- [ ] Reverb/echo — baked into assets or applied dynamically based on room size?
