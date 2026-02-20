import * as THREE from 'three';
import { CorridorState } from './corridor';

const TORCH_INTERVAL = 8;
const CORRIDOR_WIDTH = 5;

interface Torch {
  light: THREE.PointLight;
  sprite: THREE.Sprite;
  baseIntensity: number;
  phaseOffset: number;
}

let torches: Torch[] = [];
let fireTexture: THREE.Texture | null = null;

function createFireTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, 'rgba(255, 200, 50, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 120, 20, 0.8)');
  gradient.addColorStop(0.7, 'rgba(255, 60, 10, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 30, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function createTorchMesh(): THREE.Group {
  const group = new THREE.Group();

  // Bracket (small cylinder attached to wall)
  const bracketGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6);
  const bracketMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.7,
    metalness: 0.8,
  });
  const bracket = new THREE.Mesh(bracketGeo, bracketMat);
  bracket.rotation.z = Math.PI / 2;
  group.add(bracket);

  // Torch pole (vertical cylinder)
  const poleGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.5, 6);
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x4a3520,
    roughness: 0.9,
    metalness: 0.1,
  });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(0.15, 0.15, 0);
  group.add(pole);

  return group;
}

export function createTorches(
  scene: THREE.Scene,
  corridorState: CorridorState
): void {
  fireTexture = createFireTexture();

  const totalLength = corridorState.segments.length * 10;
  const numTorches = Math.floor(totalLength / TORCH_INTERVAL) * 2;

  for (let i = 0; i < numTorches; i++) {
    const pairIndex = Math.floor(i / 2);
    const isLeft = i % 2 === 0;
    const z = -pairIndex * TORCH_INTERVAL - 4; // offset slightly

    const x = isLeft ? -CORRIDOR_WIDTH / 2 + 0.1 : CORRIDOR_WIDTH / 2 - 0.1;
    const y = 3.0;

    // Torch mesh
    const torchMesh = createTorchMesh();
    if (!isLeft) torchMesh.scale.x = -1;
    torchMesh.position.set(x, y, z);
    scene.add(torchMesh);

    // Point light
    const light = new THREE.PointLight(0xff8830, 1.5, 15, 1.5);
    light.position.set(
      isLeft ? x + 0.3 : x - 0.3,
      y + 0.4,
      z
    );
    scene.add(light);

    // Fire sprite
    const spriteMat = new THREE.SpriteMaterial({
      map: fireTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.9,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(0.5, 0.6, 1);
    sprite.position.copy(light.position);
    sprite.position.y -= 0.05;
    scene.add(sprite);

    torches.push({
      light,
      sprite,
      baseIntensity: 1.2 + Math.random() * 0.6,
      phaseOffset: Math.random() * Math.PI * 2,
    });
  }
}

export function updateTorches(time: number): void {
  for (const torch of torches) {
    const flicker =
      Math.sin(time * 8 + torch.phaseOffset) * 0.15 +
      Math.sin(time * 13 + torch.phaseOffset * 2.3) * 0.1 +
      Math.sin(time * 21 + torch.phaseOffset * 0.7) * 0.05 +
      (Math.random() - 0.5) * 0.15;

    torch.light.intensity = torch.baseIntensity + flicker;

    // Scale sprite slightly with flicker
    const scale = 1 + flicker * 0.3;
    torch.sprite.scale.set(0.5 * scale, 0.6 * scale, 1);
  }
}
