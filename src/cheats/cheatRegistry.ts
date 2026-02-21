export interface CheatDefinition {
  name: string;
  description: string;
  usage?: string;
  execute: (args: string[]) => string | Promise<string>;
}

const registry = new Map<string, CheatDefinition>();

export function registerCheat(cheat: CheatDefinition): void {
  registry.set(cheat.name.toLowerCase(), cheat);
}

export function executeCheat(input: string): string | Promise<string> {
  const parts = input.trim().split(/\s+/);
  const name = parts[0].toLowerCase();
  const args = parts.slice(1);

  const cheat = registry.get(name);
  if (!cheat) {
    const suggestions = searchCheats(name);
    if (suggestions.length > 0) {
      return `Unknown cheat. Did you mean: ${suggestions.map((c) => c.name).join(', ')}?`;
    }
    return `Unknown cheat: "${name}". Type "help" to list all cheats.`;
  }

  return cheat.execute(args);
}

export function searchCheats(partial: string): CheatDefinition[] {
  const lower = partial.toLowerCase();
  const results: CheatDefinition[] = [];
  for (const cheat of registry.values()) {
    if (cheat.name.startsWith(lower)) {
      results.push(cheat);
    }
  }
  return results;
}

export function listCheats(): CheatDefinition[] {
  return Array.from(registry.values());
}
