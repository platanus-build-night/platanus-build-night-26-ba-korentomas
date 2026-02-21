import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as THREE from 'three';
import retroCompositeFrag from '../shaders/retroComposite.glsl';

const defaultVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export function createRetroPass(): ShaderPass {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      time: { value: 0 },
      grainIntensity: { value: 0.12 },
      scanlineIntensity: { value: 0.15 },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      saturation: { value: 0.7 },
      warmTint: { value: new THREE.Vector3(1.05, 1.0, 0.9) },
      crushBlacks: { value: 0.02 },
      brightness: { value: 1.15 },
    },
    vertexShader: defaultVertexShader,
    fragmentShader: retroCompositeFrag,
  });

  window.addEventListener('resize', () => {
    pass.uniforms['resolution'].value.set(window.innerWidth, window.innerHeight);
  });

  return pass;
}
