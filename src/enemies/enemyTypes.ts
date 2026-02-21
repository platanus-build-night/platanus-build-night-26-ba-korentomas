import * as THREE from 'three';
import { createSkeletonModel } from './models/skeletonModel';
import { createBossModel } from './models/bossModel';
import type { ProjectileType } from '../projectiles/projectileTypes';
import { PROJECTILE_TYPES } from '../projectiles/projectileTypes';

export interface EnemyType {
  name: string;
  health: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  points: number;
  modelGenerator: () => THREE.Group;
  ranged?: boolean;
  rangedRange?: number;
  projectileType?: ProjectileType;
  /** Visual scale multiplier applied to the spawned model (default 1.0). */
  scale?: number;
}

export const ENEMY_TYPES: Record<string, EnemyType> = {
  SKELETON: {
    name: 'Skeleton',
    health: 30,
    speed: 2.5,
    damage: 20,
    attackRange: 2.8,
    attackCooldown: 1.0,
    points: 100,
    modelGenerator: createSkeletonModel,
  },
  BOSS_SKELETON: {
    name: 'Boss Skeleton',
    health: 150,
    speed: 2.0,
    damage: 40,
    attackRange: 3.5,
    attackCooldown: 1.5,
    points: 500,
    modelGenerator: createBossModel,
  },
  SKELETON_ARCHER: {
    name: 'Skeleton Archer',
    health: 20,
    speed: 1.5,
    damage: 0,
    attackRange: 2.5,
    attackCooldown: 2.0,
    points: 150,
    ranged: true,
    rangedRange: 12,
    projectileType: PROJECTILE_TYPES.ENEMY_FIREBALL,
    modelGenerator: createSkeletonModel,
  },
};
