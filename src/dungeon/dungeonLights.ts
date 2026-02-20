import * as THREE from 'three';
import type { Room } from './types';

export interface DungeonLight {
  light: THREE.PointLight;
  worldX: number;
  worldZ: number;
  phaseOffset: number;
}

const MAX_ACTIVE_LIGHTS = 6;
const BASE_INTENSITY = 6.0;
const FLICKER_AMOUNT = 0.4;

export function createDungeonLights(rooms: Room[], floorGroup: THREE.Group): DungeonLight[] {
  const lights: DungeonLight[] = [];

  for (const room of rooms) {
    const worldX = room.x + room.width / 2;
    const worldZ = room.y + room.height / 2;

    const light = new THREE.PointLight(0xff8830, BASE_INTENSITY, 25, 1);
    light.position.set(worldX, 4.5, worldZ);
    light.visible = false;
    floorGroup.add(light);

    lights.push({
      light,
      worldX,
      worldZ,
      phaseOffset: Math.random() * Math.PI * 2,
    });
  }

  return lights;
}

// Reusable array to avoid per-frame allocations
const _sortBuffer: { index: number; dist: number }[] = [];

export function updateDungeonLights(lights: DungeonLight[], cameraPos: THREE.Vector3, time: number): void {
  if (lights.length === 0) return;

  // Disable all lights first
  for (const dl of lights) {
    dl.light.visible = false;
    dl.light.intensity = 0;
  }

  // Build sort buffer without allocating
  _sortBuffer.length = 0;
  for (let i = 0; i < lights.length; i++) {
    const dl = lights[i];
    const dx = dl.worldX - cameraPos.x;
    const dz = dl.worldZ - cameraPos.z;
    _sortBuffer.push({ index: i, dist: dx * dx + dz * dz });
  }
  _sortBuffer.sort((a, b) => a.dist - b.dist);

  // Enable nearest lights
  const activeCount = Math.min(MAX_ACTIVE_LIGHTS, _sortBuffer.length);
  for (let i = 0; i < activeCount; i++) {
    const dl = lights[_sortBuffer[i].index];
    dl.light.visible = true;

    // Subtle flicker using sine waves
    const flicker =
      Math.sin(time * 5 + dl.phaseOffset) * 0.12 +
      Math.sin(time * 8.7 + dl.phaseOffset * 1.7) * 0.08;
    dl.light.intensity = BASE_INTENSITY + flicker * (FLICKER_AMOUNT / 0.2);
  }
}

export function disposeDungeonLights(lights: DungeonLight[]): void {
  for (const dl of lights) {
    if (dl.light.parent) {
      dl.light.parent.remove(dl.light);
    }
    dl.light.dispose();
  }
  lights.length = 0;
}
