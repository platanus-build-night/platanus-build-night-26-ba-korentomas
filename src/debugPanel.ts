import GUI from 'lil-gui';
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { TitleHandle } from './scene/titleText';
import { MenuHandle } from './scene/menuItems';
import { getFontNames } from './utils/fontLoader';

interface DebugPanelOptions {
  title: TitleHandle;
  menu: MenuHandle;
  bloomPass: UnrealBloomPass;
  retroPass: ShaderPass;
  fog: THREE.FogExp2;
}

export function createDebugPanel(opts: DebugPanelOptions): GUI {
  const gui = new GUI({ title: 'DungeonSlopper Tuner', width: 340 });
  gui.domElement.style.maxHeight = '100vh';
  gui.domElement.style.overflowY = 'auto';
  const fonts = getFontNames();

  // --- Title Geometry ---
  const titleGeoFolder = gui.addFolder('Title Geometry');
  titleGeoFolder.add(opts.title.params, 'text').name('Text').onFinishChange(() => opts.title.rebuild());
  titleGeoFolder.add(opts.title.params, 'font', fonts).name('Font').onChange(() => opts.title.rebuild());
  titleGeoFolder.add(opts.title.params, 'size', 0.3, 3, 0.05).name('Size').onFinishChange(() => opts.title.rebuild());
  titleGeoFolder.add(opts.title.params, 'depth', 0, 1, 0.05).name('Depth').onFinishChange(() => opts.title.rebuild());
  titleGeoFolder.add(opts.title.params, 'bevelThickness', 0, 0.2, 0.005).name('Bevel Thickness').onFinishChange(() => opts.title.rebuild());
  titleGeoFolder.add(opts.title.params, 'bevelSize', 0, 0.15, 0.005).name('Bevel Size').onFinishChange(() => opts.title.rebuild());
  titleGeoFolder.add(opts.title.params, 'archRadius', 0, 20, 0.5).name('Arch Radius').onFinishChange(() => opts.title.rebuild());
  titleGeoFolder.add(opts.title.params, 'arcSpan', 0, 2, 0.05).name('Arc Span').onFinishChange(() => opts.title.rebuild());
  titleGeoFolder.add(opts.title.params, 'verticalArch', -3, 3, 0.1).name('Vertical Arch').onFinishChange(() => opts.title.rebuild());
  titleGeoFolder.add(opts.title.params, 'letterSpacing', -0.5, 1, 0.02).name('Letter Spacing').onFinishChange(() => opts.title.rebuild());

  // --- Title Material ---
  const titleMatFolder = gui.addFolder('Title Material');
  titleMatFolder.addColor({ color: '#' + opts.title.material.color.getHexString() }, 'color')
    .name('Color')
    .onChange((v: string) => opts.title.material.color.set(v));
  titleMatFolder.addColor({ emissive: '#' + opts.title.material.emissive.getHexString() }, 'emissive')
    .name('Emissive')
    .onChange((v: string) => opts.title.material.emissive.set(v));
  titleMatFolder.add(opts.title.material, 'emissiveIntensity', 0, 5, 0.05).name('Emissive Intensity');
  titleMatFolder.add(opts.title.material, 'roughness', 0, 1, 0.05).name('Roughness');
  titleMatFolder.add(opts.title.material, 'metalness', 0, 1, 0.05).name('Metalness');
  titleMatFolder.add(opts.title.material, 'toneMapped').name('Tone Mapped');
  titleMatFolder.close();

  // --- Title Position ---
  const titlePosFolder = gui.addFolder('Title Position');
  titlePosFolder.add(opts.title.mesh.position, 'x', -10, 10, 0.1).name('X');
  titlePosFolder.add(opts.title.mesh.position, 'y', -5, 8, 0.1).name('Y');
  titlePosFolder.add(opts.title.mesh.position, 'z', -30, 0, 0.5).name('Z');
  titlePosFolder.close();

  // --- Menu ---
  const menuFolder = gui.addFolder('Menu');
  menuFolder.add(opts.menu.params, 'font', fonts).name('Font').onChange(() => opts.menu.rebuild());
  menuFolder.add(opts.menu.params, 'size', 0.1, 2, 0.05).name('Size').onFinishChange(() => opts.menu.rebuild());
  menuFolder.add(opts.menu.params, 'depth', 0, 0.5, 0.02).name('Depth').onFinishChange(() => opts.menu.rebuild());
  menuFolder.add(opts.menu.params, 'letterSpacing', -0.5, 1, 0.02).name('Letter Spacing').onFinishChange(() => opts.menu.rebuild());
  menuFolder.add(opts.menu.params, 'spacing', 0.2, 1.5, 0.05).name('Item Spacing').onFinishChange(() => opts.menu.rebuild());
  menuFolder.close();

  // --- Menu Material (first item as reference) ---
  const menuMatFolder = gui.addFolder('Menu Material');
  const firstMat = opts.menu.items[0].material;
  menuMatFolder.addColor({ color: '#' + firstMat.color.getHexString() }, 'color')
    .name('Color')
    .onChange((v: string) => opts.menu.items.forEach((item) => item.material.color.set(v)));
  menuMatFolder.addColor({ emissive: '#' + firstMat.emissive.getHexString() }, 'emissive')
    .name('Emissive')
    .onChange((v: string) => opts.menu.items.forEach((item) => item.material.emissive.set(v)));
  menuMatFolder.add(firstMat, 'emissiveIntensity', 0, 3, 0.05).name('Emissive Intensity')
    .onChange((v: number) => opts.menu.items.forEach((item) => { item.material.emissiveIntensity = v; }));
  menuMatFolder.add(firstMat, 'roughness', 0, 1, 0.05).name('Roughness')
    .onChange((v: number) => opts.menu.items.forEach((item) => { item.material.roughness = v; }));
  menuMatFolder.add(firstMat, 'metalness', 0, 1, 0.05).name('Metalness')
    .onChange((v: number) => opts.menu.items.forEach((item) => { item.material.metalness = v; }));
  menuMatFolder.close();

  // --- Menu Position ---
  const menuPosFolder = gui.addFolder('Menu Position');
  menuPosFolder.add(opts.menu.group.position, 'x', -10, 10, 0.1).name('X');
  menuPosFolder.add(opts.menu.group.position, 'y', -5, 5, 0.1).name('Y');
  menuPosFolder.add(opts.menu.group.position, 'z', -30, 0, 0.5).name('Z');
  menuPosFolder.close();

  // --- Bloom ---
  const bloomFolder = gui.addFolder('Bloom');
  bloomFolder.add(opts.bloomPass, 'strength', 0, 3, 0.05).name('Strength');
  bloomFolder.add(opts.bloomPass, 'radius', 0, 2, 0.05).name('Radius');
  bloomFolder.add(opts.bloomPass, 'threshold', 0, 1, 0.05).name('Threshold');
  bloomFolder.close();

  // --- Retro Effects ---
  const retroFolder = gui.addFolder('Retro Effects');
  retroFolder.add(opts.retroPass.uniforms['grainIntensity'], 'value', 0, 0.5, 0.01).name('Film Grain');
  retroFolder.add(opts.retroPass.uniforms['scanlineIntensity'], 'value', 0, 0.5, 0.01).name('Scanlines');
  retroFolder.add(opts.retroPass.uniforms['saturation'], 'value', 0, 1.5, 0.05).name('Saturation');
  retroFolder.add(opts.retroPass.uniforms['crushBlacks'], 'value', 0, 0.15, 0.005).name('Crush Blacks');
  const warmTint = opts.retroPass.uniforms['warmTint'].value as THREE.Vector3;
  retroFolder.add(warmTint, 'x', 0.8, 1.3, 0.01).name('Warm R');
  retroFolder.add(warmTint, 'y', 0.8, 1.3, 0.01).name('Warm G');
  retroFolder.add(warmTint, 'z', 0.8, 1.3, 0.01).name('Warm B');
  retroFolder.close();

  // --- Fog ---
  const fogFolder = gui.addFolder('Fog');
  fogFolder.add(opts.fog, 'density', 0, 0.1, 0.001).name('Density');
  fogFolder.close();

  // --- Export ---
  gui.add({
    copy() {
      const snapshot = {
        title: {
          ...opts.title.params,
          color: '#' + opts.title.material.color.getHexString(),
          emissive: '#' + opts.title.material.emissive.getHexString(),
          emissiveIntensity: opts.title.material.emissiveIntensity,
          roughness: opts.title.material.roughness,
          metalness: opts.title.material.metalness,
          toneMapped: opts.title.material.toneMapped,
          position: { x: +opts.title.mesh.position.x.toFixed(2), y: +opts.title.mesh.position.y.toFixed(2), z: +opts.title.mesh.position.z.toFixed(2) },
        },
        menu: {
          ...opts.menu.params,
          items: opts.menu.items.map((item) => item.label),
          color: '#' + firstMat.color.getHexString(),
          emissive: '#' + firstMat.emissive.getHexString(),
          emissiveIntensity: firstMat.emissiveIntensity,
          roughness: firstMat.roughness,
          metalness: firstMat.metalness,
          position: { x: +opts.menu.group.position.x.toFixed(2), y: +opts.menu.group.position.y.toFixed(2), z: +opts.menu.group.position.z.toFixed(2) },
        },
        bloom: { strength: opts.bloomPass.strength, radius: opts.bloomPass.radius, threshold: opts.bloomPass.threshold },
        retro: {
          grainIntensity: opts.retroPass.uniforms['grainIntensity'].value,
          scanlineIntensity: opts.retroPass.uniforms['scanlineIntensity'].value,
          saturation: opts.retroPass.uniforms['saturation'].value,
          crushBlacks: opts.retroPass.uniforms['crushBlacks'].value,
          warmTint: { r: warmTint.x, g: warmTint.y, b: warmTint.z },
        },
        fog: { density: opts.fog.density },
      };
      navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
      alert('Settings copied to clipboard!');
    }
  }, 'copy').name('📋 Copy Settings to Clipboard');

  return gui;
}
