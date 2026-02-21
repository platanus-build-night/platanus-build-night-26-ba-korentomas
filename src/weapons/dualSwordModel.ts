import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class DualSwordModel {
  private leftGroup: THREE.Group;
  private rightGroup: THREE.Group;
  private camera: THREE.PerspectiveCamera;
  private loader: GLTFLoader;
  private leftModel: THREE.Object3D | null = null;
  private rightModel: THREE.Object3D | null = null;
  private time = 0;
  private swingSide: 'left' | 'right' = 'right';
  public currentWeaponName = 'Dual Daggers';
  public currentWeaponId: number | null = null;

  // Idle positions (mirrored)
  private rightIdlePos = new THREE.Vector3(0.35, -0.35, -0.55);
  private rightIdleRot = new THREE.Euler(0, -Math.PI / 6, 0);
  private leftIdlePos = new THREE.Vector3(-0.35, -0.35, -0.55);
  private leftIdleRot = new THREE.Euler(0, Math.PI / 6, 0);

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.loader = new GLTFLoader();

    this.rightGroup = new THREE.Group();
    this.rightGroup.position.copy(this.rightIdlePos);
    this.rightGroup.rotation.copy(this.rightIdleRot);
    camera.add(this.rightGroup);

    this.leftGroup = new THREE.Group();
    this.leftGroup.position.copy(this.leftIdlePos);
    this.leftGroup.rotation.copy(this.leftIdleRot);
    camera.add(this.leftGroup);
  }

  async loadGLB(buffer: ArrayBuffer): Promise<void> {
    this.disposeModels();

    const gltf = await this.loader.parseAsync(buffer, './');
    const model = gltf.scene;

    // Scale (smaller than sword — daggers are compact)
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 0.35 / maxDim;  // slightly smaller than sword's 0.5
    model.scale.setScalar(scale);

    // Handle detection — bottom of bbox at grip
    box.setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const min = box.min;
    model.position.x = -center.x;
    model.position.z = -center.z;
    model.position.y = -min.y;

    // Right hand model
    this.rightModel = model;
    this.rightGroup.add(model);

    // Left hand model — clone and mirror
    const leftModel = model.clone();
    leftModel.scale.x *= -1;  // Mirror on X axis
    this.leftModel = leftModel;
    this.leftGroup.add(leftModel);
  }

  loadFallback(): void {
    this.disposeModels();

    // Right dagger
    const rightDagger = this.buildFallbackDagger();
    this.rightModel = rightDagger;
    this.rightGroup.add(rightDagger);

    // Left dagger (mirrored)
    const leftDagger = this.buildFallbackDagger();
    leftDagger.scale.x = -1;
    this.leftModel = leftDagger;
    this.leftGroup.add(leftDagger);
  }

  private buildFallbackDagger(): THREE.Group {
    const dagger = new THREE.Group();

    // Blade (shorter than sword)
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.3 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.015), bladeMat);
    blade.position.y = 0.22;
    dagger.add(blade);

    // Guard
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, metalness: 0.6, roughness: 0.4 });
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.03), guardMat);
    guard.position.y = 0.07;
    dagger.add(guard);

    // Grip
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.9 });
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.08, 8), gripMat);
    grip.position.y = 0.02;
    dagger.add(grip);

    return dagger;
  }

  startAttack(): void {
    this.swingSide = this.swingSide === 'left' ? 'right' : 'left';
  }

  getSwingSide(): 'left' | 'right' {
    return this.swingSide;
  }

  update(isAttacking: boolean, attackProgress: number, delta: number): void {
    this.time += delta;

    // Determine which group swings and which idles
    const swingGroup = this.swingSide === 'right' ? this.rightGroup : this.leftGroup;
    const idleGroup2 = this.swingSide === 'right' ? this.leftGroup : this.rightGroup;
    const swingIdlePos = this.swingSide === 'right' ? this.rightIdlePos : this.leftIdlePos;
    const swingIdleRot = this.swingSide === 'right' ? this.rightIdleRot : this.leftIdleRot;
    const otherIdlePos = this.swingSide === 'right' ? this.leftIdlePos : this.rightIdlePos;
    const otherIdleRot = this.swingSide === 'right' ? this.leftIdleRot : this.rightIdleRot;

    // Mirror factor for swing direction
    const mirrorX = this.swingSide === 'left' ? -1 : 1;

    if (isAttacking) {
      // Swing animation on active hand
      let t: number;
      if (attackProgress < 0.5) {
        t = attackProgress / 0.5;
      } else {
        t = 1 - (attackProgress - 0.5) / 0.5;
      }
      t = t * t * (3 - 2 * t); // smoothstep

      swingGroup.rotation.z = swingIdleRot.z - t * 0.8 * mirrorX;
      swingGroup.rotation.x = swingIdleRot.x - t * 0.3;
      swingGroup.position.z = swingIdlePos.z - t * 0.15;

      // Other hand idles
      const bobX = Math.sin(this.time * 1.5) * 0.005;
      const bobY = Math.sin(this.time * 2.0) * 0.003;
      idleGroup2.position.x = otherIdlePos.x + bobX;
      idleGroup2.position.y = otherIdlePos.y + bobY;
      idleGroup2.position.z = otherIdlePos.z;
      idleGroup2.rotation.copy(otherIdleRot);
    } else {
      // Both hands idle bob (slightly out of phase)
      const bobX = Math.sin(this.time * 1.5) * 0.005;
      const bobY = Math.sin(this.time * 2.0) * 0.003;

      this.rightGroup.position.x = this.rightIdlePos.x + bobX;
      this.rightGroup.position.y = this.rightIdlePos.y + bobY;
      this.rightGroup.position.z = this.rightIdlePos.z;
      this.rightGroup.rotation.copy(this.rightIdleRot);

      this.leftGroup.position.x = this.leftIdlePos.x - bobX;  // opposite phase
      this.leftGroup.position.y = this.leftIdlePos.y + bobY;
      this.leftGroup.position.z = this.leftIdlePos.z;
      this.leftGroup.rotation.copy(this.leftIdleRot);
    }
  }

  setVisible(visible: boolean): void {
    this.rightGroup.visible = visible;
    this.leftGroup.visible = visible;
  }

  dispose(): void {
    this.camera.remove(this.rightGroup);
    this.camera.remove(this.leftGroup);
    this.disposeModels();
  }

  private disposeModels(): void {
    this.disposeModel(this.rightModel, this.rightGroup);
    this.disposeModel(this.leftModel, this.leftGroup);
    this.rightModel = null;
    this.leftModel = null;
  }

  private disposeModel(model: THREE.Object3D | null, group: THREE.Group): void {
    if (!model) return;
    group.remove(model);
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m: THREE.Material) => m.dispose());
        } else if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  }
}
