import * as THREE from 'three';

// Lazy singleton for shared geometries
let sharedGeo: {
  panel: THREE.BoxGeometry;
} | null = null;

// Lazy singleton for shared materials
let sharedMat: {
  wood: THREE.MeshStandardMaterial;
} | null = null;

function ensureShared(): void {
  if (!sharedGeo) {
    sharedGeo = {
      panel: new THREE.BoxGeometry(1, 4.5, 0.15),
    };
  }
  if (!sharedMat) {
    sharedMat = {
      wood: new THREE.MeshStandardMaterial({
        color: 0x5c3317,
        roughness: 0.9,
      }),
    };
  }
}

export function createDoorModel(orientation: 'ns' | 'ew'): THREE.Group {
  ensureShared();

  const group = new THREE.Group();

  // Inner pivot group — rotating this animates door opening
  const pivot = new THREE.Group();

  const panel = new THREE.Mesh(sharedGeo!.panel, sharedMat!.wood);
  // Offset pivot so door swings from its edge, not center
  panel.position.set(0.5, 4.5 / 2, 0);
  pivot.add(panel);

  // Shift pivot so door is centered on the cell
  pivot.position.set(-0.5, 0, 0);
  group.add(pivot);

  // Rotate based on orientation:
  // 'ns' = corridor runs north-south, door panel spans east-west (default)
  // 'ew' = corridor runs east-west, door panel spans north-south (rotate 90°)
  if (orientation === 'ew') {
    group.rotation.y = Math.PI / 2;
  }

  return group;
}

export function disposeDoorShared(): void {
  if (sharedGeo) {
    sharedGeo.panel.dispose();
    sharedGeo = null;
  }
  if (sharedMat) {
    sharedMat.wood.dispose();
    sharedMat = null;
  }
}
