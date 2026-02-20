export interface ProjectileType {
  name: string;
  speed: number; // units/sec
  damage: number;
  radius: number; // collision radius
  lifetime: number; // seconds before auto-despawn
  piercing: boolean; // passes through enemies?
  color: number; // emissive hex color
  scale: number; // visual size multiplier
}

export const PROJECTILE_TYPES = {
  MAGIC_BOLT: {
    name: 'Magic Bolt',
    speed: 15,
    damage: 20,
    radius: 0.15,
    lifetime: 2,
    piercing: false,
    color: 0x44aaff,
    scale: 1,
  },
  FIRE_SPREAD: {
    name: 'Fire Spread',
    speed: 12,
    damage: 10,
    radius: 0.12,
    lifetime: 1.5,
    piercing: false,
    color: 0xff6622,
    scale: 0.8,
  },
  ENEMY_FIREBALL: {
    name: 'Enemy Fireball',
    speed: 8,
    damage: 15,
    radius: 0.2,
    lifetime: 3,
    piercing: false,
    color: 0xff4400,
    scale: 1.2,
  },
  BOSS_VOLLEY: {
    name: 'Boss Volley',
    speed: 10,
    damage: 20,
    radius: 0.25,
    lifetime: 3,
    piercing: false,
    color: 0xff0044,
    scale: 1.5,
  },
} as const satisfies Record<string, ProjectileType>;
