import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { registerCheat, listCheats } from './cheatRegistry';
import { cheats, resetCheats } from './cheatState';

export interface CheatContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  bloomPass: UnrealBloomPass;
  retroPass: ShaderPass;
}

export function registerDefaultCheats(ctx: CheatContext): void {
  const { scene, camera, bloomPass, retroPass } = ctx;

  // --- Gameplay flags (wired later) ---

  registerCheat({
    name: 'god',
    description: 'Toggle invincibility',
    execute: () => {
      cheats.god = !cheats.god;
      return cheats.god ? 'God mode ON' : 'God mode OFF';
    },
  });

  registerCheat({
    name: 'onehit',
    description: 'Toggle one-hit kills',
    execute: () => {
      cheats.onehit = !cheats.onehit;
      return cheats.onehit ? 'One-hit kills ON' : 'One-hit kills OFF';
    },
  });

  registerCheat({
    name: 'noclip',
    description: 'Toggle collision bypass',
    execute: () => {
      cheats.noclip = !cheats.noclip;
      return cheats.noclip ? 'Noclip ON' : 'Noclip OFF';
    },
  });

  // --- Live visual cheats ---

  registerCheat({
    name: 'speed',
    description: 'Set corridor speed multiplier',
    usage: 'speed <number>',
    execute: (args) => {
      const val = parseFloat(args[0]);
      if (isNaN(val) || val < 0) return 'Usage: speed <number> (e.g. speed 5)';
      cheats.speedMultiplier = val;
      return `Speed multiplier: ${val}x`;
    },
  });

  registerCheat({
    name: 'fog',
    description: 'Set fog density',
    usage: 'fog <number>',
    execute: (args) => {
      const val = parseFloat(args[0]);
      if (isNaN(val) || val < 0) return 'Usage: fog <number> (e.g. fog 0.05)';
      const fog = scene.fog as THREE.FogExp2;
      fog.density = val;
      return `Fog density: ${val}`;
    },
  });

  registerCheat({
    name: 'bloom',
    description: 'Set bloom strength',
    usage: 'bloom <number>',
    execute: (args) => {
      const val = parseFloat(args[0]);
      if (isNaN(val) || val < 0) return 'Usage: bloom <number> (e.g. bloom 1.5)';
      bloomPass.strength = val;
      return `Bloom strength: ${val}`;
    },
  });

  registerCheat({
    name: 'fov',
    description: 'Set camera field of view',
    usage: 'fov <number>',
    execute: (args) => {
      const val = parseFloat(args[0]);
      if (isNaN(val) || val < 10 || val > 170)
        return 'Usage: fov <10-170> (e.g. fov 90)';
      camera.fov = val;
      camera.updateProjectionMatrix();
      return `FOV: ${val}`;
    },
  });

  registerCheat({
    name: 'retro',
    description: 'Toggle retro shader',
    execute: () => {
      retroPass.enabled = !retroPass.enabled;
      return retroPass.enabled ? 'Retro shader ON' : 'Retro shader OFF';
    },
  });

  registerCheat({
    name: 'matrix',
    description: 'Green color grading',
    execute: () => {
      const warmTint = retroPass.uniforms['warmTint'].value as THREE.Vector3;
      const isMatrix =
        warmTint.x < 0.5 && warmTint.y > 1.1 && warmTint.z < 0.5;
      if (isMatrix) {
        warmTint.set(1.05, 1.0, 0.9);
        retroPass.uniforms['saturation'].value = 0.7;
        return 'Matrix mode OFF';
      } else {
        warmTint.set(0.3, 1.3, 0.3);
        retroPass.uniforms['saturation'].value = 0.3;
        return 'Matrix mode ON';
      }
    },
  });

  registerCheat({
    name: 'disco',
    description: 'Randomize torch colors',
    execute: () => {
      const torchLights: THREE.PointLight[] = [];
      scene.traverse((obj) => {
        if (obj instanceof THREE.PointLight) {
          torchLights.push(obj);
        }
      });
      for (const light of torchLights) {
        light.color.setHSL(Math.random(), 1, 0.5);
      }
      return `Disco! Recolored ${torchLights.length} torch lights`;
    },
  });

  registerCheat({
    name: 'grain',
    description: 'Set film grain intensity',
    usage: 'grain <number>',
    execute: (args) => {
      const val = parseFloat(args[0]);
      if (isNaN(val) || val < 0) return 'Usage: grain <number> (e.g. grain 0.3)';
      retroPass.uniforms['grainIntensity'].value = val;
      return `Grain intensity: ${val}`;
    },
  });

  registerCheat({
    name: 'scanlines',
    description: 'Set scanline intensity',
    usage: 'scanlines <number>',
    execute: (args) => {
      const val = parseFloat(args[0]);
      if (isNaN(val) || val < 0)
        return 'Usage: scanlines <number> (e.g. scanlines 0.3)';
      retroPass.uniforms['scanlineIntensity'].value = val;
      return `Scanline intensity: ${val}`;
    },
  });

  registerCheat({
    name: 'ambient',
    description: 'Set ambient light brightness',
    usage: 'ambient <hex>',
    execute: (args) => {
      const val = args[0];
      if (!val) return 'Usage: ambient <hex> (e.g. ambient 444444)';
      let color: number;
      try {
        color = parseInt(val.replace('#', ''), 16);
      } catch {
        return 'Invalid hex color';
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.AmbientLight) {
          obj.color.setHex(color);
        }
      });
      return `Ambient light: #${val}`;
    },
  });

  // --- Utility cheats ---

  registerCheat({
    name: 'help',
    description: 'List all available cheats',
    execute: () => {
      const all = listCheats();
      return all.map((c) => `${c.name} \u2014 ${c.description}`).join('\n');
    },
  });

  registerCheat({
    name: 'reset',
    description: 'Reset all cheats to defaults',
    execute: () => {
      resetCheats();
      // Reset visual tweaks
      bloomPass.strength = 0.6;
      retroPass.enabled = true;
      retroPass.uniforms['grainIntensity'].value = 0.12;
      retroPass.uniforms['scanlineIntensity'].value = 0.15;
      retroPass.uniforms['saturation'].value = 0.7;
      (retroPass.uniforms['warmTint'].value as THREE.Vector3).set(1.05, 1.0, 0.9);
      const fog = scene.fog as THREE.FogExp2;
      fog.density = 0.035;
      camera.fov = 70;
      camera.updateProjectionMatrix();
      return 'All cheats reset to defaults';
    },
  });
}
