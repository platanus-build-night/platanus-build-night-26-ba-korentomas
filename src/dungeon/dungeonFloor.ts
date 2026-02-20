import * as THREE from 'three';
import { CellType } from './types';
import type { DungeonFloor } from './types';
import {
  createBrickTexture,
  createStoneFloorTexture,
  createCeilingTexture,
} from '../utils/proceduralTextures';
import { createDoorModel, disposeDoorShared } from './doorMesh';

const CORRIDOR_HEIGHT = 5;

export interface FloorMeshResult {
  group: THREE.Group;
  doorMeshes: Map<string, THREE.Group>;
  exitMarker: THREE.Mesh;
}

export function buildFloorMesh(floor: DungeonFloor): FloorMeshResult {
  const group = new THREE.Group();
  const { grid } = floor;
  const rows = grid.length;
  const cols = grid[0].length;

  // Shared materials
  const wallMat = new THREE.MeshStandardMaterial({
    map: createBrickTexture(),
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    map: createStoneFloorTexture(),
    roughness: 0.95,
  });
  const ceilMat = new THREE.MeshStandardMaterial({
    map: createCeilingTexture(),
    roughness: 1.0,
  });

  // Shared geometries
  const wallGeo = new THREE.PlaneGeometry(1, CORRIDOR_HEIGHT);
  const floorGeo = new THREE.PlaneGeometry(1, 1);

  // Direction offsets for wall checks: [dRow, dCol, rotationY, offsetX, offsetZ]
  const directions: [number, number, number, number, number][] = [
    [-1, 0, 0, 0, -0.5],       // north wall (faces +Z)
    [1, 0, Math.PI, 0, 0.5],   // south wall (faces -Z)
    [0, -1, Math.PI / 2, -0.5, 0],   // west wall (faces +X)
    [0, 1, -Math.PI / 2, 0.5, 0],    // east wall (faces -X)
  ];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = grid[row][col];
      if (cell === CellType.WALL) continue;

      // Floor plane at y=0
      const floorPlane = new THREE.Mesh(floorGeo, floorMat);
      floorPlane.rotation.x = -Math.PI / 2;
      floorPlane.position.set(col, 0, row);
      group.add(floorPlane);

      // Ceiling plane at y=CORRIDOR_HEIGHT
      const ceilPlane = new THREE.Mesh(floorGeo, ceilMat);
      ceilPlane.rotation.x = Math.PI / 2;
      ceilPlane.position.set(col, CORRIDOR_HEIGHT, row);
      group.add(ceilPlane);

      // Walls where adjacent cell is a wall
      for (const [dr, dc, rotY, offX, offZ] of directions) {
        const nr = row + dr;
        const nc = col + dc;
        const isWall =
          nr < 0 || nr >= rows || nc < 0 || nc >= cols ||
          grid[nr][nc] === CellType.WALL;

        if (isWall) {
          const wall = new THREE.Mesh(wallGeo, wallMat);
          wall.rotation.y = rotY;
          wall.position.set(
            col + offX,
            CORRIDOR_HEIGHT / 2,
            row + offZ,
          );
          group.add(wall);
        }
      }
    }
  }

  // Exit marker: starts red/dim (boss must be defeated first), game loop changes to green
  const exitGeo = new THREE.PlaneGeometry(1.5, 1.5);
  const exitMat = new THREE.MeshBasicMaterial({
    color: 0xff3333,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  const exitMarker = new THREE.Mesh(exitGeo, exitMat);
  exitMarker.rotation.x = -Math.PI / 2;
  exitMarker.position.set(floor.exitPosition.x, 0.05, floor.exitPosition.z);
  exitMarker.name = 'exitMarker';
  group.add(exitMarker);

  // Place door meshes at DOOR cells
  const doorMeshes = new Map<string, THREE.Group>();
  for (const door of floor.doors) {
    const doorModel = createDoorModel(door.orientation);
    doorModel.position.set(door.gridX, 0, door.gridZ);
    group.add(doorModel);
    doorMeshes.set(`${door.gridX},${door.gridZ}`, doorModel);
  }

  return { group, doorMeshes, exitMarker };
}

export function disposeFloorMesh(result: FloorMeshResult): void {
  const { group } = result;
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      geometries.add(child.geometry);
      if (child.material instanceof THREE.Material) {
        materials.add(child.material);
        if ('map' in child.material && child.material.map) {
          textures.add(child.material.map as THREE.Texture);
        }
      }
    }
  });

  geometries.forEach((g) => g.dispose());
  textures.forEach((t) => t.dispose());
  materials.forEach((m) => m.dispose());
  group.clear();
  disposeDoorShared();
}
