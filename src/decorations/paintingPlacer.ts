import * as THREE from 'three';
import type { DungeonFloor } from '../dungeon/types';
import { CellType } from '../dungeon/types';
import { createPaintingModel, FRAME_SIZES } from './paintingModel';

export interface PlacedPainting {
  model: THREE.Group;
  position: THREE.Vector3;
}

export async function spawnPaintings(
  floor: DungeonFloor,
  paintingDataUrls: string[],
  group: THREE.Group,
): Promise<PlacedPainting[]> {
  if (paintingDataUrls.length === 0) return [];

  const placed: PlacedPainting[] = [];
  const { grid, rooms, playerStart, exitPosition, spawnPoints } = floor;

  // Build forbidden cells set (same pattern as decorationPlacer.ts)
  const forbidden = new Set<string>();
  forbidden.add(`${playerStart.x},${playerStart.z}`);
  forbidden.add(`${exitPosition.x},${exitPosition.z}`);
  for (const sp of spawnPoints) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        forbidden.add(`${sp.x + dx},${sp.z + dz}`);
      }
    }
  }

  // Find eligible wall faces
  interface WallFace {
    col: number;
    row: number;
    direction: 'north' | 'south' | 'east' | 'west';
  }

  const wallFaces: WallFace[] = [];

  for (const room of rooms) {
    for (let row = room.y + 1; row < room.y + room.height - 1; row++) {
      for (let col = room.x + 1; col < room.x + room.width - 1; col++) {
        if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) continue;
        if (grid[row][col] !== CellType.FLOOR) continue;
        if (forbidden.has(`${col},${row}`)) continue;

        // Check each direction for adjacent wall
        if (row > 0 && grid[row - 1][col] === CellType.WALL) {
          wallFaces.push({ col, row, direction: 'north' });
        }
        if (row < grid.length - 1 && grid[row + 1][col] === CellType.WALL) {
          wallFaces.push({ col, row, direction: 'south' });
        }
        if (col < grid[0].length - 1 && grid[row][col + 1] === CellType.WALL) {
          wallFaces.push({ col, row, direction: 'east' });
        }
        if (col > 0 && grid[row][col - 1] === CellType.WALL) {
          wallFaces.push({ col, row, direction: 'west' });
        }
      }
    }
  }

  // Shuffle wall faces
  for (let i = wallFaces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wallFaces[i], wallFaces[j]] = [wallFaces[j], wallFaces[i]];
  }

  // Place paintings with minimum 3-cell spacing
  const usedPositions: { col: number; row: number }[] = [];
  // Max paintings: ~1 per 2 rooms, capped by available data urls
  const maxPaintings = Math.min(paintingDataUrls.length, Math.ceil(rooms.length / 2));
  let paintingIndex = 0;

  for (const face of wallFaces) {
    if (paintingIndex >= maxPaintings) break;

    // Check minimum spacing
    const tooClose = usedPositions.some(
      pos => Math.abs(pos.col - face.col) + Math.abs(pos.row - face.row) < 3
    );
    if (tooClose) continue;

    const frameSize = FRAME_SIZES[Math.floor(Math.random() * FRAME_SIZES.length)];
    const model = await createPaintingModel(paintingDataUrls[paintingIndex], frameSize);

    // Position and rotate based on wall direction
    const WALL_OFFSET = 0.48;
    const PAINTING_Y = 2.0; // eye level

    switch (face.direction) {
      case 'north':
        model.position.set(face.col, PAINTING_Y, face.row - WALL_OFFSET);
        // Face +Z (away from north wall)
        // No rotation needed — PlaneGeometry faces +Z by default
        break;
      case 'south':
        model.position.set(face.col, PAINTING_Y, face.row + WALL_OFFSET);
        model.rotation.y = Math.PI; // Face -Z
        break;
      case 'east':
        model.position.set(face.col + WALL_OFFSET, PAINTING_Y, face.row);
        model.rotation.y = -Math.PI / 2; // Face -X
        break;
      case 'west':
        model.position.set(face.col - WALL_OFFSET, PAINTING_Y, face.row);
        model.rotation.y = Math.PI / 2; // Face +X
        break;
    }

    group.add(model);
    placed.push({ model, position: model.position.clone() });
    usedPositions.push({ col: face.col, row: face.row });
    paintingIndex++;
  }

  return placed;
}

export function disposePaintings(paintings: PlacedPainting[]): void {
  for (const painting of paintings) {
    if (painting.model.parent) {
      painting.model.parent.remove(painting.model);
    }
    // Dispose per-painting textures and materials (not shared frame material)
    painting.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.MeshBasicMaterial && child.material.map) {
          child.material.map.dispose();
          child.material.dispose();
        }
        // Don't dispose shared frame material
      }
    });
  }
  paintings.length = 0;
}
