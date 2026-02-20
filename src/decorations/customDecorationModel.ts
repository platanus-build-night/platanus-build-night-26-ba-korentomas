import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { normalizeModel } from '../utils/modelNormalizer';

const loader = new GLTFLoader();

export async function createCustomDecoration(glb: ArrayBuffer): Promise<() => THREE.Group> {
  const result = await loader.parseAsync(glb.slice(0), '');
  const scene = result.scene;
  normalizeModel(scene, 0.6); // decoration scale

  return () => {
    const clone = scene.clone(true);
    return clone;
  };
}
