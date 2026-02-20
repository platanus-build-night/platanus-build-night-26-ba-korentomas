import * as THREE from 'three';
import {
  createBrickTexture,
  createStoneFloorTexture,
  createCeilingTexture,
} from '../utils/proceduralTextures';

const SEGMENT_LENGTH = 10;
const POOL_SIZE = 20;
const CORRIDOR_WIDTH = 5;
const CORRIDOR_HEIGHT = 5;
const CAMERA_SPEED = 2;
const SWAY_AMPLITUDE = 0.15;
const SWAY_FREQ = 0.3;

export interface CorridorSegment {
  group: THREE.Group;
  zStart: number;
}

export interface CorridorState {
  segments: CorridorSegment[];
  cameraZ: number;
}

export function createCorridor(scene: THREE.Scene): CorridorState {
  const brickTex = createBrickTexture();
  const floorTex = createStoneFloorTexture();
  const ceilTex = createCeilingTexture();

  brickTex.repeat.set(2, 1);
  floorTex.repeat.set(2, 2);
  ceilTex.repeat.set(2, 2);

  const wallMat = new THREE.MeshStandardMaterial({
    map: brickTex,
    roughness: 0.9,
    metalness: 0.0,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.85,
    metalness: 0.05,
  });
  const ceilMat = new THREE.MeshStandardMaterial({
    map: ceilTex,
    roughness: 1.0,
    metalness: 0.0,
  });

  const wallGeo = new THREE.PlaneGeometry(SEGMENT_LENGTH, CORRIDOR_HEIGHT);
  const floorGeo = new THREE.PlaneGeometry(CORRIDOR_WIDTH, SEGMENT_LENGTH);
  const ceilGeo = new THREE.PlaneGeometry(CORRIDOR_WIDTH, SEGMENT_LENGTH);

  const segments: CorridorSegment[] = [];

  for (let i = 0; i < POOL_SIZE; i++) {
    const group = new THREE.Group();
    const zStart = -i * SEGMENT_LENGTH;

    // Left wall
    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.position.set(-CORRIDOR_WIDTH / 2, CORRIDOR_HEIGHT / 2, -SEGMENT_LENGTH / 2);
    leftWall.rotation.y = Math.PI / 2;
    group.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.position.set(CORRIDOR_WIDTH / 2, CORRIDOR_HEIGHT / 2, -SEGMENT_LENGTH / 2);
    rightWall.rotation.y = -Math.PI / 2;
    group.add(rightWall);

    // Floor
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -SEGMENT_LENGTH / 2);
    group.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, CORRIDOR_HEIGHT, -SEGMENT_LENGTH / 2);
    group.add(ceiling);

    group.position.z = zStart;
    scene.add(group);
    segments.push({ group, zStart });
  }

  return { segments, cameraZ: 0 };
}

export function updateCorridor(
  state: CorridorState,
  camera: THREE.PerspectiveCamera,
  delta: number
): void {
  state.cameraZ -= CAMERA_SPEED * delta;
  camera.position.z = state.cameraZ;

  // Subtle sway
  const time = performance.now() / 1000;
  camera.position.x = Math.sin(time * SWAY_FREQ) * SWAY_AMPLITUDE;
  camera.position.y = 2.5 + Math.sin(time * SWAY_FREQ * 1.3) * 0.05;
  camera.rotation.z = Math.sin(time * SWAY_FREQ * 0.7) * 0.008;

  // Recycle segments that are behind the camera
  const recycleThreshold = state.cameraZ + SEGMENT_LENGTH;
  let furthestZ = state.cameraZ;
  for (const seg of state.segments) {
    if (seg.zStart + SEGMENT_LENGTH < furthestZ) {
      furthestZ = seg.zStart;
    }
  }
  // Find the furthest segment ahead
  let mostAheadZ = state.cameraZ;
  for (const seg of state.segments) {
    if (seg.zStart < mostAheadZ) {
      mostAheadZ = seg.zStart;
    }
  }

  for (const seg of state.segments) {
    if (seg.zStart > recycleThreshold) {
      // Move this segment to the front
      seg.zStart = mostAheadZ - SEGMENT_LENGTH;
      seg.group.position.z = seg.zStart;
      mostAheadZ = seg.zStart;
    }
  }
}
