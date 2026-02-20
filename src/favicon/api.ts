export interface Favicon {
  id: number;
  name: string;
  sketch_png: string;
  style: string;
  created_at: string;
}

export async function forgeFavicon(
  sketchDataUrl: string,
  name: string,
  style: string,
  description: string
): Promise<{ image: ArrayBuffer; id: number; name: string }> {
  const res = await fetch('/api/favicon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sketch: sketchDataUrl,
      name: name || undefined,
      style,
      description: description || undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Forge failed (${res.status})`);
  }

  const image = await res.arrayBuffer();
  const id = Number(res.headers.get('X-Favicon-Id'));
  const faviconName = res.headers.get('X-Favicon-Name') || name;

  return { image, id, name: faviconName };
}

export async function listFavicons(): Promise<Favicon[]> {
  const res = await fetch('/api/favicons');
  if (!res.ok) throw new Error('Failed to list favicons');
  return res.json();
}

export async function getFaviconImage(id: number): Promise<ArrayBuffer> {
  const res = await fetch(`/api/favicons/${id}/image`);
  if (!res.ok) throw new Error('Failed to load favicon image');
  return res.arrayBuffer();
}
