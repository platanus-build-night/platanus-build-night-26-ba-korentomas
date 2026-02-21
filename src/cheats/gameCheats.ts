import { registerCheat } from './cheatRegistry';

export interface GameCheatContext {
  getPlayer: () => { health: number; score: number; addScore: (n: number) => void };
  getEnemyManager: () => { getEnemies: () => { id: number; health: number }[]; applyDamage: (id: number, dmg: number) => void };
  getCurrentFloor: () => number;
  loadFloor: (n: number) => void | Promise<void>;
  spawnBlueprint: () => void;
  spawnEnemy: (id: number) => Promise<string>;
}

export function registerGameCheats(ctx: GameCheatContext): void {
  registerCheat({
    name: 'heal',
    description: 'Restore health (default: full)',
    usage: 'heal [amount]',
    execute: (args) => {
      const amount = args[0] ? parseInt(args[0]) : 100;
      if (isNaN(amount)) return 'Usage: heal [amount]';
      const p = ctx.getPlayer();
      p.health = Math.min(100, p.health + amount);
      return `Healed to ${p.health} HP`;
    },
  });

  registerCheat({
    name: 'health',
    description: 'Set player health',
    usage: 'health <amount>',
    execute: (args) => {
      const val = parseInt(args[0]);
      if (isNaN(val)) return 'Usage: health <number>';
      ctx.getPlayer().health = Math.max(0, Math.min(100, val));
      return `Health set to ${val}`;
    },
  });

  registerCheat({
    name: 'kill',
    description: 'Kill all enemies on current floor',
    execute: () => {
      const em = ctx.getEnemyManager();
      const enemies = em.getEnemies();
      let count = 0;
      for (const e of enemies) {
        if (e.health > 0) {
          em.applyDamage(e.id, 99999);
          count++;
        }
      }
      return `Killed ${count} enemies`;
    },
  });

  registerCheat({
    name: 'score',
    description: 'Set player score',
    usage: 'score <number>',
    execute: (args) => {
      const val = parseInt(args[0]);
      if (isNaN(val)) return 'Usage: score <number>';
      ctx.getPlayer().score = val;
      return `Score set to ${val}`;
    },
  });

  registerCheat({
    name: 'floor',
    description: 'Jump to floor number',
    usage: 'floor <number>',
    execute: (args) => {
      const val = parseInt(args[0]);
      if (isNaN(val) || val < 1) return 'Usage: floor <number>';
      ctx.loadFloor(val);
      return `Warped to floor ${val}`;
    },
  });

  registerCheat({
    name: 'blueprint',
    description: 'Spawn a blueprint at your feet',
    execute: () => {
      ctx.spawnBlueprint();
      return 'Blueprint spawned!';
    },
  });

  registerCheat({
    name: 'spawn',
    description: 'Spawn an enemy from the database',
    usage: 'spawn [id] — no args lists available enemies',
    execute: async (args) => {
      if (args.length === 0) {
        // List available enemies from DB
        try {
          const res = await fetch('/api/enemies');
          if (!res.ok) return 'Failed to fetch enemies';
          const enemies = await res.json() as { id: number; name: string; health: number; damage: number }[];
          if (enemies.length === 0) return 'No enemies in database. Forge one first!';
          const lines = enemies.map(e => `  ${e.id}: ${e.name} (HP:${e.health} DMG:${e.damage})`);
          return `Available enemies:\n${lines.join('\n')}\n\nUsage: spawn <id>`;
        } catch {
          return 'Failed to fetch enemy list';
        }
      }

      const id = parseInt(args[0]);
      if (isNaN(id)) return 'Usage: spawn <id>';
      return ctx.spawnEnemy(id);
    },
  });

}
