import * as THREE from 'three';
import { CellType } from '../dungeon/types';
import type { EnemyType } from './enemyTypes';

export enum EnemyAIState {
  IDLE = 'IDLE',
  CHASE = 'CHASE',
  ATTACK = 'ATTACK',
  RANGED_ATTACK = 'RANGED_ATTACK',
  COOLDOWN = 'COOLDOWN',
  DEAD = 'DEAD',
}

export interface EnemyAction {
  newState: EnemyAIState;
  moveDirection: THREE.Vector3 | null;
  dealDamage: boolean;
  fireProjectile: boolean;
  fireDirection: THREE.Vector3 | null;
}

const DETECTION_RANGE = 10;
const ENEMY_RADIUS = 0.3;

// Reusable vectors — never allocate in the update loop
const _direction = new THREE.Vector3();
const _fireDir = new THREE.Vector3();

function isWalkable(grid: CellType[][], gx: number, gz: number): boolean {
  if (gz < 0 || gz >= grid.length) return false;
  if (gx < 0 || gx >= grid[gz].length) return false;
  const cell = grid[gz][gx];
  return cell === CellType.FLOOR || cell === CellType.DOOR;
}

function canEnemyMoveTo(grid: CellType[][], x: number, z: number): boolean {
  const minX = Math.floor(x - ENEMY_RADIUS);
  const maxX = Math.floor(x + ENEMY_RADIUS);
  const minZ = Math.floor(z - ENEMY_RADIUS);
  const maxZ = Math.floor(z + ENEMY_RADIUS);
  return (
    isWalkable(grid, minX, minZ) &&
    isWalkable(grid, maxX, minZ) &&
    isWalkable(grid, minX, maxZ) &&
    isWalkable(grid, maxX, maxZ)
  );
}

export function updateAI(
  enemyPos: THREE.Vector3,
  enemyState: EnemyAIState,
  cooldownTimer: number,
  enemyType: EnemyType,
  playerPos: THREE.Vector3,
  grid: CellType[][],
  delta: number,
): EnemyAction {
  const distToPlayer = enemyPos.distanceTo(playerPos);
  const isRanged = enemyType.ranged === true;
  const rangedRange = enemyType.rangedRange ?? 0;

  switch (enemyState) {
    case EnemyAIState.IDLE: {
      if (distToPlayer <= DETECTION_RANGE) {
        return { newState: EnemyAIState.CHASE, moveDirection: null, dealDamage: false, fireProjectile: false, fireDirection: null };
      }
      return { newState: EnemyAIState.IDLE, moveDirection: null, dealDamage: false, fireProjectile: false, fireDirection: null };
    }

    case EnemyAIState.CHASE: {
      // Ranged enemies fire when in ranged range but beyond melee
      if (isRanged && distToPlayer <= rangedRange && distToPlayer > enemyType.attackRange) {
        _fireDir.copy(playerPos).sub(enemyPos);
        _fireDir.y = 0;
        _fireDir.normalize();
        return { newState: EnemyAIState.RANGED_ATTACK, moveDirection: null, dealDamage: false, fireProjectile: true, fireDirection: _fireDir };
      }

      if (distToPlayer <= enemyType.attackRange) {
        return { newState: EnemyAIState.ATTACK, moveDirection: null, dealDamage: false, fireProjectile: false, fireDirection: null };
      }

      // Move toward player
      _direction.copy(playerPos).sub(enemyPos);
      _direction.y = 0; // Stay on ground plane
      _direction.normalize();

      const moveStep = enemyType.speed * delta;
      const targetX = enemyPos.x + _direction.x * moveStep;
      const targetZ = enemyPos.z + _direction.z * moveStep;

      // Try full move, then axis-separated sliding
      let moveDir: THREE.Vector3 | null = null;
      if (canEnemyMoveTo(grid, targetX, targetZ)) {
        moveDir = new THREE.Vector3(_direction.x * moveStep, 0, _direction.z * moveStep);
      } else if (canEnemyMoveTo(grid, targetX, enemyPos.z)) {
        moveDir = new THREE.Vector3(_direction.x * moveStep, 0, 0);
      } else if (canEnemyMoveTo(grid, enemyPos.x, targetZ)) {
        moveDir = new THREE.Vector3(0, 0, _direction.z * moveStep);
      }

      return { newState: EnemyAIState.CHASE, moveDirection: moveDir, dealDamage: false, fireProjectile: false, fireDirection: null };
    }

    case EnemyAIState.ATTACK: {
      return { newState: EnemyAIState.COOLDOWN, moveDirection: null, dealDamage: true, fireProjectile: false, fireDirection: null };
    }

    case EnemyAIState.RANGED_ATTACK: {
      // Immediately transition to cooldown after firing
      return { newState: EnemyAIState.COOLDOWN, moveDirection: null, dealDamage: false, fireProjectile: false, fireDirection: null };
    }

    case EnemyAIState.COOLDOWN: {
      const remaining = cooldownTimer - delta;
      if (remaining <= 0) {
        return { newState: EnemyAIState.CHASE, moveDirection: null, dealDamage: false, fireProjectile: false, fireDirection: null };
      }
      return { newState: EnemyAIState.COOLDOWN, moveDirection: null, dealDamage: false, fireProjectile: false, fireDirection: null };
    }

    case EnemyAIState.DEAD: {
      return { newState: EnemyAIState.DEAD, moveDirection: null, dealDamage: false, fireProjectile: false, fireDirection: null };
    }
  }
}
