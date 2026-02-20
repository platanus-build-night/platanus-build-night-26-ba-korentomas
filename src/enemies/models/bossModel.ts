import * as THREE from 'three';
import { createSkeletonModel } from './skeletonModel';

export function createBossModel(): THREE.Group {
  const group = createSkeletonModel();
  group.scale.setScalar(2.0);

  // Override materials: darker, more threatening
  group.traverse((child) => {
    if (
      child instanceof THREE.Mesh &&
      child.material instanceof THREE.MeshStandardMaterial
    ) {
      child.material = child.material.clone();
      child.material.color.setHex(0x442222);
      child.material.emissive.setHex(0x330000);
      child.material.emissiveIntensity = 0.3;
    }
  });

  return group;
}
