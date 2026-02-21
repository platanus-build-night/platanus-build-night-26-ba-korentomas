import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface CorridorObject {
  group: THREE.Group;
  dispose: () => void;
}

const loader = new GLTFLoader();

export async function loadCorridorObject(
  glbBuffer: ArrayBuffer,
  targetHeight: number = 1.0
): Promise<CorridorObject> {
  const gltf = await loader.parseAsync(glbBuffer, './');
  const model = gltf.scene;

  // Normalize size and center on ground
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = targetHeight / Math.max(size.y, 0.01);
  model.scale.setScalar(scale);
  model.position.x = -center.x * scale;
  model.position.y = -box.min.y * scale;
  model.position.z = -center.z * scale;

  const group = new THREE.Group();
  group.add(model);

  function dispose(): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        for (const m of materials) {
          if ('map' in m && m.map) (m.map as THREE.Texture).dispose();
          m.dispose();
        }
      }
    });
  }

  return { group, dispose };
}

export function placeInCorridor(
  obj: CorridorObject,
  scene: THREE.Scene,
  z: number,
  side: 'left' | 'right' | 'center' = 'center'
): void {
  const xOffset = side === 'left' ? -1.5 : side === 'right' ? 1.5 : 0;
  obj.group.position.set(xOffset, 0, z);
  scene.add(obj.group);
}
