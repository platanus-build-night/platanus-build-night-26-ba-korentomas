export type ForgeStage = 'generating' | 'done' | 'error';

export interface ForgeProgress {
  stage: ForgeStage;
  message: string;
}

export async function forgeEnemy(
  sketchDataUrl: string,
  onProgress?: (progress: ForgeProgress) => void
): Promise<string> {
  onProgress?.({ stage: 'generating', message: 'Conjuring form...' });

  const res = await fetch('/api/forge-enemy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sketch: sketchDataUrl }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Forge failed (${res.status})`);
  }

  // Convert response PNG to data URL for use as texture
  const blob = await res.blob();
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  onProgress?.({ stage: 'done', message: 'Enemy conjured!' });
  return dataUrl;
}
