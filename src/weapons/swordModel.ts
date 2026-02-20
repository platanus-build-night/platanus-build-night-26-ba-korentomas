import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class SwordModel {
  private group: THREE.Group;
  private camera: THREE.PerspectiveCamera;
  private loader: GLTFLoader;
  private model: THREE.Object3D | null = null;
  private idlePosition: THREE.Vector3;
  private idleRotation: THREE.Euler;
  private time = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.loader = new GLTFLoader();

    // Position in lower-right of FPS view
    this.idlePosition = new THREE.Vector3(0.4, -0.35, -0.6);
    this.idleRotation = new THREE.Euler(0, -Math.PI / 6, 0);

    this.group.position.copy(this.idlePosition);
    this.group.rotation.copy(this.idleRotation);
    camera.add(this.group);
  }

  async loadFromAPI(): Promise<void> {
    // Import dynamically to avoid bundling forge API in game
    const { listWeapons, getWeaponModel } = await import('../forge/api');
    const weapons = await listWeapons();
    const sword = weapons.find(w => w.name === 'basic_sword');
    if (!sword) throw new Error('basic_sword not found');
    const buffer = await getWeaponModel(sword.id);
    await this.loadGLB(buffer);
  }

  private async loadGLB(buffer: ArrayBuffer): Promise<void> {
    this.disposeModel();

    const gltf = await this.loader.parseAsync(buffer, './');
    const model = gltf.scene;

    // Normalize to fit sword size
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 0.5 / maxDim;
    model.scale.setScalar(scale);

    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center).multiplyScalar(scale);

    this.model = model;
    this.group.add(model);
  }

  loadFallback(): void {
    this.disposeModel();

    const fallback = new THREE.Group();

    // Blade
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.3 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.02), bladeMat);
    blade.position.y = 0.35;
    fallback.add(blade);

    // Guard
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, metalness: 0.6, roughness: 0.4 });
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.04), guardMat);
    guard.position.y = 0.1;
    fallback.add(guard);

    // Grip
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.9 });
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.12, 8), gripMat);
    grip.position.y = 0.02;
    fallback.add(grip);

    // Pommel
    const pommelMat = new THREE.MeshStandardMaterial({ color: 0xdaa520, metalness: 0.7, roughness: 0.3 });
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), pommelMat);
    pommel.position.y = -0.04;
    fallback.add(pommel);

    this.model = fallback;
    this.group.add(fallback);
  }

  update(isAttacking: boolean, attackProgress: number, delta: number): void {
    this.time += delta;

    if (isAttacking) {
      // Swing animation: 0->0.5 forward swing, 0.5->1 return
      let t: number;
      if (attackProgress < 0.5) {
        t = attackProgress / 0.5;
      } else {
        t = 1 - (attackProgress - 0.5) / 0.5;
      }
      // Smoothstep easing
      t = t * t * (3 - 2 * t);

      this.group.rotation.z = this.idleRotation.z - t * 0.8;
      this.group.rotation.x = this.idleRotation.x - t * 0.3;
      this.group.position.z = this.idlePosition.z - t * 0.15;
    } else {
      // Idle bob (subtle breathing sway)
      const bobX = Math.sin(this.time * 1.5) * 0.005;
      const bobY = Math.sin(this.time * 2.0) * 0.003;

      this.group.position.x = this.idlePosition.x + bobX;
      this.group.position.y = this.idlePosition.y + bobY;
      this.group.position.z = this.idlePosition.z;
      this.group.rotation.copy(this.idleRotation);
    }
  }

  dispose(): void {
    this.camera.remove(this.group);
    this.disposeModel();
  }

  private disposeModel(): void {
    if (!this.model) return;
    this.group.remove(this.model);
    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m: THREE.Material) => m.dispose());
        } else if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
    this.model = null;
  }
}
