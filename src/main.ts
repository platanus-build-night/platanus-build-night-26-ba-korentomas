import { createScene } from './scene/createScene';
import { createCorridor, updateCorridor } from './scene/corridor';
import { createTorches, updateTorches } from './scene/torches';
import { createTitleText } from './scene/titleText';
import { createSubtitleText } from './scene/subtitleText';
import { setupComposer } from './postprocessing/setupComposer';

async function init() {
  const { scene, camera, renderer } = createScene();

  // Build corridor
  const corridorState = createCorridor(scene);

  // Add torches
  createTorches(scene, corridorState);

  // Load title and subtitle text
  await Promise.all([
    createTitleText(scene),
    createSubtitleText(scene),
  ]);

  // Post-processing
  const { composer, filmGrainPass } = setupComposer(renderer, scene, camera);

  // Animation loop
  let lastTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;
    const time = now / 1000;

    // Update corridor (moves camera forward)
    updateCorridor(corridorState, camera, delta);

    // Update torch flicker
    updateTorches(time);

    // Update film grain time
    filmGrainPass.uniforms['time'].value = time;

    // Render via composer
    composer.render();
  }

  animate();
}

init();
