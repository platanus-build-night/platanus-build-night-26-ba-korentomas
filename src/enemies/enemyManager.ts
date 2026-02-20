import * as THREE from 'three';
import { CellType } from '../dungeon/types';
import type { EnemyType } from './enemyTypes';
import { EnemyAIState, updateAI } from './enemyAI';
import { disposeSkeletonShared } from './models/skeletonModel';
import { cheats } from '../cheats/cheatState';
import type { ProjectileManager } from '../projectiles/projectileManager';

export interface Enemy {
  id: number;
  type: EnemyType;
  position: THREE.Vector3;
  health: number;
  state: EnemyAIState;
  model: THREE.Group;
  cooldownTimer: number;
  flashTimer: number;
  /** Tracks opacity fade during death. Starts at 1. */
  deathFade: number;
  materials: THREE.MeshStandardMaterial[];
  originalColors: number[];
  roomIndex: number;
}

const FLASH_DURATION = 0.15;
const DEATH_FADE_DURATION = 0.5;

export class EnemyManager {
  private enemies: Enemy[] = [];
  private nextId = 0;
  private scene: THREE.Scene;
  private pendingPoints = 0;
  private onEnemyKilledCb: ((roomIndex: number) => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setOnEnemyKilled(cb: (roomIndex: number) => void): void {
    this.onEnemyKilledCb = cb;
  }

  spawnEnemiesInRoom(
    roomCenter: { x: number; z: number },
    count: number,
    enemyType: EnemyType,
    roomIndex: number = -1,
  ): void {
    for (let i = 0; i < count; i++) {
      // Spread enemies in a circle around the room center
      const angle = (Math.PI * 2 * i) / count;
      const radius = 2 + Math.random() * 2;
      const x = roomCenter.x + Math.cos(angle) * radius;
      const z = roomCenter.z + Math.sin(angle) * radius;

      const model = enemyType.modelGenerator();
      model.position.set(x, 0, z);
      this.scene.add(model);

      // Clone materials per enemy so tint/fade is independent
      const materials: THREE.MeshStandardMaterial[] = [];
      const originalColors: number[] = [];

      model.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          const cloned = child.material.clone();
          cloned.transparent = true;
          child.material = cloned;
          materials.push(cloned);
          originalColors.push(cloned.color.getHex());
        }
      });

      const enemy: Enemy = {
        id: this.nextId++,
        type: enemyType,
        position: model.position,
        health: enemyType.health,
        state: EnemyAIState.IDLE,
        model,
        cooldownTimer: 0,
        flashTimer: 0,
        deathFade: 1,
        materials,
        originalColors,
        roomIndex,
      };
      this.enemies.push(enemy);
    }
  }

  update(
    delta: number,
    playerPos: THREE.Vector3,
    grid: CellType[][],
    projectileManager?: ProjectileManager | null,
  ): { damageToPlayer: number } {
    let damageToPlayer = 0;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Handle death fade
      if (enemy.state === EnemyAIState.DEAD) {
        enemy.deathFade -= delta / DEATH_FADE_DURATION;
        const opacity = Math.max(0, enemy.deathFade);
        for (const mat of enemy.materials) {
          mat.opacity = opacity;
        }
        if (enemy.deathFade <= 0) {
          this.removeEnemy(i);
        }
        continue;
      }

      // Update flash timer
      if (enemy.flashTimer > 0) {
        enemy.flashTimer -= delta;
        if (enemy.flashTimer <= 0) {
          // Reset emissive
          for (const mat of enemy.materials) {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
      }

      // Run AI
      const action = updateAI(
        enemy.position,
        enemy.state,
        enemy.cooldownTimer,
        enemy.type,
        playerPos,
        grid,
        delta,
      );

      enemy.state = action.newState;

      // Apply movement
      if (action.moveDirection) {
        enemy.position.add(action.moveDirection);
      }

      // Face the player
      enemy.model.rotation.y = Math.atan2(
        playerPos.x - enemy.position.x,
        playerPos.z - enemy.position.z,
      );

      // Fire ranged projectile
      if (action.fireProjectile && projectileManager && enemy.type.projectileType && action.fireDirection) {
        projectileManager.spawn(enemy.position, action.fireDirection, enemy.type.projectileType, 'enemy');
      }

      // Apply damage to player
      if (action.dealDamage) {
        damageToPlayer += enemy.type.damage;
        enemy.cooldownTimer = enemy.type.attackCooldown;
      }

      // Tick cooldown
      if (enemy.state === EnemyAIState.COOLDOWN) {
        enemy.cooldownTimer -= delta;
        if (enemy.cooldownTimer <= 0) {
          enemy.state = EnemyAIState.CHASE;
        }
      }
    }

    return { damageToPlayer };
  }

  getTargets(): { position: THREE.Vector3; id: number }[] {
    const targets: { position: THREE.Vector3; id: number }[] = [];
    for (const enemy of this.enemies) {
      if (enemy.state !== EnemyAIState.DEAD) {
        targets.push({ position: enemy.position, id: enemy.id });
      }
    }
    return targets;
  }

  applyDamage(enemyId: number, damage: number): void {
    const enemy = this.enemies.find((e) => e.id === enemyId);
    if (!enemy || enemy.state === EnemyAIState.DEAD) return;

    const effectiveDamage = cheats.onehit ? enemy.health : damage;
    enemy.health -= effectiveDamage;

    // Flash red via emissive
    enemy.flashTimer = FLASH_DURATION;
    for (const mat of enemy.materials) {
      mat.emissive.setHex(0xff2222);
      mat.emissiveIntensity = 1.0;
    }

    if (enemy.health <= 0) {
      enemy.state = EnemyAIState.DEAD;
      enemy.deathFade = 1;
      this.pendingPoints += enemy.type.points;
      this.onEnemyKilledCb?.(enemy.roomIndex);
    }
  }

  getKilledPoints(): number {
    const pts = this.pendingPoints;
    this.pendingPoints = 0;
    return pts;
  }

  getEnemies(): Enemy[] {
    return this.enemies;
  }

  dispose(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.removeEnemy(i);
    }
    disposeSkeletonShared();
  }

  private removeEnemy(index: number): void {
    const enemy = this.enemies[index];
    this.scene.remove(enemy.model);
    // Dispose only cloned materials (NOT shared geometries)
    for (const mat of enemy.materials) {
      mat.dispose();
    }
    this.enemies.splice(index, 1);
  }
}
