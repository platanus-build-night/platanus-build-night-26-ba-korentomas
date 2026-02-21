import * as THREE from 'three';
import type { ProjectileType } from './projectileTypes';
import { createProjectileMesh, isSprite, disposeProjectileShared } from './projectileModels';
import { CellType } from '../dungeon/types';

export interface CombatTarget {
  position: THREE.Vector3;
  id: number;
}

export interface ProjectileHitResult {
  enemyHits: { enemyId: number; damage: number }[];
  playerDamage: number;
}

interface Projectile {
  active: boolean;
  mesh: THREE.Mesh;
  isSpriteMesh: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  type: ProjectileType;
  lifetime: number;
  owner: 'player' | 'enemy';
  hitEnemies: Set<number>;
}

const POOL_SIZE = 24;
const PLAYER_RADIUS = 0.3;

export class ProjectileManager {
  private readonly pool: Projectile[] = [];
  private readonly scene: THREE.Scene;

  // Pre-allocated vectors for per-frame math — zero allocations in update()
  private readonly _step = new THREE.Vector3();
  private readonly _spreadDir = new THREE.Vector3();
  private readonly _up = new THREE.Vector3(0, 1, 0);

  // Pre-allocated hit result — cleared each frame
  private readonly hitResult: ProjectileHitResult = {
    enemyHits: [],
    playerDamage: 0,
  };

  constructor(scene: THREE.Scene, defaultType: ProjectileType) {
    this.scene = scene;

    for (let i = 0; i < POOL_SIZE; i++) {
      const mesh = createProjectileMesh(defaultType);
      mesh.visible = false;
      scene.add(mesh);

      this.pool.push({
        active: false,
        mesh,
        isSpriteMesh: isSprite(defaultType),
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        type: defaultType,
        lifetime: 0,
        owner: 'player',
        hitEnemies: new Set(),
      });
    }
  }

  spawn(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    type: ProjectileType,
    owner: 'player' | 'enemy',
  ): void {
    const p = this.pool.find((proj) => !proj.active);
    if (!p) return; // pool exhausted

    p.active = true;
    p.type = type;
    p.owner = owner;
    p.lifetime = type.lifetime;
    p.hitEnemies.clear();

    p.position.copy(origin);
    p.velocity.set(direction.x, 0, direction.z).normalize().multiplyScalar(type.speed);

    // Swap mesh if type changed between sprite ↔ sphere
    const needsSprite = isSprite(type);
    if (needsSprite !== p.isSpriteMesh) {
      this.scene.remove(p.mesh);
      p.mesh.onBeforeRender = () => {};
      p.mesh = createProjectileMesh(type);
      p.mesh.visible = false;
      this.scene.add(p.mesh);
      p.isSpriteMesh = needsSprite;
    } else if (!needsSprite) {
      // Sphere → swap material if color differs
      const mat = p.mesh.material as THREE.MeshStandardMaterial;
      if (mat.color.getHex() !== type.color) {
        const newMesh = createProjectileMesh(type);
        p.mesh.geometry = newMesh.geometry;
        p.mesh.material = newMesh.material;
      }
    }

    p.mesh.visible = true;
    p.mesh.position.copy(p.position);
    p.mesh.scale.setScalar(type.scale);
  }

  spawnSpread(
    origin: THREE.Vector3,
    centerDir: THREE.Vector3,
    type: ProjectileType,
    owner: 'player' | 'enemy',
    count: number,
    spreadAngle: number,
  ): void {
    const halfSpread = spreadAngle / 2;
    const step = count > 1 ? spreadAngle / (count - 1) : 0;

    for (let i = 0; i < count; i++) {
      const angle = count > 1 ? -halfSpread + step * i : 0;
      this._spreadDir.copy(centerDir);
      this._spreadDir.applyAxisAngle(this._up, angle);
      this.spawn(origin, this._spreadDir, type, owner);
    }
  }

  update(
    delta: number,
    grid: CellType[][],
    enemyTargets: CombatTarget[],
    playerPos: THREE.Vector3,
    playerRadius: number = PLAYER_RADIUS,
  ): ProjectileHitResult {
    // Clear hit result (reuse object, avoid allocation)
    this.hitResult.enemyHits.length = 0;
    this.hitResult.playerDamage = 0;

    for (const p of this.pool) {
      if (!p.active) continue;

      // Advance lifetime
      p.lifetime -= delta;
      if (p.lifetime <= 0) {
        this.deactivate(p);
        continue;
      }

      // Move
      this._step.copy(p.velocity).multiplyScalar(delta);
      p.position.add(this._step);

      // Wall collision
      const gx = Math.floor(p.position.x);
      const gz = Math.floor(p.position.z);
      if (
        gz < 0 ||
        gz >= grid.length ||
        gx < 0 ||
        gx >= grid[gz].length ||
        grid[gz][gx] === CellType.WALL
      ) {
        this.deactivate(p);
        continue;
      }

      // Entity collision
      if (p.owner === 'player') {
        // Check enemy hits
        for (const target of enemyTargets) {
          if (p.hitEnemies.has(target.id)) continue;

          const dx = p.position.x - target.position.x;
          const dz = p.position.z - target.position.z;
          const combinedRadius = p.type.radius + 0.3; // enemy radius
          if (dx * dx + dz * dz < combinedRadius * combinedRadius) {
            this.hitResult.enemyHits.push({
              enemyId: target.id,
              damage: p.type.damage,
            });
            p.hitEnemies.add(target.id);
            if (!p.type.piercing) {
              this.deactivate(p);
              break;
            }
          }
        }
      } else {
        // Enemy projectile — check player hit
        const dx = p.position.x - playerPos.x;
        const dz = p.position.z - playerPos.z;
        const combinedRadius = p.type.radius + playerRadius;
        if (dx * dx + dz * dz < combinedRadius * combinedRadius) {
          this.hitResult.playerDamage += p.type.damage;
          this.deactivate(p);
          continue;
        }
      }

      // Sync mesh position
      if (p.active) {
        p.mesh.position.copy(p.position);
      }
    }

    return this.hitResult;
  }

  deactivateAll(): void {
    for (const p of this.pool) {
      if (p.active) {
        this.deactivate(p);
      }
    }
  }

  dispose(): void {
    for (const p of this.pool) {
      this.scene.remove(p.mesh);
      // Geometry and material are shared — disposed by disposeProjectileShared
    }
    this.pool.length = 0;
    disposeProjectileShared();
  }

  private deactivate(p: Projectile): void {
    p.active = false;
    p.mesh.visible = false;
  }
}
