import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as THREE from 'three';
import filmGrainFrag from '../shaders/filmGrain.glsl';
import crtScanlinesFrag from '../shaders/crtScanlines.glsl';
import colorGradeFrag from '../shaders/colorGrade.glsl';

const defaultVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export function createFilmGrainPass(): ShaderPass {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      time: { value: 0 },
      intensity: { value: 0.12 },
    },
    vertexShader: defaultVertexShader,
    fragmentShader: filmGrainFrag,
  });
  return pass;
}

export function createCrtScanlinePass(): ShaderPass {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      intensity: { value: 0.15 },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    },
    vertexShader: defaultVertexShader,
    fragmentShader: crtScanlinesFrag,
  });

  window.addEventListener('resize', () => {
    pass.uniforms['resolution'].value.set(window.innerWidth, window.innerHeight);
  });

  return pass;
}

export function createColorGradePass(): ShaderPass {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      saturation: { value: 0.7 },
      warmTint: { value: new THREE.Vector3(1.05, 1.0, 0.9) },
      crushBlacks: { value: 0.03 },
    },
    vertexShader: defaultVertexShader,
    fragmentShader: colorGradeFrag,
  });
  return pass;
}
