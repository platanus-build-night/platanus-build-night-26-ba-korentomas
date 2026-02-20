import { CellType } from './types';
import type { DungeonFloor, DoorInstance, FloorConfig, Room } from './types';

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roomCenter(room: Room): { x: number; z: number } {
  return {
    x: room.x + Math.floor(room.width / 2),
    z: room.y + Math.floor(room.height / 2),
  };
}

function roomsOverlap(a: Room, b: Room, padding: number): boolean {
  return !(
    a.x + a.width + padding <= b.x ||
    b.x + b.width + padding <= a.x ||
    a.y + a.height + padding <= b.y ||
    b.y + b.height + padding <= a.y
  );
}

function carveRoom(grid: CellType[][], room: Room): void {
  for (let row = room.y; row < room.y + room.height; row++) {
    for (let col = room.x; col < room.x + room.width; col++) {
      grid[row][col] = CellType.FLOOR;
    }
  }
}

function carveCorridor(
  grid: CellType[][],
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  width: number = 3,
): void {
  const gridH = grid.length;
  const gridW = grid[0].length;
  const halfW = Math.floor(width / 2);

  // Horizontal segment first — widen around z1
  const startX = Math.min(x1, x2);
  const endX = Math.max(x1, x2);
  for (let x = startX; x <= endX; x++) {
    for (let offset = -halfW; offset <= halfW; offset++) {
      const z = z1 + offset;
      if (z >= 0 && z < gridH && x >= 0 && x < gridW) {
        if (grid[z][x] === CellType.WALL) {
          grid[z][x] = CellType.FLOOR;
        }
      }
    }
  }

  // Vertical segment — widen around x2
  const startZ = Math.min(z1, z2);
  const endZ = Math.max(z1, z2);
  for (let z = startZ; z <= endZ; z++) {
    for (let offset = -halfW; offset <= halfW; offset++) {
      const x = x2 + offset;
      if (z >= 0 && z < gridH && x >= 0 && x < gridW) {
        if (grid[z][x] === CellType.WALL) {
          grid[z][x] = CellType.FLOOR;
        }
      }
    }
  }
}

function distanceSq(
  a: { x: number; z: number },
  b: { x: number; z: number },
): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function isInsideRoom(col: number, row: number, rooms: Room[]): boolean {
  for (const room of rooms) {
    if (
      col >= room.x &&
      col < room.x + room.width &&
      row >= room.y &&
      row < room.y + room.height
    ) {
      return true;
    }
  }
  return false;
}

function placeDoors(
  grid: CellType[][],
  rooms: Room[],
): DoorInstance[] {
  const doors: DoorInstance[] = [];
  const gridH = grid.length;
  const gridW = grid[0].length;

  for (const room of rooms) {
    // Check north wall — cells just outside north edge of room
    const northRow = room.y - 1;
    if (northRow >= 0) {
      for (let col = room.x; col < room.x + room.width; col++) {
        if (col < 0 || col >= gridW) continue;
        if (grid[northRow][col] !== CellType.FLOOR) continue;
        if (isInsideRoom(col, northRow, rooms)) continue;
        // Center of 3-wide corridor: FLOOR on both east/west neighbors
        const leftFloor = col > 0 && grid[northRow][col - 1] === CellType.FLOOR;
        const rightFloor = col < gridW - 1 && grid[northRow][col + 1] === CellType.FLOOR;
        if (leftFloor && rightFloor) {
          grid[northRow][col] = CellType.DOOR;
          doors.push({ gridX: col, gridZ: northRow, orientation: 'ns', isOpen: false, openProgress: 0 });
        }
      }
    }

    // Check south wall — cells just outside south edge of room
    const southRow = room.y + room.height;
    if (southRow < gridH) {
      for (let col = room.x; col < room.x + room.width; col++) {
        if (col < 0 || col >= gridW) continue;
        if (grid[southRow][col] !== CellType.FLOOR) continue;
        if (isInsideRoom(col, southRow, rooms)) continue;
        const leftFloor = col > 0 && grid[southRow][col - 1] === CellType.FLOOR;
        const rightFloor = col < gridW - 1 && grid[southRow][col + 1] === CellType.FLOOR;
        if (leftFloor && rightFloor) {
          grid[southRow][col] = CellType.DOOR;
          doors.push({ gridX: col, gridZ: southRow, orientation: 'ns', isOpen: false, openProgress: 0 });
        }
      }
    }

    // Check west wall — cells just outside west edge of room
    const westCol = room.x - 1;
    if (westCol >= 0) {
      for (let row = room.y; row < room.y + room.height; row++) {
        if (row < 0 || row >= gridH) continue;
        if (grid[row][westCol] !== CellType.FLOOR) continue;
        if (isInsideRoom(westCol, row, rooms)) continue;
        // Center of 3-wide corridor: FLOOR on both north/south neighbors
        const upFloor = row > 0 && grid[row - 1][westCol] === CellType.FLOOR;
        const downFloor = row < gridH - 1 && grid[row + 1][westCol] === CellType.FLOOR;
        if (upFloor && downFloor) {
          grid[row][westCol] = CellType.DOOR;
          doors.push({ gridX: westCol, gridZ: row, orientation: 'ew', isOpen: false, openProgress: 0 });
        }
      }
    }

    // Check east wall — cells just outside east edge of room
    const eastCol = room.x + room.width;
    if (eastCol < gridW) {
      for (let row = room.y; row < room.y + room.height; row++) {
        if (row < 0 || row >= gridH) continue;
        if (grid[row][eastCol] !== CellType.FLOOR) continue;
        if (isInsideRoom(eastCol, row, rooms)) continue;
        const upFloor = row > 0 && grid[row - 1][eastCol] === CellType.FLOOR;
        const downFloor = row < gridH - 1 && grid[row + 1][eastCol] === CellType.FLOOR;
        if (upFloor && downFloor) {
          grid[row][eastCol] = CellType.DOOR;
          doors.push({ gridX: eastCol, gridZ: row, orientation: 'ew', isOpen: false, openProgress: 0 });
        }
      }
    }
  }

  return doors;
}

export function generateFloor(config: FloorConfig): DungeonFloor {
  const { gridSize } = config;
  const [roomMin, roomMax] = config.roomCount;
  const targetRoomCount = randInt(roomMin, roomMax);

  // Initialize grid as all walls
  const grid: CellType[][] = [];
  for (let row = 0; row < gridSize; row++) {
    grid.push(new Array<CellType>(gridSize).fill(CellType.WALL));
  }

  // Place rooms with random positions, reject overlaps
  const rooms: Room[] = [];
  const maxAttempts = 200;

  for (let attempt = 0; attempt < maxAttempts && rooms.length < targetRoomCount; attempt++) {
    const w = randInt(6, 12);
    const h = randInt(6, 12);
    const x = randInt(1, gridSize - w - 1);
    const y = randInt(1, gridSize - h - 1);

    const candidate: Room = { x, y, width: w, height: h, connections: [] };

    const overlaps = rooms.some((r) => roomsOverlap(r, candidate, 2));
    if (!overlaps) {
      rooms.push(candidate);
      carveRoom(grid, candidate);
    }
  }

  // Connect rooms with L-shaped corridors (each room to the next)
  for (let i = 0; i < rooms.length - 1; i++) {
    const a = roomCenter(rooms[i]);
    const b = roomCenter(rooms[i + 1]);
    carveCorridor(grid, a.x, a.z, b.x, b.z, config.corridorWidth);
    rooms[i].connections.push(rooms[i + 1]);
    rooms[i + 1].connections.push(rooms[i]);
  }

  // Place doors at room entrances (center of corridor width only)
  const doors = placeDoors(grid, rooms);

  // Player starts in the center of the first room
  const playerStart = roomCenter(rooms[0]);

  // Exit is in the room farthest from player start
  let farthestDist = -1;
  let farthestRoom = rooms[rooms.length - 1];
  for (let i = 1; i < rooms.length; i++) {
    const center = roomCenter(rooms[i]);
    const d = distanceSq(playerStart, center);
    if (d > farthestDist) {
      farthestDist = d;
      farthestRoom = rooms[i];
    }
  }
  const exitPosition = roomCenter(farthestRoom);

  // Generate spawn points: 2-4 random floor cells per room (excluding player start room)
  const spawnPoints: { x: number; z: number }[] = [];
  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    const count = randInt(2, 4);
    for (let s = 0; s < count; s++) {
      const sx = randInt(room.x + 1, room.x + room.width - 2);
      const sz = randInt(room.y + 1, room.y + room.height - 2);
      spawnPoints.push({ x: sx, z: sz });
    }
  }

  return { grid, rooms, spawnPoints, playerStart, exitPosition, doors };
}
