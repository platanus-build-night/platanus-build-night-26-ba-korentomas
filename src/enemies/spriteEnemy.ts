import * as THREE from 'three';

const ENEMY_HEIGHT = 1.7;

export async function createSpriteEnemyModel(imageDataUrl: string): Promise<() => THREE.Group> {
  // Load texture from data URL
  const loader = new THREE.TextureLoader();
  const texture = await loader.loadAsync(imageDataUrl);

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const aspect = texture.image.width / texture.image.height;
  const width = ENEMY_HEIGHT * aspect;

  const geometry = new THREE.PlaneGeometry(width, ENEMY_HEIGHT);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide,
  });

  // Factory that clones geometry/material for each enemy instance
  return () => {
    const mesh = new THREE.Mesh(geometry.clone(), material.clone());
    mesh.position.y = ENEMY_HEIGHT / 2;
    const group = new THREE.Group();
    group.add(mesh);
    return group;
  };
}
