import * as THREE from 'three';
import type { PlacedItem } from './itemPlacer';

const PICKUP_RADIUS_SQ = 1.5 * 1.5; // 1.5 unit pickup radius, squared for fast check

export class ItemPickupSystem {
  private items: PlacedItem[] = [];
  private time = 0;

  setItems(items: PlacedItem[]): void {
    this.items = items;
  }

  addItem(item: PlacedItem): void {
    this.items.push(item);
  }

  /** Call each frame. Returns items collected this frame. */
  update(playerPos: THREE.Vector3, delta: number): PlacedItem[] {
    this.time += delta;
    const collected: PlacedItem[] = [];

    for (const item of this.items) {
      if (item.collected) continue;

      // Bob and rotate animation
      item.model.position.y = 0.5 + Math.sin(this.time * 2) * 0.1;
      item.model.rotation.y += delta * 1.5;

      // Check pickup (XZ distance only)
      const dx = playerPos.x - item.position.x;
      const dz = playerPos.z - item.position.z;
      if (dx * dx + dz * dz < PICKUP_RADIUS_SQ) {
        item.collected = true;
        item.model.visible = false;
        collected.push(item);
      }
    }

    return collected;
  }

  dispose(): void {
    for (const item of this.items) {
      if (item.model.parent) {
        item.model.parent.remove(item.model);
      }
    }
    this.items.length = 0;
  }
}
