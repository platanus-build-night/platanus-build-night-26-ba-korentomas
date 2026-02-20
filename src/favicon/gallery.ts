import { listFavicons, getFaviconImage, type Favicon } from './api.js';

export function createGallery(
  container: HTMLElement,
  onSelectFavicon: (image: ArrayBuffer, name: string) => void
) {
  async function refresh() {
    let favicons: Favicon[];
    try {
      favicons = await listFavicons();
    } catch {
      return;
    }

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    for (const favicon of favicons) {
      const card = document.createElement('div');
      card.className = 'weapon-card';

      const img = document.createElement('img');
      img.src = `data:image/png;base64,${favicon.sketch_png}`;
      img.alt = favicon.name;

      const nameEl = document.createElement('div');
      nameEl.className = 'weapon-name';
      nameEl.textContent = favicon.name;

      card.appendChild(img);
      card.appendChild(nameEl);

      card.addEventListener('click', async () => {
        try {
          const image = await getFaviconImage(favicon.id);
          onSelectFavicon(image, favicon.name);
        } catch (err) {
          console.error('Failed to load favicon image:', err);
        }
      });

      container.appendChild(card);
    }
  }

  return { refresh };
}
