import type { FloorConfig } from './types';

export function getFloorConfig(floorNumber: number): FloorConfig {
  const roomMin = Math.min(5 + Math.floor(floorNumber / 2), 10);
  const roomMax = Math.min(roomMin + 2, 12);
  const enemyMin = Math.min(2 + Math.floor(floorNumber / 3), 5);
  const enemyMax = Math.min(enemyMin + 2, 8);

  return {
    floorNumber,
    roomCount: [roomMin, roomMax],
    gridSize: 50,
    enemiesPerRoom: [enemyMin, enemyMax],
    corridorWidth: 3,
  };
}
