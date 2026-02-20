export interface DrawingCategory {
  id: string;
  label: string;
  icon: string;
}

export interface DrawingResult {
  imageData: string;
  categoryId: string;
  textPrompt: string;
  width: number;
  height: number;
}

export type DrawingSubmitHandler = (result: DrawingResult) => void;

export const DEFAULT_CATEGORIES: DrawingCategory[] = [
  { id: 'weapon', label: 'Weapon', icon: '\u2694' },
  { id: 'enemy', label: 'Enemy', icon: '\uD83D\uDC80' },
  { id: 'decoration', label: 'Decor', icon: '\uD83C\uDFFA' },
];
