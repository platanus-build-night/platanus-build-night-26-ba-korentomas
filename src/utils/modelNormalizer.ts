import * as THREE from 'three';

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _center = new THREE.Vector3();

export function normalizeModel(model: THREE.Object3D, targetHeight: number): void {
  _box.setFromObject(model);
  _box.getSize(_size);
  const maxDim = Math.max(_size.x, _size.y, _size.z);
  if (maxDim === 0) return;
  const scale = targetHeight / maxDim;
  model.scale.setScalar(scale);

  // Re-compute after scaling
  _box.setFromObject(model);
  _box.getCenter(_center);
  model.position.sub(_center);
  model.position.y = 0; // Ground the model
}
