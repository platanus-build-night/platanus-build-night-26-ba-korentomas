export interface Weapon {
  id: number;
  name: string;
  sketch_png: string;
  created_at: string;
}

export async function forgeWeapon(
  sketchDataUrl: string,
  name: string,
  weaponType: string,
  description: string
): Promise<{ glb: ArrayBuffer; id: number; name: string }> {
  const res = await fetch('/api/forge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sketch: sketchDataUrl,
      name: name || undefined,
      weaponType,
      description: description || undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Forge failed (${res.status})`);
  }

  const glb = await res.arrayBuffer();
  const id = Number(res.headers.get('X-Weapon-Id'));
  const weaponName = res.headers.get('X-Weapon-Name') || name;

  return { glb, id, name: weaponName };
}

export async function listWeapons(): Promise<Weapon[]> {
  const res = await fetch('/api/weapons');
  if (!res.ok) throw new Error('Failed to list weapons');
  return res.json();
}

export async function getWeaponModel(id: number): Promise<ArrayBuffer> {
  const res = await fetch(`/api/weapons/${id}/model`);
  if (!res.ok) throw new Error('Failed to load weapon model');
  return res.arrayBuffer();
}
