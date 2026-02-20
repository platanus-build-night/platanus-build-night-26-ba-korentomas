import type { Room, DoorInstance } from './types';

export class RoomTracker {
  private rooms: Room[];
  private doors: DoorInstance[];
  private enemyCounts = new Map<number, number>();
  private lastRoomIndex = -1;
  private onRoomClearedCb: ((roomIndex: number) => void) | null = null;
  private onRoomEnteredCb: ((roomIndex: number) => void) | null = null;

  constructor(rooms: Room[], doors: DoorInstance[]) {
    this.rooms = rooms;
    this.doors = doors;
  }

  registerEnemiesInRoom(roomIndex: number, count: number): void {
    this.enemyCounts.set(roomIndex, (this.enemyCounts.get(roomIndex) || 0) + count);
  }

  onEnemyKilled(roomIndex: number): void {
    const current = this.enemyCounts.get(roomIndex) || 0;
    const updated = Math.max(0, current - 1);
    this.enemyCounts.set(roomIndex, updated);
    if (updated === 0 && this.onRoomClearedCb) {
      this.onRoomClearedCb(roomIndex);
    }
  }

  getRoomIndexAtPosition(x: number, z: number): number {
    for (const room of this.rooms) {
      if (x >= room.x && x < room.x + room.width && z >= room.y && z < room.y + room.height) {
        return room.index;
      }
    }
    return -1;
  }

  updatePlayerPosition(x: number, z: number): { entered: number; exited: number } {
    const current = this.getRoomIndexAtPosition(x, z);
    const result = { entered: -1, exited: -1 };
    if (current !== this.lastRoomIndex) {
      if (this.lastRoomIndex >= 0) result.exited = this.lastRoomIndex;
      if (current >= 0) {
        result.entered = current;
        if (this.onRoomEnteredCb) this.onRoomEnteredCb(current);
      }
      this.lastRoomIndex = current;
    }
    return result;
  }

  lockRoom(roomIndex: number): void {
    for (const door of this.doors) {
      if (door.adjacentRoomIndices.includes(roomIndex)) {
        door.isLocked = true;
      }
    }
  }

  unlockRoom(roomIndex: number): void {
    for (const door of this.doors) {
      if (door.adjacentRoomIndices.includes(roomIndex)) {
        door.isLocked = false;
      }
    }
  }

  isRoomCleared(roomIndex: number): boolean {
    return (this.enemyCounts.get(roomIndex) || 0) === 0;
  }

  getEnemyCount(roomIndex: number): number {
    return this.enemyCounts.get(roomIndex) || 0;
  }

  setOnRoomCleared(cb: (roomIndex: number) => void): void {
    this.onRoomClearedCb = cb;
  }

  setOnRoomEntered(cb: (roomIndex: number) => void): void {
    this.onRoomEnteredCb = cb;
  }
}
