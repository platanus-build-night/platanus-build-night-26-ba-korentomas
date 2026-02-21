export interface DrawingCategory {
  id: string;
  label: string;
  icon: string;
}

export interface DrawingResult {
  imageData: string;
  categoryId: string;
  textPrompt: string;
  name: string;
  width: number;
  height: number;
  weaponType?: string;
  projectileImageData?: string;
  projectileDominantColor?: number;
}

export type DrawingSubmitHandler = (result: DrawingResult) => void;

export const DEFAULT_CATEGORIES: DrawingCategory[] = [
  { id: 'weapon', label: 'Weapon', icon: '\u2694' },
  { id: 'enemy', label: 'Enemy', icon: '\uD83D\uDC80' },
  { id: 'decoration', label: 'Decor', icon: '\uD83C\uDFFA' },
];

export interface SubtypeOption {
  id: string;
  label: string;
  icon: string;
  hasProjectile?: boolean;
}

/** @deprecated Use SubtypeOption — kept as alias for compat */
export type WeaponTypeOption = SubtypeOption;

export const WEAPON_TYPES: SubtypeOption[] = [
  { id: 'sword', label: 'Sword', icon: '\u{1F5E1}', hasProjectile: false },
  { id: 'staff', label: 'Staff', icon: '\u{1FA84}', hasProjectile: true },
  { id: 'dual-daggers', label: 'Daggers', icon: '\u2694', hasProjectile: false },
  { id: 'hammer', label: 'Hammer', icon: '\u{1F528}', hasProjectile: false },
  { id: 'axe', label: 'Axe', icon: '\u{1FA93}', hasProjectile: false },
  { id: 'bow', label: 'Bow', icon: '\u{1F3F9}', hasProjectile: true },
  { id: 'spear', label: 'Spear', icon: '\u{1F531}', hasProjectile: false },
  { id: 'mace', label: 'Mace', icon: '\u2692', hasProjectile: false },
];

export const ENEMY_TYPES: SubtypeOption[] = [
  { id: 'beast', label: 'Beast', icon: '\u{1F43A}' },
  { id: 'undead', label: 'Undead', icon: '\u{1F480}' },
  { id: 'goblin', label: 'Goblin', icon: '\u{1F47A}' },
  { id: 'demon', label: 'Demon', icon: '\u{1F608}' },
  { id: 'ghost', label: 'Ghost', icon: '\u{1F47B}' },
  { id: 'slime', label: 'Slime', icon: '\u{1F7E2}' },
  { id: 'dragon', label: 'Dragon', icon: '\u{1F409}' },
  { id: 'golem', label: 'Golem', icon: '\u{1FAA8}' },
];

export const DECORATION_TYPES: SubtypeOption[] = [
  { id: 'crate', label: 'Crate', icon: '\u{1F4E6}' },
  { id: 'vase', label: 'Vase', icon: '\u{1F3FA}' },
  { id: 'barrel', label: 'Barrel', icon: '\u{1F6E2}' },
  { id: 'painting', label: 'Painting', icon: '\u{1F5BC}' },
  { id: 'statue', label: 'Statue', icon: '\u{1F5FF}' },
  { id: 'chest', label: 'Chest', icon: '\u{1F4B0}' },
  { id: 'banner', label: 'Banner', icon: '\u{1F6A9}' },
  { id: 'torch', label: 'Torch', icon: '\u{1F525}' },
];

/** Get the subtype options for a given category */
export function getSubtypesForCategory(categoryId: string): SubtypeOption[] {
  switch (categoryId) {
    case 'weapon': return WEAPON_TYPES;
    case 'enemy': return ENEMY_TYPES;
    case 'decoration': return DECORATION_TYPES;
    default: return [];
  }
}
