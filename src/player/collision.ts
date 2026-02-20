import { CellType } from '../dungeon/types';

const PLAYER_RADIUS = 0.3;

/** Check if a single grid cell is walkable (FLOOR or DOOR). */
function isWalkable(grid: CellType[][], gx: number, gz: number): boolean {
  if (gz < 0 || gz >= grid.length) return false;
  if (gx < 0 || gx >= grid[gz].length) return false;
  const cell = grid[gz][gx];
  return cell === CellType.FLOOR || cell === CellType.DOOR;
}

/**
 * Check if a player-sized circle at (x, z) can stand in the grid.
 * Tests all 4 corners of the axis-aligned bounding box.
 */
export function canMoveTo(
  grid: CellType[][],
  x: number,
  z: number,
  radius: number = PLAYER_RADIUS,
): boolean {
  const minX = Math.floor(x - radius);
  const maxX = Math.floor(x + radius);
  const minZ = Math.floor(z - radius);
  const maxZ = Math.floor(z + radius);

  return (
    isWalkable(grid, minX, minZ) &&
    isWalkable(grid, maxX, minZ) &&
    isWalkable(grid, minX, maxZ) &&
    isWalkable(grid, maxX, maxZ)
  );
}

/**
 * Resolve movement with wall sliding.
 * Tries full move first; if blocked, tries X-only then Z-only.
 * Returns the final valid position.
 */
export function resolveMovement(
  grid: CellType[][],
  currentX: number,
  currentZ: number,
  targetX: number,
  targetZ: number,
  radius: number = PLAYER_RADIUS,
): { x: number; z: number } {
  // Try full movement
  if (canMoveTo(grid, targetX, targetZ, radius)) {
    return { x: targetX, z: targetZ };
  }

  // Try X-only (slide along Z wall)
  if (canMoveTo(grid, targetX, currentZ, radius)) {
    return { x: targetX, z: currentZ };
  }

  // Try Z-only (slide along X wall)
  if (canMoveTo(grid, currentX, targetZ, radius)) {
    return { x: currentX, z: targetZ };
  }

  // Fully blocked — stay in place
  return { x: currentX, z: currentZ };
}
