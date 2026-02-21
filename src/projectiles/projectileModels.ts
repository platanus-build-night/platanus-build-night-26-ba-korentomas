import * as THREE from 'three';
import type { ProjectileType } from './projectileTypes';

// Lazy shared geometry
let sharedGeo: THREE.SphereGeometry | null = null;
let sharedPlaneGeo: THREE.PlaneGeometry | null = null;

// Materials cached by color
const materialCache = new Map<number, THREE.MeshStandardMaterial>();

// Sprite textures cached by data URL
const spriteTextureCache = new Map<string, THREE.Texture>();
const spriteMaterialCache = new Map<string, THREE.MeshBasicMaterial>();

function ensureGeo(): THREE.SphereGeometry {
  if (!sharedGeo) {
    sharedGeo = new THREE.SphereGeometry(0.08, 6, 4);
  }
  return sharedGeo;
}

function ensurePlaneGeo(): THREE.PlaneGeometry {
  if (!sharedPlaneGeo) {
    sharedPlaneGeo = new THREE.PlaneGeometry(0.3, 0.3);
  }
  return sharedPlaneGeo;
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

function getSpriteMaterial(dataUrl: string, color: number): THREE.MeshBasicMaterial {
  let mat = spriteMaterialCache.get(dataUrl);
  if (!mat) {
    let tex = spriteTextureCache.get(dataUrl);
    if (!tex) {
      const img = new Image();
      img.src = dataUrl;
      tex = new THREE.Texture(img);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      img.onload = () => { tex!.needsUpdate = true; };
      spriteTextureCache.set(dataUrl, tex);
    }
    mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
      color: new THREE.Color(color),
    });
    spriteMaterialCache.set(dataUrl, mat);
  }
  return mat;
}

/** Returns true if the type uses a custom sprite texture. */
export function isSprite(type: ProjectileType): boolean {
  return !!type.spriteDataUrl;
}

export function createProjectileMesh(type: ProjectileType): THREE.Mesh {
  if (type.spriteDataUrl) {
    return createSpriteMesh(type);
  }
  const mesh = new THREE.Mesh(ensureGeo(), getMaterial(type.color));
  mesh.scale.setScalar(type.scale);
  return mesh;
}

function createSpriteMesh(type: ProjectileType): THREE.Mesh {
  const mat = getSpriteMaterial(type.spriteDataUrl!, type.color);
  const mesh = new THREE.Mesh(ensurePlaneGeo(), mat);
  mesh.scale.setScalar(type.scale);

  // Billboard: face camera every frame
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    mesh.quaternion.copy(camera.quaternion);
  };

  return mesh;
}

export function disposeProjectileShared(): void {
  sharedGeo?.dispose();
  sharedGeo = null;
  sharedPlaneGeo?.dispose();
  sharedPlaneGeo = null;
  materialCache.forEach((m) => m.dispose());
  materialCache.clear();
  spriteTextureCache.forEach((t) => t.dispose());
  spriteTextureCache.clear();
  spriteMaterialCache.forEach((m) => m.dispose());
  spriteMaterialCache.clear();
}
