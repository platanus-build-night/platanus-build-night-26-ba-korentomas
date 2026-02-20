export enum CellType {
  WALL = 0,
  FLOOR = 1,
  DOOR = 2,
}

export enum RoomType {
  SPAWN = 'SPAWN',
  NORMAL = 'NORMAL',
  BLUEPRINT = 'BLUEPRINT',
  BOSS = 'BOSS',
}

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  connections: Room[];
  index: number;
  type: RoomType;
}

export interface DoorInstance {
  gridX: number;
  gridZ: number;
  orientation: 'ns' | 'ew'; // north-south or east-west
  isOpen: boolean;
  openProgress: number; // 0=closed, 1=open
  adjacentRoomIndices: number[];
  isLocked: boolean;
}

export interface SpawnPoint {
  x: number;
  z: number;
  roomIndex: number;
  isBoss: boolean;
}

export interface DungeonFloor {
  grid: CellType[][];
  rooms: Room[];
  spawnPoints: SpawnPoint[];
  playerStart: { x: number; z: number };
  exitPosition: { x: number; z: number };
  doors: DoorInstance[];
}

export interface FloorConfig {
  floorNumber: number;
  roomCount: [number, number];
  gridSize: number;
  enemiesPerRoom: [number, number];
  corridorWidth: number;
}
