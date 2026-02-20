import * as THREE from 'three';
import type { ProjectileType } from './projectileTypes';

// Lazy shared geometry
let sharedGeo: THREE.SphereGeometry | null = null;

// Materials cached by color
const materialCache = new Map<number, THREE.MeshStandardMaterial>();

function ensureGeo(): THREE.SphereGeometry {
  if (!sharedGeo) {
    sharedGeo = new THREE.SphereGeometry(0.08, 6, 4);
  }
  return sharedGeo;
}

function getMaterial(color: number): THREE.MeshStandardMaterial {
  let mat = materialCache.get(color);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 2.0,
      roughness: 0.3,
    });
    materialCache.set(color, mat);
  }
  return mat;
}

export function createProjectileMesh(type: ProjectileType): THREE.Mesh {
  const mesh = new THREE.Mesh(ensureGeo(), getMaterial(type.color));
  mesh.scale.setScalar(type.scale);
  return mesh;
}

export function disposeProjectileShared(): void {
  sharedGeo?.dispose();
  sharedGeo = null;
  materialCache.forEach((m) => m.dispose());
  materialCache.clear();
}
