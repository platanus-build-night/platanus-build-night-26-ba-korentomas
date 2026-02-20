export enum CellType {
  WALL = 0,
  FLOOR = 1,
  DOOR = 2,
}

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  connections: Room[];
}

export interface DoorInstance {
  gridX: number;
  gridZ: number;
  orientation: 'ns' | 'ew'; // north-south or east-west
  isOpen: boolean;
  openProgress: number; // 0=closed, 1=open
}

export interface DungeonFloor {
  grid: CellType[][];
  rooms: Room[];
  spawnPoints: { x: number; z: number }[];
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
