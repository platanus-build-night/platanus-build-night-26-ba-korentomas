import * as THREE from 'three';
import type { DungeonFloor } from '../dungeon/types';
import { CellType } from '../dungeon/types';
import {
  createBarrelModel,
  createCrateModel,
  createBonesModel,
  createPillarModel,
  createChestModel,
  createUrnModel,
  createCandelabraModel,
} from './decorationModels';

export type LootType = 'health' | 'score';

export interface DecorationDef {
  name: string;
  create: () => THREE.Group;
  frequency: number; // 0-1 chance per eligible cell
  wallOnly: boolean; // true = only place adjacent to walls
  breakable: boolean;
  health: number; // hits to break (0 = not breakable)
  lootType?: LootType; // what drops when broken (if any)
}

export interface PlacedDecoration {
  model: THREE.Group;
  def: DecorationDef;
  worldX: number;
  worldZ: number;
}

const DECORATIONS: DecorationDef[] = [
  { name: 'barrel', create: createBarrelModel, frequency: 0.12, wallOnly: true, breakable: true, health: 2 },
  { name: 'crate', create: createCrateModel, frequency: 0.10, wallOnly: true, breakable: true, health: 2 },
  { name: 'bones', create: createBonesModel, frequency: 0.08, wallOnly: false, breakable: false, health: 0 },
  { name: 'pillar', create: createPillarModel, frequency: 0.04, wallOnly: false, breakable: false, health: 0 },
  { name: 'chest', create: createChestModel, frequency: 0.05, wallOnly: true, breakable: true, health: 3, lootType: 'score' },
  { name: 'urn', create: createUrnModel, frequency: 0.08, wallOnly: false, breakable: true, health: 1 },
  { name: 'candelabra', create: createCandelabraModel, frequency: 0.05, wallOnly: true, breakable: false, health: 0 },
];

/** Module-level store of placed decorations with full metadata (for breakable system) */
let lastPlacedDecorations: PlacedDecoration[] = [];

/** Get all placed decorations from the most recent spawnDecorations call */
export function getPlacedDecorations(): PlacedDecoration[] {
  return lastPlacedDecorations;
}

/**
 * Spawn decorations into a dungeon floor.
 * Returns THREE.Group[] for backward compatibility with gameLoop.
 * Use getPlacedDecorations() for richer metadata (breakable info, world positions).
 */
export function spawnDecorations(floor: DungeonFloor, group: THREE.Group): THREE.Group[] {
  const placed: PlacedDecoration[] = [];
  const { grid, rooms, playerStart, exitPosition, spawnPoints } = floor;

  // Build a Set of forbidden cells (player start, exit, spawn points)
  const forbidden = new Set<string>();
  forbidden.add(`${playerStart.x},${playerStart.z}`);
  forbidden.add(`${exitPosition.x},${exitPosition.z}`);
  for (const sp of spawnPoints) {
    // Forbid a 2-cell radius around spawn points
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        forbidden.add(`${sp.x + dx},${sp.z + dz}`);
      }
    }
  }

  for (const room of rooms) {
    for (let row = room.y + 1; row < room.y + room.height - 1; row++) {
      for (let col = room.x + 1; col < room.x + room.width - 1; col++) {
        if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) continue;
        if (grid[row][col] !== CellType.FLOOR) continue;
        if (forbidden.has(`${col},${row}`)) continue;

        // Check if wall-adjacent
        const isWallAdj = isAdjacentToWall(grid, col, row);

        for (const def of DECORATIONS) {
          if (def.wallOnly && !isWallAdj) continue;
          if (Math.random() < def.frequency) {
            const model = def.create();
            model.position.set(col, 0, row);
            // Small random rotation for variety
            model.rotation.y = Math.random() * Math.PI * 2;
            group.add(model);
            placed.push({
              model,
              def,
              worldX: col,
              worldZ: row,
            });
            break; // Only one decoration per cell
          }
        }
      }
    }
  }

  // Store full metadata for breakable system access
  lastPlacedDecorations = placed;

  // Return just the Group array for backward compatibility
  return placed.map((p) => p.model);
}

function isAdjacentToWall(grid: CellType[][], x: number, z: number): boolean {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dx, dz] of dirs) {
    const nx = x + dx;
    const nz = z + dz;
    if (nz < 0 || nz >= grid.length || nx < 0 || nx >= grid[0].length) return true;
    if (grid[nz][nx] === CellType.WALL) return true;
  }
  return false;
}

export function disposeDecorations(decorations: THREE.Group[]): void {
  for (const model of decorations) {
    if (model.parent) model.parent.remove(model);
  }
  decorations.length = 0;
  lastPlacedDecorations = [];
}
