import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function createModelViewer(container: HTMLElement) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f0f23);

  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 100);
  camera.position.set(0, 0.5, 2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2;

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(2, 3, 2);
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
  fillLight.position.set(-2, 1, -1);
  scene.add(fillLight);

  // Grid
  const grid = new THREE.GridHelper(4, 20, 0x333366, 0x222244);
  scene.add(grid);

  let currentModel: THREE.Group | null = null;
  const loader = new GLTFLoader();

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resizeObserver.observe(container);

  async function loadGLB(buffer: ArrayBuffer) {
    // Dispose old model
    if (currentModel) {
      scene.remove(currentModel);
      currentModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    const gltf = await loader.parseAsync(buffer, './');
    const model = gltf.scene;

    // Normalize: fit into unit sphere centered at origin
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1 / maxDim;

    model.position.sub(center);
    model.scale.setScalar(scale);

    // Wrap in a group so position offset stays clean
    const group = new THREE.Group();
    group.add(model);
    scene.add(group);
    currentModel = group;

    // Reset camera
    camera.position.set(0, 0.5, 2);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  return { loadGLB };
}
