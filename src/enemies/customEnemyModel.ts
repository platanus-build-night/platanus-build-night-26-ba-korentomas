import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { normalizeModel } from '../utils/modelNormalizer';

interface EnemyStats {
  health: number;
  speed: number;
  damage: number;
  points: number;
}

interface CustomEnemyType {
  name: string;
  health: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  points: number;
  modelGenerator: () => THREE.Group;
}

const loader = new GLTFLoader();

export async function createCustomEnemyType(
  glb: ArrayBuffer,
  stats: EnemyStats,
  name: string,
): Promise<CustomEnemyType> {
  const result = await loader.parseAsync(glb.slice(0), '');
  const scene = result.scene;
  normalizeModel(scene, 1.5); // enemy height

  // Ensure all materials are MeshStandardMaterial for lighting
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (!(child.material instanceof THREE.MeshStandardMaterial)) {
        const oldMat = child.material as THREE.Material;
        child.material = new THREE.MeshStandardMaterial({ roughness: 0.8 });
        oldMat.dispose();
      }
    }
  });

  return {
    name,
    health: stats.health,
    speed: stats.speed,
    damage: stats.damage,
    attackRange: 1.5,
    attackCooldown: 1.0,
    points: stats.points,
    modelGenerator: () => {
      const clone = scene.clone(true);
      // Clone materials for independent tinting
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material = child.material.clone();
        }
      });
      return clone;
    },
  };
}
