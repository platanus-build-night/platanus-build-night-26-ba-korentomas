import { CellType } from '../dungeon/types';

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
  radius: number,
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
  radius: number,
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

/**
 * Push player away from nearby wall cells to prevent camera clipping.
 * Checks a circle vs axis-aligned cell boundaries for all neighboring wall cells.
 * This runs AFTER movement resolution as an extra safety pass.
 */
export function pushAwayFromWalls(
  grid: CellType[][],
  px: number,
  pz: number,
  radius: number,
): { x: number; z: number } {
  let x = px;
  let z = pz;

  // Check a 3x3 area of cells around the player
  const cellX = Math.floor(x);
  const cellZ = Math.floor(z);

  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const gx = cellX + dx;
      const gz = cellZ + dz;

      // Only push away from walls (non-walkable cells)
      if (isWalkable(grid, gx, gz)) continue;

      // Find closest point on the wall cell's AABB to the player
      const wallMinX = gx;
      const wallMaxX = gx + 1;
      const wallMinZ = gz;
      const wallMaxZ = gz + 1;

      const closestX = Math.max(wallMinX, Math.min(x, wallMaxX));
      const closestZ = Math.max(wallMinZ, Math.min(z, wallMaxZ));

      const distX = x - closestX;
      const distZ = z - closestZ;
      const distSq = distX * distX + distZ * distZ;

      // If player circle overlaps this wall cell, push out
      if (distSq < radius * radius && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const overlap = radius - dist;
        // Normalize and push
        x += (distX / dist) * overlap;
        z += (distZ / dist) * overlap;
      } else if (distSq < 0.0001) {
        // Player center is exactly on the wall edge — push along the axis with more room
        const pushX = x - (wallMinX + 0.5);
        const pushZ = z - (wallMinZ + 0.5);
        if (Math.abs(pushX) > Math.abs(pushZ)) {
          x += (pushX > 0 ? 1 : -1) * radius;
        } else {
          z += (pushZ > 0 ? 1 : -1) * radius;
        }
      }
    }
  }

  return { x, z };
}
