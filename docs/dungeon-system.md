# Dungeon System

Procedural dungeon generation and rendering. Produces a grid-based dungeon floor with rooms, corridors, spawn points, and an exit.

## Files

| File | Purpose |
|------|---------|
| `src/dungeon/types.ts` | Core types shared across all dungeon code |
| `src/dungeon/generator.ts` | Procedural floor generation algorithm |
| `src/dungeon/dungeonFloor.ts` | Converts grid data into Three.js meshes |
| `src/dungeon/floorConfig.ts` | Difficulty scaling per floor number |

## Types (`types.ts`)

```
CellType.WALL = 0    # Impassable
CellType.FLOOR = 1   # Walkable
CellType.DOOR = 2    # Walkable (reserved for future door mechanics)
```

**Room** — Rectangular region: `{ x, y, width, height, connections: Room[] }`

**DungeonFloor** — Complete floor data:
- `grid: CellType[][]` — 2D grid (rows x cols) of cell types
- `rooms: Room[]` — All placed rooms
- `spawnPoints: { x, z }[]` — Enemy spawn locations (2-4 per non-start room)
- `playerStart: { x, z }` — Center of first room
- `exitPosition: { x, z }` — Center of farthest room from player start

**FloorConfig** — Generation parameters:
- `floorNumber` — Current floor (drives difficulty)
- `roomCount: [min, max]` — Target room count range
- `gridSize` — Grid dimensions (default 50x50)
- `enemiesPerRoom: [min, max]` — Enemies spawned per room

## Generation Algorithm (`generator.ts`)

`generateFloor(config: FloorConfig): DungeonFloor`

1. **Initialize** a `gridSize x gridSize` grid filled with `WALL`
2. **Place rooms** — Random position/size (6-12 cells per dimension), reject overlaps with 2-cell padding. Up to 200 attempts to reach target room count.
3. **Carve corridors** — L-shaped connections between sequential rooms (horizontal first, then vertical)
4. **Set player start** — Center of first room
5. **Set exit** — Center of room with greatest squared distance from player start
6. **Generate spawn points** — 2-4 random floor cells per room (skipping room 0)

## Mesh Building (`dungeonFloor.ts`)

`buildFloorMesh(floor: DungeonFloor): THREE.Group`

For every `FLOOR`/`DOOR` cell in the grid:
- Floor plane at y=0 (stone texture)
- Ceiling plane at y=5 (dark stone texture)
- Wall planes on edges adjacent to `WALL` cells or grid boundary (brick texture)

All meshes share 3 materials and 2 geometries to minimize draw calls.

Exit marker: semi-transparent green plane at `exitPosition`, slightly above ground.

`disposeFloorMesh(group)` — Collects and disposes all unique geometries, materials, and textures, then clears the group.

## Difficulty Scaling (`floorConfig.ts`)

`getFloorConfig(floorNumber): FloorConfig`

| Floor | Rooms | Enemies/Room | Grid |
|-------|-------|--------------|------|
| 1 | 5-7 | 2-4 | 50 |
| 3 | 6-8 | 3-5 | 50 |
| 6 | 8-10 | 4-6 | 50 |
| 10+ | 10-12 | 5-7 (max 8) | 50 |

Room count caps at 10-12, enemies cap at 5-8.

## Adding Content

**New cell types**: Add to `CellType` enum, handle in `dungeonFloor.ts` mesh building and `collision.ts` walkability check.

**Larger dungeons**: Increase `gridSize` in `floorConfig.ts`. All other systems are grid-size agnostic.

**New room shapes**: Modify `carveRoom()` in `generator.ts`. Currently rectangular only.
