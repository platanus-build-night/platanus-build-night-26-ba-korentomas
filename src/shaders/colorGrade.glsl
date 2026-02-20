uniform float saturation;
uniform vec3 warmTint;
uniform float crushBlacks;
uniform sampler2D tDiffuse;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(tDiffuse, vUv);

  // Desaturate
  float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(lum), color.rgb, saturation);

  // Warm tint
  color.rgb *= warmTint;

  // Crush blacks
  color.rgb = smoothstep(vec3(crushBlacks), vec3(1.0), color.rgb);

  gl_FragColor = color;
}
