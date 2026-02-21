/**
 * 3D Loading Screen — camera-attached TextGeometry overlay.
 *
 * Replaces the DOM-based loading text with Three.js 3D text that
 * renders through the existing EffectComposer pipeline.
 */

import * as THREE from 'three';
import { createOverlayText, type TextMeshResult } from './overlay3d';

/* ------------------------------------------------------------------ */
/*  Module state                                                       */
/* ------------------------------------------------------------------ */

let currentText: TextMeshResult | null = null;

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Show a loading message as camera-attached 3D text.
 * Disposes any previously shown loading text before creating new.
 */
export async function showLoadingText3D(
  camera: THREE.PerspectiveCamera,
  message: string,
): Promise<void> {
  // Dispose previous if any
  if (currentText) {
    camera.remove(currentText.mesh);
    currentText.geometry.dispose();
    currentText.material.dispose();
    currentText = null;
  }

  const result = await createOverlayText(message, {
    size: 0.5,
    color: 0xdaa520,
    emissive: 0xcc7700,
    emissiveIntensity: 2.4,
  });

  result.mesh.position.set(0, 0, -7);
  currentText = result;
  camera.add(result.mesh);
}

/**
 * Remove the loading text from the camera and dispose resources.
 */
export function hideLoadingText3D(camera: THREE.PerspectiveCamera): void {
  if (!currentText) return;
  camera.remove(currentText.mesh);
  currentText.geometry.dispose();
  currentText.material.dispose();
  currentText = null;
}
