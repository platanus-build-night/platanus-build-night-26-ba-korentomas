import * as THREE from 'three';
import type { DungeonFloor, Room } from '../dungeon/types';
import { ItemType, ITEM_DEFS, type ItemDef } from './itemTypes';

export interface PlacedItem {
  def: ItemDef;
  model: THREE.Group;
  position: THREE.Vector3;
  collected: boolean;
}

export function spawnItems(floor: DungeonFloor, group: THREE.Group): PlacedItem[] {
  const items: PlacedItem[] = [];
  const { rooms } = floor;

  // Skip room 0 (player start room)
  const eligibleRooms = rooms.slice(1);
  if (eligibleRooms.length === 0) return items;

  // Blueprints now only come from clearing BLUEPRINT rooms — no random spawn

  // 0-2 health potions
  const potionCount = Math.floor(Math.random() * 3);
  for (let i = 0; i < potionCount; i++) {
    placeItem(ItemType.HEALTH_POTION, pickRandomRoom(eligibleRooms), group, items);
  }

  // 3-5 score gems
  const gemCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < gemCount; i++) {
    placeItem(ItemType.SCORE_GEM, pickRandomRoom(eligibleRooms), group, items);
  }

  // 1-2 weapon crates per floor (community weapons)
  const crateCount = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < crateCount; i++) {
    placeItem(ItemType.WEAPON_CRATE, pickRandomRoom(eligibleRooms), group, items);
  }

  return items;
}

export function spawnBlueprintAtPosition(x: number, z: number, group: THREE.Group): PlacedItem {
  const def = ITEM_DEFS[ItemType.BLUEPRINT];
  const model = def.modelGenerator();
  model.position.set(x, 0.5, z);
  group.add(model);
  return {
    def,
    model,
    position: new THREE.Vector3(x, 0, z),
    collected: false,
  };
}

function pickRandomRoom(rooms: Room[]): Room {
  return rooms[Math.floor(Math.random() * rooms.length)];
}

/** Spawn an item at a specific world position (used by breakable system for loot drops) */
export function spawnItemAt(
  x: number,
  z: number,
  type: ItemType,
  group: THREE.Group,
  items: PlacedItem[],
): PlacedItem {
  const def = ITEM_DEFS[type];
  const model = def.modelGenerator();
  model.position.set(x, 0.5, z);
  group.add(model);

  const placed: PlacedItem = {
    def,
    model,
    position: new THREE.Vector3(x, 0, z),
    collected: false,
  };
  items.push(placed);
  return placed;
}

function placeItem(
  type: ItemType,
  room: Room,
  group: THREE.Group,
  items: PlacedItem[],
): void {
  // Random position within room (avoid edges)
  const x = room.x + 2 + Math.random() * Math.max(0, room.width - 4);
  const z = room.y + 2 + Math.random() * Math.max(0, room.height - 4);

  spawnItemAt(x, z, type, group, items);
}
