/** Global cheat flags. Gameplay systems read these directly. */
export interface CheatFlags {
  god: boolean;
  onehit: boolean;
  noclip: boolean;
  speedMultiplier: number;
  [key: string]: boolean | number | string;
}

const defaults: CheatFlags = {
  god: false,
  onehit: false,
  noclip: false,
  speedMultiplier: 1,
};

export const cheats: CheatFlags = { ...defaults };

export function resetCheats(): void {
  Object.assign(cheats, defaults);
}
