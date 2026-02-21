import * as THREE from 'three';

export interface EnemyModel {
  group: THREE.Group;
  dispose: () => void;
}

const ENEMY_HEIGHT = 1.7; // units tall in the corridor

export function loadEnemySprite(imageDataUrl: string): Promise<EnemyModel> {
  return new Promise((resolve, reject) => {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      imageDataUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        // Calculate aspect ratio from texture dimensions
        const aspect = texture.image.width / texture.image.height;
        const width = ENEMY_HEIGHT * aspect;

        const geometry = new THREE.PlaneGeometry(width, ENEMY_HEIGHT);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          alphaTest: 0.1,
          side: THREE.DoubleSide,
          depthWrite: true,
        });

        const mesh = new THREE.Mesh(geometry, material);
        // Raise so feet touch the floor (y=0 is corridor floor level)
        mesh.position.y = ENEMY_HEIGHT / 2;

        const group = new THREE.Group();
        group.add(mesh);

        function dispose(): void {
          geometry.dispose();
          material.dispose();
          texture.dispose();
        }

        resolve({ group, dispose });
      },
      undefined,
      reject,
    );
  });
}
