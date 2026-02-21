import * as THREE from 'three';
import { createSpriteEnemyModel } from './spriteEnemy';

interface EnemyStats {
  health: number;
  speed: number;
  damage: number;
  points: number;
}

interface CustomEnemyType {
  name: string;
  health: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  points: number;
  modelGenerator: () => THREE.Group;
}

export async function createCustomEnemyType(
  spriteDataUrl: string,
  stats: EnemyStats,
  name: string,
): Promise<CustomEnemyType> {
  const factory = await createSpriteEnemyModel(spriteDataUrl);

  return {
    name,
    health: stats.health,
    speed: stats.speed,
    damage: stats.damage,
    attackRange: 2.8,
    attackCooldown: 1.0,
    points: stats.points,
    modelGenerator: factory,
  };
}
