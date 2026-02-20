import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { getFont } from '../utils/fontLoader';

export interface TitleParams {
  text: string;
  font: string;
  size: number;
  depth: number;
  bevelThickness: number;
  bevelSize: number;
  archRadius: number;
  arcSpan: number;
  verticalArch: number;
  letterSpacing: number;
}

export interface TitleHandle {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  params: TitleParams;
  rebuild: () => Promise<void>;
}

function buildGeometry(font: Font, params: TitleParams): THREE.BufferGeometry {
  const geo = new TextGeometry(params.text, {
    font,
    size: params.size,
    depth: params.depth,
    curveSegments: 6,
    bevelEnabled: true,
    bevelThickness: params.bevelThickness,
    bevelSize: params.bevelSize,
    bevelSegments: 3,
  });

  geo.computeBoundingBox();
  const bbox = geo.boundingBox!;
  const textWidth = bbox.max.x - bbox.min.x;
  const centerX = textWidth / 2;

  // Apply letter spacing by scaling X positions outward from center
  const posAttr = geo.getAttribute('position');
  if (params.letterSpacing !== 0) {
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const t = (x - centerX) / (textWidth || 1);
      posAttr.setX(i, x + t * params.letterSpacing * textWidth);
    }
    geo.computeBoundingBox();
  }

  // Horizontal arch deformation
  if (params.archRadius > 0 && params.arcSpan > 0) {
    const updatedBbox = geo.boundingBox!;
    const updatedWidth = updatedBbox.max.x - updatedBbox.min.x;
    const updatedCenter = updatedWidth / 2;

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);

      const t = (x - updatedCenter) / (updatedWidth || 1);
      const angle = t * params.arcSpan;
      const r = params.archRadius + z;

      posAttr.setXYZ(
        i,
        Math.sin(angle) * r,
        y + (Math.cos(angle) - 1) * params.archRadius * 0.15,
        -Math.cos(angle) * r + params.archRadius
      );
    }
  }

  // Vertical arch — bends text up/down based on horizontal position
  if (params.verticalArch !== 0) {
    geo.computeBoundingBox();
    const vBbox = geo.boundingBox!;
    const vWidth = vBbox.max.x - vBbox.min.x;
    const vCenterX = (vBbox.max.x + vBbox.min.x) / 2;

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);

      // Parabolic curve: highest at center, drops at edges
      const t = (x - vCenterX) / (vWidth / 2 || 1); // -1 to 1
      posAttr.setY(i, y + (1 - t * t) * params.verticalArch);
    }
  }

  // Center geometry on X axis
  geo.computeBoundingBox();
  const finalBbox = geo.boundingBox!;
  const offsetX = (finalBbox.max.x + finalBbox.min.x) / 2;
  for (let i = 0; i < posAttr.count; i++) {
    posAttr.setX(i, posAttr.getX(i) - offsetX);
  }

  geo.computeVertexNormals();
  return geo;
}

export async function createTitleText(camera: THREE.Camera): Promise<TitleHandle> {
  const params: TitleParams = {
    text: 'DungeonSlopper',
    font: 'Gentilis',
    size: 1.65,
    depth: 0.4,
    bevelThickness: 0.09,
    bevelSize: 0.055,
    archRadius: 10,
    arcSpan: 1,
    verticalArch: 0.9,
    letterSpacing: 0.66,
  };

  const material = new THREE.MeshStandardMaterial({
    color: 0xdaa520,
    emissive: 0xcc7700,
    emissiveIntensity: 2.45,
    roughness: 0.7,
    metalness: 0.9,
    toneMapped: false,
    depthTest: false,
  });

  const font = await getFont(params.font);
  const geometry = buildGeometry(font, params);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 1.5, -7.5);
  mesh.renderOrder = 999;
  camera.add(mesh);

  const rebuild = async () => {
    const newFont = await getFont(params.font);
    const oldGeo = mesh.geometry;
    mesh.geometry = buildGeometry(newFont, params);
    oldGeo.dispose();
  };

  return { mesh, material, params, rebuild };
}
