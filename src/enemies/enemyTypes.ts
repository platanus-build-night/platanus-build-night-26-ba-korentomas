import * as THREE from 'three';
import { createSkeletonModel } from './models/skeletonModel';

export interface EnemyType {
  name: string;
  health: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  points: number;
  modelGenerator: () => THREE.Group;
}

export const ENEMY_TYPES: Record<string, EnemyType> = {
  SKELETON: {
    name: 'Skeleton',
    health: 30,
    speed: 2,
    damage: 10,
    attackRange: 1.5,
    attackCooldown: 1.0,
    points: 100,
    modelGenerator: createSkeletonModel,
  },
};
