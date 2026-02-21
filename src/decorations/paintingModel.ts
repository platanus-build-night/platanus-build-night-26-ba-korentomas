import * as THREE from 'three';

export interface PaintingFrameSize {
  name: string;
  innerWidth: number;
  innerHeight: number;
}

export const FRAME_SIZES: PaintingFrameSize[] = [
  { name: 'small-portrait', innerWidth: 0.4, innerHeight: 0.6 },
  { name: 'medium-landscape', innerWidth: 0.8, innerHeight: 0.5 },
  { name: 'large-square', innerWidth: 0.7, innerHeight: 0.7 },
  { name: 'tall-banner', innerWidth: 0.3, innerHeight: 0.9 },
];

// Shared frame material (lazy singleton)
let frameMaterial: THREE.MeshStandardMaterial | null = null;
function getFrameMaterial(): THREE.MeshStandardMaterial {
  if (!frameMaterial) {
    frameMaterial = new THREE.MeshStandardMaterial({ color: 0x3a2210, roughness: 0.8 });
  }
  return frameMaterial;
}

const FRAME_THICKNESS = 0.04;
const FRAME_DEPTH = 0.03;

export async function createPaintingModel(
  imageDataUrl: string,
  frameSize: PaintingFrameSize,
): Promise<THREE.Group> {
  const loader = new THREE.TextureLoader();
  const texture = await loader.loadAsync(imageDataUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const group = new THREE.Group();
  const { innerWidth, innerHeight } = frameSize;

  // Canvas plane (the painting itself)
  const canvasGeo = new THREE.PlaneGeometry(innerWidth, innerHeight);
  const canvasMat = new THREE.MeshBasicMaterial({ map: texture });
  const canvas = new THREE.Mesh(canvasGeo, canvasMat);
  canvas.position.z = 0.01; // slightly off wall
  group.add(canvas);

  // Frame border — 4 bars
  const mat = getFrameMaterial();

  // Top bar
  const topGeo = new THREE.BoxGeometry(innerWidth + FRAME_THICKNESS * 2, FRAME_THICKNESS, FRAME_DEPTH);
  const top = new THREE.Mesh(topGeo, mat);
  top.position.set(0, innerHeight / 2 + FRAME_THICKNESS / 2, 0);
  group.add(top);

  // Bottom bar
  const bottomGeo = new THREE.BoxGeometry(innerWidth + FRAME_THICKNESS * 2, FRAME_THICKNESS, FRAME_DEPTH);
  const bottom = new THREE.Mesh(bottomGeo, mat);
  bottom.position.set(0, -(innerHeight / 2 + FRAME_THICKNESS / 2), 0);
  group.add(bottom);

  // Left bar
  const leftGeo = new THREE.BoxGeometry(FRAME_THICKNESS, innerHeight, FRAME_DEPTH);
  const left = new THREE.Mesh(leftGeo, mat);
  left.position.set(-(innerWidth / 2 + FRAME_THICKNESS / 2), 0, 0);
  group.add(left);

  // Right bar
  const rightGeo = new THREE.BoxGeometry(FRAME_THICKNESS, innerHeight, FRAME_DEPTH);
  const right = new THREE.Mesh(rightGeo, mat);
  right.position.set(innerWidth / 2 + FRAME_THICKNESS / 2, 0, 0);
  group.add(right);

  return group;
}

export function disposePaintingShared(): void {
  if (frameMaterial) {
    frameMaterial.dispose();
    frameMaterial = null;
  }
}
