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

export interface WeaponTypeOption {
  id: string;
  label: string;
  icon: string;
  hasProjectile: boolean;
}

export const WEAPON_TYPES: WeaponTypeOption[] = [
  { id: 'sword', label: 'Sword', icon: '\u{1F5E1}', hasProjectile: false },
  { id: 'staff', label: 'Staff', icon: '\u{1FA84}', hasProjectile: true },
  { id: 'dual-daggers', label: 'Daggers', icon: '\u2694', hasProjectile: false },
  { id: 'hammer', label: 'Hammer', icon: '\u{1F528}', hasProjectile: false },
  { id: 'axe', label: 'Axe', icon: '\u{1FA93}', hasProjectile: false },
  { id: 'bow', label: 'Bow', icon: '\u{1F3F9}', hasProjectile: true },
  { id: 'spear', label: 'Spear', icon: '\u{1F531}', hasProjectile: false },
  { id: 'mace', label: 'Mace', icon: '\u2692', hasProjectile: false },
];
