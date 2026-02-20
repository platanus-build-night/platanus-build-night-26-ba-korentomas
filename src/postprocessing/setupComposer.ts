import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import {
  createFilmGrainPass,
  createCrtScanlinePass,
  createColorGradePass,
} from './retroShaderPass';

export interface ComposerContext {
  composer: EffectComposer;
  filmGrainPass: ReturnType<typeof createFilmGrainPass>;
}

export function setupComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): ComposerContext {
  const composer = new EffectComposer(renderer);

  // 1. Render pass
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // 2. Bloom
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.6,  // strength
    0.4,  // radius
    0.8   // threshold
  );
  composer.addPass(bloomPass);

  // 3. Film grain
  const filmGrainPass = createFilmGrainPass();
  composer.addPass(filmGrainPass);

  // 4. CRT scanlines + vignette
  const crtPass = createCrtScanlinePass();
  composer.addPass(crtPass);

  // 5. Color grade
  const colorGradePass = createColorGradePass();
  composer.addPass(colorGradePass);

  // Handle resize
  window.addEventListener('resize', () => {
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.resolution.set(window.innerWidth, window.innerHeight);
  });

  return { composer, filmGrainPass };
}
