uniform float time;
uniform float grainIntensity;
uniform float scanlineIntensity;
uniform vec2 resolution;
uniform float saturation;
uniform vec3 warmTint;
uniform float crushBlacks;
uniform float brightness;
uniform sampler2D tDiffuse;
varying vec2 vUv;

float random(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec4 color = texture2D(tDiffuse, vUv);

  // Film grain
  float grain = random(vUv + fract(time)) * 2.0 - 1.0;
  color.rgb += grain * grainIntensity;

  // CRT scanlines
  float scanline = sin(vUv.y * resolution.y * 1.5) * 0.5 + 0.5;
  scanline = pow(scanline, 1.5);
  color.rgb *= 1.0 - (1.0 - scanline) * scanlineIntensity;

  // Vignette
  vec2 uv = vUv * 2.0 - 1.0;
  float vignette = 1.0 - dot(uv * 0.55, uv * 0.55);
  vignette = clamp(pow(vignette, 1.3), 0.0, 1.0);
  color.rgb *= vignette;

  // Desaturate
  float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(lum), color.rgb, saturation);

  // Warm tint
  color.rgb *= warmTint;

  // Crush blacks
  color.rgb = smoothstep(vec3(crushBlacks), vec3(1.0), color.rgb);

  // Brightness boost
  color.rgb *= brightness;

  gl_FragColor = color;
}
