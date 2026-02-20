import type { DrawingResult } from '../drawing/drawingTypes';

export interface ForgedItem {
  glb: ArrayBuffer;
  id: number;
  name: string;
  category: 'weapon' | 'enemy' | 'decoration';
}

export async function forgeCreation(drawingResult: DrawingResult): Promise<ForgedItem> {
  const res = await fetch('/api/forge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sketch: drawingResult.imageData,
      category: drawingResult.categoryId,
      name: drawingResult.textPrompt || 'Custom Creation',
      weaponType: drawingResult.categoryId === 'weapon' ? 'sword' : undefined,
      description: drawingResult.textPrompt || undefined,
    }),
  });

  if (!res.ok) {
    throw new Error(`Forge failed (${res.status})`);
  }

  const glb = await res.arrayBuffer();
  return {
    glb,
    id: Number(res.headers.get('X-Weapon-Id') || res.headers.get('X-Item-Id') || '0'),
    name: res.headers.get('X-Weapon-Name') || res.headers.get('X-Item-Name') || 'Custom Creation',
    category: (res.headers.get('X-Item-Category') || drawingResult.categoryId || 'weapon') as ForgedItem['category'],
  };
}
