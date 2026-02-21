import * as THREE from 'three';

export enum ItemType {
  HEALTH_POTION = 'HEALTH_POTION',
  SCORE_GEM = 'SCORE_GEM',
  BLUEPRINT = 'BLUEPRINT',
  WEAPON_CRATE = 'WEAPON_CRATE',
}

export interface ItemDef {
  type: ItemType;
  name: string;
  points: number;
  healAmount: number;
  modelGenerator: () => THREE.Group;
}

// Lazy singleton for shared item geometries
let sharedItemGeo: {
  potion: THREE.SphereGeometry;
  gem: THREE.OctahedronGeometry;
  blueprint: THREE.BoxGeometry;
  crate: THREE.BoxGeometry;
} | null = null;

// Lazy singleton for shared item materials
let sharedItemMat: {
  potion: THREE.MeshStandardMaterial;
  gem: THREE.MeshStandardMaterial;
  blueprint: THREE.MeshStandardMaterial;
  crate: THREE.MeshStandardMaterial;
} | null = null;

function ensureItemShared(): void {
  if (!sharedItemGeo) {
    sharedItemGeo = {
      potion: new THREE.SphereGeometry(0.15, 8, 6),
      gem: new THREE.OctahedronGeometry(0.12, 0),
      blueprint: new THREE.BoxGeometry(0.3, 0.4, 0.02),
      crate: new THREE.BoxGeometry(0.35, 0.35, 0.35),
    };
  }
  if (!sharedItemMat) {
    sharedItemMat = {
      potion: new THREE.MeshStandardMaterial({
        color: 0xff3333,
        emissive: 0xff3333,
        emissiveIntensity: 0.5,
        roughness: 0.3,
      }),
      gem: new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xffaa00,
        emissiveIntensity: 0.4,
        roughness: 0.2,
      }),
      blueprint: new THREE.MeshStandardMaterial({
        color: 0x4488ff,
        emissive: 0x2244aa,
        emissiveIntensity: 0.6,
        roughness: 0.5,
      }),
      crate: new THREE.MeshStandardMaterial({
        color: 0xdaa520,
        emissive: 0xcc7700,
        emissiveIntensity: 0.6,
        roughness: 0.4,
        metalness: 0.3,
      }),
    };
  }
}

export const ITEM_DEFS: Record<ItemType, ItemDef> = {
  [ItemType.HEALTH_POTION]: {
    type: ItemType.HEALTH_POTION,
    name: 'Health Potion',
    points: 0,
    healAmount: 25,
    modelGenerator: (): THREE.Group => {
      ensureItemShared();
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(sharedItemGeo!.potion, sharedItemMat!.potion);
      group.add(mesh);
      return group;
    },
  },
  [ItemType.SCORE_GEM]: {
    type: ItemType.SCORE_GEM,
    name: 'Score Gem',
    points: 50,
    healAmount: 0,
    modelGenerator: (): THREE.Group => {
      ensureItemShared();
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(sharedItemGeo!.gem, sharedItemMat!.gem);
      group.add(mesh);
      return group;
    },
  },
  [ItemType.BLUEPRINT]: {
    type: ItemType.BLUEPRINT,
    name: 'Blueprint',
    points: 200,
    healAmount: 0,
    modelGenerator: (): THREE.Group => {
      ensureItemShared();
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(sharedItemGeo!.blueprint, sharedItemMat!.blueprint);
      group.add(mesh);
      return group;
    },
  },
  [ItemType.WEAPON_CRATE]: {
    type: ItemType.WEAPON_CRATE,
    name: 'Weapon Crate',
    points: 0,
    healAmount: 0,
    modelGenerator: (): THREE.Group => {
      ensureItemShared();
      const group = new THREE.Group();
      // Glowing crate with golden emissive
      const mesh = new THREE.Mesh(sharedItemGeo!.crate, sharedItemMat!.crate);
      group.add(mesh);
      return group;
    },
  },
};

export function disposeItemShared(): void {
  if (sharedItemGeo) {
    sharedItemGeo.potion.dispose();
    sharedItemGeo.gem.dispose();
    sharedItemGeo.blueprint.dispose();
    sharedItemGeo.crate.dispose();
    sharedItemGeo = null;
  }
  if (sharedItemMat) {
    sharedItemMat.potion.dispose();
    sharedItemMat.gem.dispose();
    sharedItemMat.blueprint.dispose();
    sharedItemMat.crate.dispose();
    sharedItemMat = null;
  }
}
