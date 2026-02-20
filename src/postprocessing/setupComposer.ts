import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { createRetroPass } from './retroShaderPass';

export interface ComposerContext {
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
  retroPass: ShaderPass;
}

export function setupComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): ComposerContext {
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
    0.6,  // strength
    0.5,  // radius
    0.6   // threshold
  );
  composer.addPass(bloomPass);

  const retroPass = createRetroPass();
  composer.addPass(retroPass);

  window.addEventListener('resize', () => {
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.setPixelRatio(renderer.getPixelRatio());
    bloomPass.resolution.set(window.innerWidth / 2, window.innerHeight / 2);
  });

  return { composer, bloomPass, retroPass };
}
