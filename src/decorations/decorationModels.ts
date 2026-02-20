import * as THREE from 'three';

// Lazy singleton for shared geometries
let sharedGeo: {
  barrel: THREE.CylinderGeometry;
  crate: THREE.BoxGeometry;
  bone: THREE.CylinderGeometry;
  pillar: THREE.CylinderGeometry;
} | null = null;

// Lazy singleton for shared base materials
let sharedMat: {
  wood: THREE.MeshStandardMaterial;
  woodDark: THREE.MeshStandardMaterial;
  bone: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
} | null = null;

function ensureShared(): void {
  if (!sharedGeo) {
    sharedGeo = {
      barrel: new THREE.CylinderGeometry(0.3, 0.3, 0.6, 8),
      crate: new THREE.BoxGeometry(0.5, 0.5, 0.5),
      bone: new THREE.CylinderGeometry(0.02, 0.02, 0.15, 4),
      pillar: new THREE.CylinderGeometry(0.25, 0.25, 5, 8),
    };
  }
  if (!sharedMat) {
    sharedMat = {
      wood: new THREE.MeshStandardMaterial({
        color: 0x8b5a2b,
        roughness: 0.85,
      }),
      woodDark: new THREE.MeshStandardMaterial({
        color: 0x5c3a1e,
        roughness: 0.9,
      }),
      bone: new THREE.MeshStandardMaterial({
        color: 0xe8e0d0,
        roughness: 0.8,
      }),
      stone: new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.95,
      }),
    };
  }
}

export function createBarrelModel(): THREE.Group {
  ensureShared();

  const group = new THREE.Group();
  const barrel = new THREE.Mesh(sharedGeo!.barrel, sharedMat!.wood);
  barrel.position.y = 0.3;
  group.add(barrel);

  return group;
}

export function createCrateModel(): THREE.Group {
  ensureShared();

  const group = new THREE.Group();
  const crate = new THREE.Mesh(sharedGeo!.crate, sharedMat!.woodDark);
  crate.position.y = 0.25;
  group.add(crate);

  return group;
}

export function createBonesModel(): THREE.Group {
  ensureShared();

  const group = new THREE.Group();
  const boneCount = 3 + Math.floor(Math.random() * 3); // 3-5 bones

  for (let i = 0; i < boneCount; i++) {
    const bone = new THREE.Mesh(sharedGeo!.bone, sharedMat!.bone);
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.2;
    bone.position.set(
      Math.cos(angle) * radius,
      0.02,
      Math.sin(angle) * radius,
    );
    bone.rotation.x = Math.PI / 2; // Lay flat
    bone.rotation.z = Math.random() * Math.PI; // Random orientation
    group.add(bone);
  }

  return group;
}

export function createPillarModel(): THREE.Group {
  ensureShared();

  const group = new THREE.Group();
  const pillar = new THREE.Mesh(sharedGeo!.pillar, sharedMat!.stone);
  pillar.position.y = 2.5;
  group.add(pillar);

  return group;
}

export function disposeDecorationShared(): void {
  if (sharedGeo) {
    sharedGeo.barrel.dispose();
    sharedGeo.crate.dispose();
    sharedGeo.bone.dispose();
    sharedGeo.pillar.dispose();
    sharedGeo = null;
  }
  if (sharedMat) {
    sharedMat.wood.dispose();
    sharedMat.woodDark.dispose();
    sharedMat.bone.dispose();
    sharedMat.stone.dispose();
    sharedMat = null;
  }
}
