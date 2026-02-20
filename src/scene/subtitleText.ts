import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { loadFont } from '../utils/fontLoader';

export async function createSubtitleText(scene: THREE.Scene): Promise<THREE.Mesh> {
  const font = await loadFont('/fonts/droid_serif_bold.typeface.json');

  const geometry = new TextGeometry('Coming Soon', {
    font: font as Font,
    size: 0.5,
    depth: 0.1,
    curveSegments: 4,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.01,
    bevelSegments: 2,
  });

  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  const textWidth = bbox.max.x - bbox.min.x;

  const material = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.8,
    metalness: 0.2,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(-textWidth / 2, 2.2, -17.5);
  scene.add(mesh);

  return mesh;
}
