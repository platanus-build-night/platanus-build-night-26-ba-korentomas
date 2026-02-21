/**
 * Shared 3D overlay utilities for camera-attached UI elements.
 *
 * All overlay text/buttons are added to the camera (not scene) so they
 * stay fixed on screen. At z=-7 with FOV 70, the visible area is
 * roughly 9.8 units tall x 8.7 units wide (16:9).
 */

import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { getFont } from '../utils/fontLoader';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TextMeshResult {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  geometry: THREE.BufferGeometry;
}

export interface ButtonResult {
  mesh: THREE.Mesh;
  hitArea: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  geometry: THREE.BufferGeometry;
  label: string;
}

export interface OverlayTextOptions {
  font?: string;
  size?: number;
  depth?: number;
  color?: number;
  emissive?: number;
  emissiveIntensity?: number;
  align?: 'center' | 'left' | 'right';
  renderOrder?: number;
  letterSpacing?: number;
}

/* ------------------------------------------------------------------ */
/*  Backdrop                                                           */
/* ------------------------------------------------------------------ */

/** Full-screen darkening plane behind all UI text. */
export function createOverlayBackdrop(
  opacity = 0.7,
  color = 0x000000,
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(16, 12);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 0, -7.5);
  mesh.renderOrder = 997;
  // Prevent raycasts from hitting the backdrop
  mesh.raycast = () => {};
  return mesh;
}

/* ------------------------------------------------------------------ */
/*  Text                                                               */
/* ------------------------------------------------------------------ */

/** Create a camera-attached 3D text mesh. */
export async function createOverlayText(
  text: string,
  options: OverlayTextOptions = {},
): Promise<TextMeshResult> {
  const {
    font: fontName = 'Gentilis',
    size = 0.5,
    depth = 0.05,
    color = 0xdaa520,
    emissive = 0xcc7700,
    emissiveIntensity = 2.4,
    align = 'center',
    renderOrder = 999,
    letterSpacing = 0,
  } = options;

  const font = await getFont(fontName);

  const geometry = new TextGeometry(text, {
    font,
    size,
    depth,
    curveSegments: 4,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.01,
    bevelSegments: 2,
  });

  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;

  // Apply letter spacing
  if (letterSpacing !== 0) {
    const textWidth = bbox.max.x - bbox.min.x;
    const centerX = textWidth / 2;
    const posAttr = geometry.getAttribute('position');
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const t = (x - centerX) / (textWidth || 1);
      posAttr.setX(i, x + t * letterSpacing * textWidth);
    }
    geometry.computeBoundingBox();
  }

  // Alignment
  geometry.computeBoundingBox();
  const finalBbox = geometry.boundingBox!;
  if (align === 'center') {
    const offsetX = (finalBbox.max.x + finalBbox.min.x) / 2;
    const offsetY = (finalBbox.max.y + finalBbox.min.y) / 2;
    geometry.translate(-offsetX, -offsetY, 0);
  } else if (align === 'right') {
    geometry.translate(-finalBbox.max.x, 0, 0);
  }

  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    roughness: 0.7,
    metalness: 0.45,
    toneMapped: false,
    depthTest: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = renderOrder;

  return { mesh, material, geometry };
}

/* ------------------------------------------------------------------ */
/*  Button (text + invisible hit area)                                 */
/* ------------------------------------------------------------------ */

/** Create an interactive 3D text button with an invisible hit area. */
export async function createOverlayButton(
  label: string,
  options: OverlayTextOptions = {},
): Promise<ButtonResult> {
  const { mesh, material, geometry } = await createOverlayText(label, options);

  // Invisible hit area sized to text bounds + padding
  mesh.geometry.computeBoundingBox();
  const bbox = mesh.geometry.boundingBox!;
  const w = (bbox.max.x - bbox.min.x) + 0.6;
  const h = (bbox.max.y - bbox.min.y) + 0.4;

  const hitGeo = new THREE.PlaneGeometry(1, 1);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false, depthTest: false });
  const hitArea = new THREE.Mesh(hitGeo, hitMat);
  hitArea.renderOrder = 998;
  hitArea.scale.set(w, h, 1);
  hitArea.position.set(
    (bbox.max.x + bbox.min.x) / 2,
    (bbox.max.y + bbox.min.y) / 2,
    0.01,
  );
  mesh.add(hitArea);

  return { mesh, hitArea, material, geometry, label };
}

/* ------------------------------------------------------------------ */
/*  UI Light                                                           */
/* ------------------------------------------------------------------ */

/**
 * Create a PointLight for camera-attached UI meshes.
 *
 * MeshStandardMaterial needs light to show its diffuse color. Scene
 * lights don't reach camera-space meshes at z=-7, so we attach a
 * dedicated PointLight to the camera. Position it at the UI plane
 * so it illuminates text and frames evenly.
 */
export function createOverlayLight(): THREE.PointLight {
  const light = new THREE.PointLight(0xffeedd, 2.5, 20);
  light.position.set(0, 0, -5);
  return light;
}

/* ------------------------------------------------------------------ */
/*  Dispose helper                                                     */
/* ------------------------------------------------------------------ */

/** Dispose a list of overlay objects (geometry + material + remove from parent). */
export function disposeOverlayObjects(
  objects: Array<{
    geometry?: THREE.BufferGeometry;
    material?: THREE.Material;
    mesh?: THREE.Object3D;
  }>,
): void {
  for (const obj of objects) {
    obj.geometry?.dispose();
    obj.material?.dispose();
    if (obj.mesh?.parent) {
      obj.mesh.parent.remove(obj.mesh);
    }
  }
}
