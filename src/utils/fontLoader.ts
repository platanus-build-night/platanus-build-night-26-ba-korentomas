import { Font, FontLoader } from 'three/addons/loaders/FontLoader.js';

const FONTS: Record<string, string> = {
  'Droid Serif': '/fonts/droid_serif_bold.typeface.json',
  'Helvetiker': '/fonts/helvetiker_bold.typeface.json',
  'Optimer': '/fonts/optimer_bold.typeface.json',
  'Gentilis': '/fonts/gentilis_bold.typeface.json',
};

const fontCache = new Map<string, Font>();

export function getFontNames(): string[] {
  return Object.keys(FONTS);
}

export async function getFont(name: string): Promise<Font> {
  const url = FONTS[name];
  if (!url) throw new Error(`Unknown font: ${name}`);
  const cached = fontCache.get(name);
  if (cached) return cached;
  const font = await loadFont(url);
  fontCache.set(name, font);
  return font;
}

export function loadFont(url: string): Promise<Font> {
  return new Promise((resolve, reject) => {
    const loader = new FontLoader();
    loader.load(url, resolve, undefined, reject);
  });
}
