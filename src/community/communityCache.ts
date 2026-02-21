import {
  listWeapons,
  getWeaponModel,
  listEnemies,
  getEnemyModel,
  listDecorations,
  getDecorationModel,
  type Weapon,
  type EnemyCreation,
  type DecorationCreation,
} from '../forge/api';
import { arrayBufferToDataUrl } from '../forge/forgeCreation';

export interface CachedModel {
  id: number;
  name: string;
}

export class CommunityCache {
  private weapons: Weapon[] = [];
  private enemies: EnemyCreation[] = [];
  private decorations: DecorationCreation[] = [];
  private dataCache = new Map<string, ArrayBuffer>();
  private loaded = false;

  async preload(): Promise<void> {
    if (this.loaded) return;
    try {
      const [w, e, d] = await Promise.all([
        listWeapons().catch(() => [] as Weapon[]),
        listEnemies().catch(() => [] as EnemyCreation[]),
        listDecorations().catch(() => [] as DecorationCreation[]),
      ]);
      this.weapons = w;
      this.enemies = e;
      this.decorations = d;
      this.loaded = true;
    } catch {
      // Silently fail — community content is optional
    }
  }

  async getRandomWeaponGLB(): Promise<{ glb: ArrayBuffer; name: string } | null> {
    if (this.weapons.length === 0) return null;
    const weapon = this.weapons[Math.floor(Math.random() * this.weapons.length)];
    const key = `weapon-${weapon.id}`;
    let glb = this.dataCache.get(key);
    if (!glb) {
      try {
        glb = await getWeaponModel(weapon.id);
        this.dataCache.set(key, glb);
      } catch {
        return null;
      }
    }
    return { glb, name: weapon.name };
  }

  async getRandomEnemySprite(): Promise<{ dataUrl: string; stats: EnemyCreation; name: string } | null> {
    if (this.enemies.length === 0) return null;
    const enemy = this.enemies[Math.floor(Math.random() * this.enemies.length)];
    const key = `enemy-${enemy.id}`;
    let data = this.dataCache.get(key);
    if (!data) {
      try {
        data = await getEnemyModel(enemy.id);
        this.dataCache.set(key, data);
      } catch {
        return null;
      }
    }
    const dataUrl = arrayBufferToDataUrl(data, 'image/png');
    return { dataUrl, stats: enemy, name: enemy.name };
  }

  async getRandomDecorationSprite(): Promise<{ dataUrl: string; name: string } | null> {
    if (this.decorations.length === 0) return null;
    const deco = this.decorations[Math.floor(Math.random() * this.decorations.length)];
    const key = `deco-${deco.id}`;
    let data = this.dataCache.get(key);
    if (!data) {
      try {
        data = await getDecorationModel(deco.id);
        this.dataCache.set(key, data);
      } catch {
        return null;
      }
    }
    const dataUrl = arrayBufferToDataUrl(data, 'image/png');
    return { dataUrl, name: deco.name };
  }

  get hasContent(): boolean {
    return this.weapons.length > 0 || this.enemies.length > 0 || this.decorations.length > 0;
  }
}

export const communityCache = new CommunityCache();
