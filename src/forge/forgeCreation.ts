import type { DrawingResult } from '../drawing/drawingTypes';

export interface ForgedItem {
  data: ArrayBuffer;
  id: number;
  name: string;
  category: 'weapon' | 'enemy' | 'decoration';
  weaponType?: string;
}

export function arrayBufferToDataUrl(buffer: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

export async function forgeCreation(drawingResult: DrawingResult): Promise<ForgedItem> {
  const res = await fetch('/api/forge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sketch: drawingResult.imageData,
      category: drawingResult.categoryId,
      name: drawingResult.name || drawingResult.textPrompt || 'Custom Creation',
      weaponType: drawingResult.weaponType || (drawingResult.categoryId === 'weapon' ? 'sword' : undefined),
      projectileSketch: drawingResult.projectileImageData || undefined,
      description: drawingResult.textPrompt || undefined,
    }),
  });

  if (!res.ok) {
    throw new Error(`Forge failed (${res.status})`);
  }

  const data = await res.arrayBuffer();
  return {
    data,
    id: Number(res.headers.get('X-Weapon-Id') || res.headers.get('X-Item-Id') || '0'),
    name: res.headers.get('X-Weapon-Name') || res.headers.get('X-Item-Name') || 'Custom Creation',
    category: (res.headers.get('X-Item-Category') || drawingResult.categoryId || 'weapon') as ForgedItem['category'],
    weaponType: res.headers.get('X-Weapon-Type') || drawingResult.weaponType || undefined,
  };
}
