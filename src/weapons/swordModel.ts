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
  private lastSwayX = 0;
  private lastSwayY = 0;
  public currentWeaponName = 'Default Sword';
  public currentWeaponId: number | null = null;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.loader = new GLTFLoader();

    // Position in lower-right of FPS view — blade angled forward and slightly tilted
    this.idlePosition = new THREE.Vector3(0.38, -0.38, -0.55);
    this.idleRotation = new THREE.Euler(-0.15, -Math.PI / 5, -0.05);

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

  async loadGLB(buffer: ArrayBuffer): Promise<void> {
    this.disposeModel();

    const gltf = await this.loader.parseAsync(buffer, './');
    const model = gltf.scene;

    // Scale to fit weapon size — slightly larger for better FPS presence
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 0.55 / maxDim;
    model.scale.setScalar(scale);

    // Re-compute box after scaling
    box.setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const min = box.min;

    // Position so bottom of bounding box (handle) aligns with grip point (origin)
    // Blade points up, handle at the bottom
    model.position.x = -center.x;
    model.position.z = -center.z;
    model.position.y = -min.y;

    // Tilt the model slightly forward so the blade points ahead in FPS view
    model.rotation.x = -0.2;

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
      // Diagonal slash: wind up, slash across, recover
      let t: number;
      if (attackProgress < 0.15) {
        // Wind-up phase (pull back slightly)
        t = -(attackProgress / 0.15) * 0.15;
      } else if (attackProgress < 0.55) {
        // Forward slash (fast)
        const p = (attackProgress - 0.15) / 0.4;
        t = -0.15 + p * 1.15; // from -0.15 to 1.0
      } else {
        // Recovery (ease back to idle)
        const p = (attackProgress - 0.55) / 0.45;
        t = 1.0 - p; // 1.0 back to 0
      }
      // Smoothstep easing on the main slash
      const st = Math.abs(t);
      const eased = st * st * (3 - 2 * st) * Math.sign(t);

      // Diagonal slash motion — sweeps from upper-right to lower-left
      this.group.rotation.z = this.idleRotation.z - eased * 1.0;
      this.group.rotation.x = this.idleRotation.x - eased * 0.4;
      this.group.rotation.y = this.idleRotation.y + eased * 0.25;
      this.group.position.z = this.idlePosition.z - eased * 0.12;
      this.group.position.x = this.idlePosition.x - eased * 0.08;
      this.group.position.y = this.idlePosition.y + eased * 0.05;
    } else {
      // Idle sway — multi-frequency for organic feel
      // Primary breathing rhythm
      const breathX = Math.sin(this.time * 1.2) * 0.006;
      const breathY = Math.sin(this.time * 1.8) * 0.004;
      // Secondary micro-sway (higher frequency, lower amplitude)
      const microX = Math.sin(this.time * 3.1 + 0.7) * 0.002;
      const microY = Math.cos(this.time * 2.7 + 1.3) * 0.0015;
      // Combine
      const targetSwayX = breathX + microX;
      const targetSwayY = breathY + microY;

      // Smooth interpolation for fluid feel
      const smoothing = 1.0 - Math.exp(-8 * delta);
      this.lastSwayX += (targetSwayX - this.lastSwayX) * smoothing;
      this.lastSwayY += (targetSwayY - this.lastSwayY) * smoothing;

      this.group.position.x = this.idlePosition.x + this.lastSwayX;
      this.group.position.y = this.idlePosition.y + this.lastSwayY;
      this.group.position.z = this.idlePosition.z;

      // Subtle rotational sway (weapon tilts slightly with breathing)
      const rotSway = Math.sin(this.time * 1.2) * 0.008;
      this.group.rotation.x = this.idleRotation.x;
      this.group.rotation.y = this.idleRotation.y + rotSway;
      this.group.rotation.z = this.idleRotation.z + rotSway * 0.5;
    }
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
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
