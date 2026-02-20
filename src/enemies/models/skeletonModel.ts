import * as THREE from 'three';

// Lazy singleton for shared geometries
let sharedGeo: {
  skull: THREE.SphereGeometry;
  eye: THREE.SphereGeometry;
  body: THREE.BoxGeometry;
  arm: THREE.CylinderGeometry;
  leg: THREE.CylinderGeometry;
} | null = null;

// Lazy singleton for shared base materials
let sharedMat: {
  bone: THREE.MeshStandardMaterial;
  boneDark: THREE.MeshStandardMaterial;
  eye: THREE.MeshStandardMaterial;
} | null = null;

function ensureShared(): void {
  if (!sharedGeo) {
    sharedGeo = {
      skull: new THREE.SphereGeometry(0.2, 8, 6),
      eye: new THREE.SphereGeometry(0.05, 6, 4),
      body: new THREE.BoxGeometry(0.35, 0.5, 0.2),
      arm: new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6),
      leg: new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6),
    };
  }
  if (!sharedMat) {
    sharedMat = {
      bone: new THREE.MeshStandardMaterial({
        color: 0xe8e0d0,
        roughness: 0.8,
      }),
      boneDark: new THREE.MeshStandardMaterial({
        color: 0xb0a890,
        roughness: 0.9,
      }),
      eye: new THREE.MeshStandardMaterial({
        color: 0xff2200,
        emissive: 0xff2200,
        emissiveIntensity: 0.5,
      }),
    };
  }
}

export function createSkeletonModel(): THREE.Group {
  ensureShared();

  const group = new THREE.Group();

  // Skull
  const skull = new THREE.Mesh(sharedGeo!.skull, sharedMat!.bone);
  skull.position.y = 1.5;
  group.add(skull);

  // Eyes
  const leftEye = new THREE.Mesh(sharedGeo!.eye, sharedMat!.eye);
  leftEye.position.set(-0.07, 1.52, 0.15);
  group.add(leftEye);

  const rightEye = new THREE.Mesh(sharedGeo!.eye, sharedMat!.eye);
  rightEye.position.set(0.07, 1.52, 0.15);
  group.add(rightEye);

  // Body (ribcage)
  const body = new THREE.Mesh(sharedGeo!.body, sharedMat!.boneDark);
  body.position.y = 1.1;
  group.add(body);

  // Arms
  const leftArm = new THREE.Mesh(sharedGeo!.arm, sharedMat!.bone);
  leftArm.position.set(-0.28, 1.1, 0);
  leftArm.rotation.z = 0.2;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(sharedGeo!.arm, sharedMat!.bone);
  rightArm.position.set(0.28, 1.1, 0);
  rightArm.rotation.z = -0.2;
  group.add(rightArm);

  // Legs
  const leftLeg = new THREE.Mesh(sharedGeo!.leg, sharedMat!.bone);
  leftLeg.position.set(-0.1, 0.5, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(sharedGeo!.leg, sharedMat!.bone);
  rightLeg.position.set(0.1, 0.5, 0);
  group.add(rightLeg);

  return group;
}

export function disposeSkeletonShared(): void {
  if (sharedGeo) {
    sharedGeo.skull.dispose();
    sharedGeo.eye.dispose();
    sharedGeo.body.dispose();
    sharedGeo.arm.dispose();
    sharedGeo.leg.dispose();
    sharedGeo = null;
  }
  if (sharedMat) {
    sharedMat.bone.dispose();
    sharedMat.boneDark.dispose();
    sharedMat.eye.dispose();
    sharedMat = null;
  }
}
