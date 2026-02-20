import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { loadFont } from '../utils/fontLoader';

export async function createTitleText(scene: THREE.Scene): Promise<THREE.Mesh> {
  const font = await loadFont('/fonts/droid_serif_bold.typeface.json');

  const geometry = new TextGeometry('DungeonSlopper', {
    font: font as Font,
    size: 1.2,
    depth: 0.4,
    curveSegments: 6,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.03,
    bevelSegments: 3,
  });

  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  const textWidth = bbox.max.x - bbox.min.x;
  const centerX = textWidth / 2;

  // Arch the text: bend vertices into a circular arc
  const posAttr = geometry.getAttribute('position');
  const archRadius = 8;

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);

    // Normalize x to [-0.5, 0.5] range across text width
    const t = (x - centerX) / textWidth; // -0.5 to 0.5
    const angle = t * 0.6; // arc span in radians

    // Map to arch
    const newX = Math.sin(angle) * (archRadius + z);
    const newY = y + (Math.cos(angle) - 1) * archRadius * 0.15;
    const newZ = -Math.cos(angle) * (archRadius + z) + archRadius;

    posAttr.setXYZ(i, newX, newY, newZ);
  }

  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0xdaa520,
    emissive: 0x442200,
    emissiveIntensity: 0.4,
    roughness: 0.3,
    metalness: 0.8,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 3.8, -18);
  scene.add(mesh);

  // Dedicated light for the title
  const titleLight = new THREE.PointLight(0xffcc66, 2, 20);
  titleLight.position.set(0, 4.5, -16);
  scene.add(titleLight);

  return mesh;
}
