import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { getFont } from '../utils/fontLoader';

export interface MenuParams {
  font: string;
  size: number;
  depth: number;
  letterSpacing: number;
  spacing: number; // vertical spacing between items
}

export interface MenuItem {
  label: string;
  mesh: THREE.Mesh;
  hitArea: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
}

export interface MenuHandle {
  items: MenuItem[];
  group: THREE.Group;
  params: MenuParams;
  rebuild: () => Promise<void>;
}

function buildGeometry(font: Font, text: string, params: MenuParams): THREE.BufferGeometry {
  const geo = new TextGeometry(text, {
    font,
    size: params.size,
    depth: params.depth,
    curveSegments: 4,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.01,
    bevelSegments: 2,
  });

  geo.computeBoundingBox();
  const bbox = geo.boundingBox!;
  const textWidth = bbox.max.x - bbox.min.x;
  const centerX = textWidth / 2;

  // Letter spacing
  if (params.letterSpacing !== 0) {
    const posAttr = geo.getAttribute('position');
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const t = (x - centerX) / (textWidth || 1);
      posAttr.setX(i, x + t * params.letterSpacing * textWidth);
    }
    geo.computeBoundingBox();
  }

  // Right-align: shift so right edge is at x=0
  geo.computeBoundingBox();
  const rightEdge = geo.boundingBox!.max.x;
  geo.translate(-rightEdge, 0, 0);

  geo.computeVertexNormals();
  return geo;
}

const MENU_LABELS = ['Start', 'Gallery', 'Settings', 'Credits'];

export async function createMenuItems(camera: THREE.Camera): Promise<MenuHandle> {
  const params: MenuParams = {
    font: 'Gentilis',
    size: 0.6,
    depth: 0,
    letterSpacing: 0.12,
    spacing: 1.35,
  };

  const font = await getFont(params.font);
  const group = new THREE.Group();
  group.position.set(4.5, 0, -7);
  group.renderOrder = 999;
  camera.add(group);

  const items: MenuItem[] = [];

  for (let i = 0; i < MENU_LABELS.length; i++) {
    const label = MENU_LABELS[i];

    const material = new THREE.MeshStandardMaterial({
      color: 0xdaa520,
      emissive: 0xcc7700,
      emissiveIntensity: 2.4,
      roughness: 0.7,
      metalness: 0.45,
      toneMapped: false,
      depthTest: false,
    });

    const geometry = buildGeometry(font, label, params);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = -i * params.spacing;
    mesh.renderOrder = 999;
    group.add(mesh);

    // Invisible hit area
    const hitGeo = new THREE.PlaneGeometry(1, 1);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false, depthTest: false });
    const hitArea = new THREE.Mesh(hitGeo, hitMat);
    hitArea.renderOrder = 998;

    // Size hit area to text bounds + padding
    mesh.geometry.computeBoundingBox();
    const bbox = mesh.geometry.boundingBox!;
    const w = (bbox.max.x - bbox.min.x) + 0.6;
    const h = (bbox.max.y - bbox.min.y) + 0.4;
    hitArea.scale.set(w, h, 1);
    hitArea.position.set(
      (bbox.max.x + bbox.min.x) / 2,
      (bbox.max.y + bbox.min.y) / 2,
      0.01
    );
    mesh.add(hitArea);

    items.push({ label, mesh, hitArea, material });
  }

  const rebuild = async () => {
    const newFont = await getFont(params.font);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const oldGeo = item.mesh.geometry;
      item.mesh.geometry = buildGeometry(newFont, item.label, params);
      oldGeo.dispose();
      item.mesh.position.y = -i * params.spacing;

      // Update hit area
      item.mesh.geometry.computeBoundingBox();
      const bbox = item.mesh.geometry.boundingBox!;
      const w = (bbox.max.x - bbox.min.x) + 0.6;
      const h = (bbox.max.y - bbox.min.y) + 0.4;
      item.hitArea.scale.set(w, h, 1);
      item.hitArea.position.set(
        (bbox.max.x + bbox.min.x) / 2,
        (bbox.max.y + bbox.min.y) / 2,
        0.01
      );
    }
  };

  return { items, group, params, rebuild };
}
