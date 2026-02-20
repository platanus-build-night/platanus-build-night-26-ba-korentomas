uniform float intensity;
uniform vec2 resolution;
uniform sampler2D tDiffuse;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(tDiffuse, vUv);

  // Scanline effect
  float scanline = sin(vUv.y * resolution.y * 1.5) * 0.5 + 0.5;
  scanline = pow(scanline, 1.5);
  color.rgb *= 1.0 - (1.0 - scanline) * intensity;

  // Vignette
  vec2 uv = vUv * 2.0 - 1.0;
  float vignette = 1.0 - dot(uv * 0.55, uv * 0.55);
  vignette = clamp(pow(vignette, 1.3), 0.0, 1.0);
  color.rgb *= vignette;

  gl_FragColor = color;
}
