uniform float time;
uniform float intensity;
uniform sampler2D tDiffuse;
varying vec2 vUv;

float random(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  float grain = random(vUv + fract(time)) * 2.0 - 1.0;
  color.rgb += grain * intensity;
  gl_FragColor = color;
}
