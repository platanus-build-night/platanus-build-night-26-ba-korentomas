export type Forge3dStage = 'generating' | 'modeling' | 'done' | 'error';

export interface Forge3dProgress {
  stage: Forge3dStage;
  message: string;
}

export async function forge3d(
  sketchDataUrl: string,
  category: string,
  onProgress?: (progress: Forge3dProgress) => void
): Promise<ArrayBuffer> {
  onProgress?.({ stage: 'generating', message: 'Rendering sketch...' });

  const res = await fetch('/api/forge-3d', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sketch: sketchDataUrl, category }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Forge failed (${res.status})`);
  }

  onProgress?.({ stage: 'done', message: 'Object forged!' });
  return res.arrayBuffer();
}
