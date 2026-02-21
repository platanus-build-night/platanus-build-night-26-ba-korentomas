import * as THREE from 'three';
import type { LootType } from './decorationPlacer';

export interface BreakableDecoration {
  mesh: THREE.Object3D; // the original decoration mesh in the scene
  worldX: number;
  worldZ: number;
  health: number; // how many hits to break (1 for urns, 2 for crates/barrels, 3 for chests)
  lootType?: LootType; // what drops when broken
}

export interface BreakResult {
  worldX: number;
  worldZ: number;
  lootType?: LootType;
}

interface Fragment {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  lifetime: number;
  age: number;
}

// Shared fragment geometry pool (3-4 box sizes, reused across all fragments)
let fragmentGeoPool: THREE.BoxGeometry[] | null = null;

function ensureFragmentGeo(): THREE.BoxGeometry[] {
  if (!fragmentGeoPool) {
    fragmentGeoPool = [
      new THREE.BoxGeometry(0.05, 0.05, 0.05),
      new THREE.BoxGeometry(0.08, 0.06, 0.07),
      new THREE.BoxGeometry(0.12, 0.08, 0.1),
      new THREE.BoxGeometry(0.15, 0.1, 0.12),
    ];
  }
  return fragmentGeoPool;
}

/** Max total fragments to prevent performance issues */
const MAX_FRAGMENTS = 50;

/** Fragment fade start time (seconds) */
const FADE_START = 1.5;

/** Fragment removal time (seconds) */
const FADE_END = 2.5;

/** Gravity acceleration */
const GRAVITY = 15;

/** Bounce damping factor */
const BOUNCE_FACTOR = 0.3;

export class BreakableSystem {
  private breakables: BreakableDecoration[] = [];
  private fragments: Fragment[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Register a placed decoration as breakable */
  register(decoration: BreakableDecoration): void {
    this.breakables.push(decoration);
  }

  /** Clear all breakables (on floor change) */
  clear(): void {
    this.breakables.length = 0;
    // Remove and dispose all fragments
    for (const frag of this.fragments) {
      if (frag.mesh.parent) frag.mesh.parent.remove(frag.mesh);
      // Don't dispose geometry — it comes from the shared pool
      if (frag.mesh.material instanceof THREE.Material) {
        frag.mesh.material.dispose();
      }
    }
    this.fragments.length = 0;
  }

  /**
   * Check if a player attack hits any breakable, apply damage.
   * Uses a simple line-segment vs circle test in the XZ plane.
   * Returns a BreakResult if a decoration was destroyed, null otherwise.
   */
  checkHit(
    attackOriginX: number,
    attackOriginZ: number,
    attackDirX: number,
    attackDirZ: number,
    range: number,
  ): BreakResult | null {
    // Normalize attack direction
    const dirLen = Math.sqrt(attackDirX * attackDirX + attackDirZ * attackDirZ);
    if (dirLen === 0) return null;
    const ndx = attackDirX / dirLen;
    const ndz = attackDirZ / dirLen;

    // Attack endpoint
    const endX = attackOriginX + ndx * range;
    const endZ = attackOriginZ + ndz * range;

    let closestDist = Infinity;
    let hitIndex = -1;

    for (let i = 0; i < this.breakables.length; i++) {
      const b = this.breakables[i];
      const hitRadius = 0.6; // collision radius for decorations

      // Point-to-line-segment distance in XZ
      const dist = pointToSegmentDist(
        b.worldX, b.worldZ,
        attackOriginX, attackOriginZ,
        endX, endZ,
      );

      if (dist < hitRadius && dist < closestDist) {
        closestDist = dist;
        hitIndex = i;
      }
    }

    if (hitIndex < 0) return null;

    const hit = this.breakables[hitIndex];
    hit.health--;

    if (hit.health <= 0) {
      // Decoration destroyed
      const result = this.breakDecoration(hit);
      this.breakables.splice(hitIndex, 1);
      return result;
    }

    // Still alive — visual feedback: brief shake could be added by caller
    return null;
  }

  /** Called when a breakable's health reaches 0 */
  private breakDecoration(breakable: BreakableDecoration): BreakResult {
    // 1. Remove original mesh from scene
    if (breakable.mesh.parent) {
      breakable.mesh.parent.remove(breakable.mesh);
    }

    // 2. Determine fragment color from the original mesh
    const fragmentColor = this.extractColor(breakable.mesh);

    // 3. Spawn 5-8 small box fragments at the decoration's position
    const fragCount = 5 + Math.floor(Math.random() * 4);
    const geoPool = ensureFragmentGeo();

    for (let i = 0; i < fragCount; i++) {
      // Enforce max fragment cap — remove oldest if at limit
      if (this.fragments.length >= MAX_FRAGMENTS) {
        const oldest = this.fragments.shift()!;
        if (oldest.mesh.parent) oldest.mesh.parent.remove(oldest.mesh);
        if (oldest.mesh.material instanceof THREE.Material) {
          oldest.mesh.material.dispose();
        }
      }

      const geo = geoPool[Math.floor(Math.random() * geoPool.length)];
      const mat = new THREE.MeshBasicMaterial({
        color: fragmentColor,
        transparent: true,
        opacity: 1,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        breakable.worldX + (Math.random() - 0.5) * 0.3,
        0.3 + Math.random() * 0.3, // start around center height of decoration
        breakable.worldZ + (Math.random() - 0.5) * 0.3,
      );

      // Random rotation for initial variety
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );

      // Random velocity: outward XZ + upward Y
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        3 + Math.random() * 3, // upward
        Math.sin(angle) * speed,
      );

      this.scene.add(mesh);
      this.fragments.push({
        mesh,
        velocity,
        lifetime: FADE_END,
        age: 0,
      });
    }

    // 4. Return break result with loot info
    return {
      worldX: breakable.worldX,
      worldZ: breakable.worldZ,
      lootType: breakable.lootType,
    };
  }

  /** Extract a color from the first MeshStandardMaterial found in an Object3D hierarchy */
  private extractColor(obj: THREE.Object3D): number {
    let color = 0x8b5a2b; // default brown fallback
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        color = child.material.color.getHex();
      }
    });
    return color;
  }

  /** Update fragment physics each frame */
  update(delta: number): void {
    // Clamp delta to prevent huge jumps
    const dt = Math.min(delta, 0.05);

    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const frag = this.fragments[i];
      frag.age += dt;

      // Remove expired fragments
      if (frag.age > frag.lifetime) {
        if (frag.mesh.parent) frag.mesh.parent.remove(frag.mesh);
        if (frag.mesh.material instanceof THREE.Material) {
          frag.mesh.material.dispose();
        }
        this.fragments.splice(i, 1);
        continue;
      }

      // Apply gravity
      frag.velocity.y -= GRAVITY * dt;

      // Move by velocity
      frag.mesh.position.x += frag.velocity.x * dt;
      frag.mesh.position.y += frag.velocity.y * dt;
      frag.mesh.position.z += frag.velocity.z * dt;

      // Ground collision / bounce
      if (frag.mesh.position.y < 0.03) {
        frag.mesh.position.y = 0.03;
        frag.velocity.y = -frag.velocity.y * BOUNCE_FACTOR;
        // Dampen horizontal velocity on bounce
        frag.velocity.x *= 0.7;
        frag.velocity.z *= 0.7;
      }

      // Tumble rotation
      frag.mesh.rotation.x += dt * 5 * (Math.random() > 0.5 ? 1 : -1);
      frag.mesh.rotation.z += dt * 3 * (Math.random() > 0.5 ? 1 : -1);

      // Fade out
      if (frag.age > FADE_START) {
        const fadeProgress = (frag.age - FADE_START) / (FADE_END - FADE_START);
        if (frag.mesh.material instanceof THREE.MeshBasicMaterial) {
          frag.mesh.material.opacity = Math.max(0, 1 - fadeProgress);
        }
      }
    }
  }

  /** Get number of active breakables */
  get count(): number {
    return this.breakables.length;
  }

  /** Get number of active fragments (for debugging) */
  get fragmentCount(): number {
    return this.fragments.length;
  }

  /**
   * Spawn fragment explosion at an arbitrary world position.
   * Used for enemy death effects and anything else that should burst into pieces.
   */
  spawnFragmentsAt(worldX: number, worldZ: number, color: number, count: number = 6, height: number = 1.0): void {
    const geoPool = ensureFragmentGeo();
    for (let i = 0; i < count; i++) {
      if (this.fragments.length >= MAX_FRAGMENTS) {
        const oldest = this.fragments.shift()!;
        if (oldest.mesh.parent) oldest.mesh.parent.remove(oldest.mesh);
        if (oldest.mesh.material instanceof THREE.Material) {
          oldest.mesh.material.dispose();
        }
      }

      const geo = geoPool[Math.floor(Math.random() * geoPool.length)];
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        worldX + (Math.random() - 0.5) * 0.5,
        height * 0.3 + Math.random() * height * 0.5,
        worldZ + (Math.random() - 0.5) * 0.5,
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        4 + Math.random() * 3,
        Math.sin(angle) * speed,
      );

      this.scene.add(mesh);
      this.fragments.push({ mesh, velocity, lifetime: FADE_END, age: 0 });
    }
  }

  /** Dispose all resources */
  dispose(): void {
    this.clear();

    // Dispose shared fragment geometry pool
    if (fragmentGeoPool) {
      for (const geo of fragmentGeoPool) {
        geo.dispose();
      }
      fragmentGeoPool = null;
    }
  }
}

/**
 * Compute minimum distance from point (px, pz) to line segment (ax, az)-(bx, bz).
 * Used for attack hit detection in the XZ plane.
 */
function pointToSegmentDist(
  px: number, pz: number,
  ax: number, az: number,
  bx: number, bz: number,
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;

  if (lenSq === 0) {
    // Segment is a point
    const ex = px - ax;
    const ez = pz - az;
    return Math.sqrt(ex * ex + ez * ez);
  }

  // Project point onto segment, clamped to [0, 1]
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = ax + t * dx;
  const closestZ = az + t * dz;
  const ex = px - closestX;
  const ez = pz - closestZ;

  return Math.sqrt(ex * ex + ez * ez);
}
