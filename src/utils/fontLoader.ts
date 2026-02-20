import { Font, FontLoader } from 'three/addons/loaders/FontLoader.js';

export function loadFont(url: string): Promise<Font> {
  return new Promise((resolve, reject) => {
    const loader = new FontLoader();
    loader.load(url, resolve, undefined, reject);
  });
}
