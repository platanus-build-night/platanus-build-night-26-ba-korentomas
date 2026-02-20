import { listWeapons, getWeaponModel, type Weapon } from './api.js';

export function createGallery(
  container: HTMLElement,
  onSelectWeapon: (glb: ArrayBuffer) => void
) {
  async function refresh() {
    let weapons: Weapon[];
    try {
      weapons = await listWeapons();
    } catch {
      return; // silently fail on gallery load
    }

    // Clear existing children safely
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    for (const weapon of weapons) {
      const card = document.createElement('div');
      card.className = 'weapon-card';

      const img = document.createElement('img');
      img.src = `data:image/png;base64,${weapon.sketch_png}`;
      img.alt = weapon.name;

      const nameEl = document.createElement('div');
      nameEl.className = 'weapon-name';
      nameEl.textContent = weapon.name;

      card.appendChild(img);
      card.appendChild(nameEl);

      card.addEventListener('click', async () => {
        try {
          const glb = await getWeaponModel(weapon.id);
          onSelectWeapon(glb);
        } catch (err) {
          console.error('Failed to load weapon model:', err);
        }
      });

      container.appendChild(card);
    }
  }

  return { refresh };
}
