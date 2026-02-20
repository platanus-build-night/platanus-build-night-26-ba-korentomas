import * as THREE from 'three';
import { CorridorSegment } from './corridor';

const CORRIDOR_WIDTH = 5;
const SEGMENT_LENGTH = 10;

interface Torch {
  light: THREE.PointLight;
  sprite: THREE.Sprite;
  baseIntensity: number;
  phaseOffset: number;
}

const torches: Torch[] = [];

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

  return new THREE.CanvasTexture(canvas);
}

export function createTorches(segments: CorridorSegment[]): void {
  const fireTexture = createFireTexture();

  // Shared geometries and materials for all torch meshes
  const bracketGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6);
  const bracketMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.7,
    metalness: 0.8,
  });
  const poleGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.5, 6);
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x4a3520,
    roughness: 0.9,
    metalness: 0.1,
  });
  const spriteMat = new THREE.SpriteMaterial({
    map: fireTexture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.9,
  });

  // Add a torch to each side of every segment, as children of the segment group
  for (const seg of segments) {
    for (const isLeft of [true, false]) {
      const x = isLeft ? -CORRIDOR_WIDTH / 2 + 0.1 : CORRIDOR_WIDTH / 2 - 0.1;
      const y = 3.0;
      const z = -SEGMENT_LENGTH / 2; // centered in segment (local coords)

      // Torch mesh
      const torchGroup = new THREE.Group();
      const bracket = new THREE.Mesh(bracketGeo, bracketMat);
      bracket.rotation.z = Math.PI / 2;
      torchGroup.add(bracket);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(isLeft ? 0.15 : -0.15, 0.15, 0);
      torchGroup.add(pole);
      torchGroup.position.set(x, y, z);
      seg.group.add(torchGroup);

      // Point light
      const lightX = isLeft ? x + 0.3 : x - 0.3;
      const light = new THREE.PointLight(0xff8830, 1.5, 15, 1.5);
      light.position.set(lightX, y + 0.4, z);
      seg.group.add(light);

      // Fire sprite
      const sprite = new THREE.Sprite(spriteMat.clone());
      sprite.scale.set(0.5, 0.6, 1);
      sprite.position.set(lightX, y + 0.35, z);
      seg.group.add(sprite);

      torches.push({
        light,
        sprite,
        baseIntensity: 1.2 + Math.random() * 0.6,
        phaseOffset: Math.random() * Math.PI * 2,
      });
    }
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

    const scale = 1 + flicker * 0.3;
    torch.sprite.scale.set(0.5 * scale, 0.6 * scale, 1);
  }
}
