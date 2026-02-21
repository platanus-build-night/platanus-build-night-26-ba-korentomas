import * as THREE from 'three';

// Lazy singleton for shared geometries
let sharedGeo: {
  barrel: THREE.CylinderGeometry;
  crate: THREE.BoxGeometry;
  bone: THREE.CylinderGeometry;
  pillar: THREE.CylinderGeometry;
  chestBody: THREE.BoxGeometry;
  chestLidBand: THREE.BoxGeometry;
  urn: THREE.CylinderGeometry;
  candelabraStand: THREE.CylinderGeometry;
  candelabraHolder: THREE.BoxGeometry;
} | null = null;

// Lazy singleton for shared base materials
let sharedMat: {
  wood: THREE.MeshStandardMaterial;
  woodDark: THREE.MeshStandardMaterial;
  bone: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  chestWood: THREE.MeshStandardMaterial;
  chestBrass: THREE.MeshStandardMaterial;
  terraCotta: THREE.MeshStandardMaterial;
  goldBrass: THREE.MeshStandardMaterial;
} | null = null;

function ensureShared(): void {
  if (!sharedGeo) {
    sharedGeo = {
      barrel: new THREE.CylinderGeometry(0.3, 0.3, 0.6, 8),
      crate: new THREE.BoxGeometry(0.5, 0.5, 0.5),
      bone: new THREE.CylinderGeometry(0.02, 0.02, 0.15, 4),
      pillar: new THREE.CylinderGeometry(0.25, 0.25, 5, 8),
      chestBody: new THREE.BoxGeometry(0.6, 0.4, 0.5),
      chestLidBand: new THREE.BoxGeometry(0.62, 0.05, 0.52),
      urn: new THREE.CylinderGeometry(0.2, 0.35, 0.6, 8),
      candelabraStand: new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6),
      candelabraHolder: new THREE.BoxGeometry(0.06, 0.06, 0.06),
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
      chestWood: new THREE.MeshStandardMaterial({
        color: 0x3e2215,
        roughness: 0.85,
      }),
      chestBrass: new THREE.MeshStandardMaterial({
        color: 0xb8860b,
        roughness: 0.4,
        metalness: 0.6,
      }),
      terraCotta: new THREE.MeshStandardMaterial({
        color: 0xa0522d,
        roughness: 0.9,
      }),
      goldBrass: new THREE.MeshStandardMaterial({
        color: 0xd4a017,
        roughness: 0.35,
        metalness: 0.7,
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

export function createChestModel(): THREE.Group {
  ensureShared();

  const group = new THREE.Group();

  // Main body — dark wood chest
  const body = new THREE.Mesh(sharedGeo!.chestBody, sharedMat!.chestWood);
  body.position.y = 0.2;
  group.add(body);

  // Brass lid band across the top
  const lidBand = new THREE.Mesh(sharedGeo!.chestLidBand, sharedMat!.chestBrass);
  lidBand.position.y = 0.425;
  group.add(lidBand);

  return group;
}

export function createUrnModel(): THREE.Group {
  ensureShared();

  const group = new THREE.Group();
  const urn = new THREE.Mesh(sharedGeo!.urn, sharedMat!.terraCotta);
  urn.position.y = 0.3;
  group.add(urn);

  return group;
}

export function createCandelabraModel(): THREE.Group {
  ensureShared();

  const group = new THREE.Group();

  // Tall stand
  const stand = new THREE.Mesh(sharedGeo!.candelabraStand, sharedMat!.goldBrass);
  stand.position.y = 0.6;
  group.add(stand);

  // Candle holders at the top — three small boxes in a T-shape
  const holderPositions = [
    { x: 0, z: 0 },
    { x: -0.12, z: 0 },
    { x: 0.12, z: 0 },
  ];
  for (const pos of holderPositions) {
    const holder = new THREE.Mesh(sharedGeo!.candelabraHolder, sharedMat!.goldBrass);
    holder.position.set(pos.x, 1.23, pos.z);
    group.add(holder);
  }

  return group;
}

export function disposeDecorationShared(): void {
  if (sharedGeo) {
    sharedGeo.barrel.dispose();
    sharedGeo.crate.dispose();
    sharedGeo.bone.dispose();
    sharedGeo.pillar.dispose();
    sharedGeo.chestBody.dispose();
    sharedGeo.chestLidBand.dispose();
    sharedGeo.urn.dispose();
    sharedGeo.candelabraStand.dispose();
    sharedGeo.candelabraHolder.dispose();
    sharedGeo = null;
  }
  if (sharedMat) {
    sharedMat.wood.dispose();
    sharedMat.woodDark.dispose();
    sharedMat.bone.dispose();
    sharedMat.stone.dispose();
    sharedMat.chestWood.dispose();
    sharedMat.chestBrass.dispose();
    sharedMat.terraCotta.dispose();
    sharedMat.goldBrass.dispose();
    sharedMat = null;
  }
}
