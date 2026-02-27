import * as THREE from 'three';

// Shared time uniform — all shader materials reference this same object
export var shaderTime = { value: 0 };

// ===================== WATER SHADER =====================

var waterVert = [
  'uniform float uTime;',
  'varying vec3 vWorldPos;',
  'varying float vFogDepth;',
  '',
  'void main() {',
  '  vec4 worldPos = modelMatrix * vec4(position, 1.0);',
  '  vWorldPos = worldPos.xyz;',
  '  vec3 pos = position;',
  '  pos.y += sin(worldPos.x * 4.0 + uTime * 2.5) * 0.018',
  '         + sin(worldPos.z * 3.5 + uTime * 1.8) * 0.014',
  '         + sin((worldPos.x + worldPos.z) * 2.5 + uTime * 1.2) * 0.008;',
  '  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);',
  '  vFogDepth = -mvPos.z;',
  '  gl_Position = projectionMatrix * mvPos;',
  '}'
].join('\n');

var waterFrag = [
  'uniform float uTime;',
  'uniform vec3 fogColor;',
  'uniform float fogDensity;',
  'varying vec3 vWorldPos;',
  'varying float vFogDepth;',
  '',
  'float hash(vec2 p) {',
  '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);',
  '}',
  'float noise(vec2 p) {',
  '  vec2 i = floor(p);',
  '  vec2 f = fract(p);',
  '  f = f * f * (3.0 - 2.0 * f);',
  '  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),',
  '             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);',
  '}',
  '',
  'void main() {',
  '  vec2 uv = vWorldPos.xz;',
  '',
  '  float n1 = noise(uv * 3.0 + vec2(uTime * 0.4, uTime * 0.3));',
  '  float n2 = noise(uv * 6.0 - vec2(uTime * 0.3, uTime * 0.25));',
  '  float n3 = noise(uv * 12.0 + vec2(uTime * 0.2, -uTime * 0.15));',
  '  float pattern = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;',
  '',
  '  vec3 deep = vec3(0.08, 0.22, 0.50);',
  '  vec3 mid = vec3(0.16, 0.44, 0.72);',
  '  vec3 light = vec3(0.38, 0.65, 0.88);',
  '  vec3 foam = vec3(0.82, 0.92, 1.0);',
  '',
  '  vec3 col = mix(deep, mid, smoothstep(0.22, 0.48, pattern));',
  '  col = mix(col, light, smoothstep(0.48, 0.70, pattern));',
  '  col = mix(col, foam, smoothstep(0.78, 0.92, pattern));',
  '',
  '  float sparkle = noise(uv * 24.0 + uTime * 0.9);',
  '  col += foam * pow(sparkle, 7.0) * 0.4;',
  '',
  '  float caustic = pow(noise(uv * 8.0 + vec2(sin(uTime*0.3)*0.5, cos(uTime*0.4)*0.5)), 3.0);',
  '  col += vec3(0.04, 0.07, 0.11) * caustic;',
  '',
  '  float wave = sin(uv.x * 8.0 + uTime * 2.0) * sin(uv.y * 6.0 + uTime * 1.5);',
  '  col += vec3(0.06, 0.08, 0.12) * max(wave, 0.0) * 0.3;',
  '',
  '  gl_FragColor = vec4(col, 0.80);',
  '',
  '  float fogF = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);',
  '  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogF);',
  '}'
].join('\n');

// ===================== LAVA SHADER =====================

var lavaVert = [
  'uniform float uTime;',
  'varying vec3 vWorldPos;',
  'varying float vFogDepth;',
  '',
  'void main() {',
  '  vec4 worldPos = modelMatrix * vec4(position, 1.0);',
  '  vWorldPos = worldPos.xyz;',
  '  vec3 pos = position;',
  '  pos.y += sin(worldPos.x * 5.0 + uTime * 1.5) * 0.012',
  '         + sin(worldPos.z * 4.0 + uTime * 2.0) * 0.009;',
  '  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);',
  '  vFogDepth = -mvPos.z;',
  '  gl_Position = projectionMatrix * mvPos;',
  '}'
].join('\n');

var lavaFrag = [
  'uniform float uTime;',
  'uniform vec3 fogColor;',
  'uniform float fogDensity;',
  'varying vec3 vWorldPos;',
  'varying float vFogDepth;',
  '',
  'float hash(vec2 p) {',
  '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);',
  '}',
  'float noise(vec2 p) {',
  '  vec2 i = floor(p);',
  '  vec2 f = fract(p);',
  '  f = f * f * (3.0 - 2.0 * f);',
  '  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),',
  '             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);',
  '}',
  '',
  'void main() {',
  '  vec2 uv = vWorldPos.xz;',
  '  float flow = uTime * 0.12;',
  '',
  '  float n1 = noise(uv * 2.0 + vec2(flow, flow * 0.7));',
  '  float n2 = noise(uv * 4.0 - vec2(flow * 0.5, flow * 0.8));',
  '  float n3 = noise(uv * 8.0 + vec2(-flow * 0.3, flow * 0.4));',
  '  float n4 = noise(uv * 16.0 + vec2(flow * 0.2, -flow * 0.15));',
  '  float pattern = n1 * 0.4 + n2 * 0.3 + n3 * 0.2 + n4 * 0.1;',
  '',
  '  vec3 crust = vec3(0.15, 0.01, 0.0);',
  '  vec3 warm = vec3(0.85, 0.18, 0.0);',
  '  vec3 hot = vec3(1.0, 0.65, 0.08);',
  '  vec3 white = vec3(1.0, 0.90, 0.50);',
  '',
  '  vec3 col = mix(crust, warm, smoothstep(0.18, 0.40, pattern));',
  '  col = mix(col, hot, smoothstep(0.40, 0.60, pattern));',
  '  col = mix(col, white, smoothstep(0.70, 0.88, pattern));',
  '',
  '  float pulse = sin(uTime * 0.7 + n1 * 6.28) * 0.1 + 0.9;',
  '  col *= pulse;',
  '',
  '  float crack = smoothstep(0.45, 0.55, noise(uv * 3.0 + flow * 0.5));',
  '  col += vec3(0.5, 0.15, 0.0) * crack * 0.4;',
  '',
  '  col += vec3(0.2, 0.03, 0.0) * smoothstep(0.3, 0.65, pattern);',
  '',
  '  gl_FragColor = vec4(col, 1.0);',
  '',
  '  float fogF = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);',
  '  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogF);',
  '}'
].join('\n');

// ===================== SINGLETON MATERIAL INSTANCES =====================

export var waterShaderMat = null;
export var lavaShaderMat = null;

export function initShaderMaterials() {
  var fogU1 = THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
  fogU1.uTime = shaderTime;
  waterShaderMat = new THREE.ShaderMaterial({
    uniforms: fogU1,
    vertexShader: waterVert,
    fragmentShader: waterFrag,
    transparent: true,
    depthWrite: false,
    fog: true,
    side: THREE.DoubleSide
  });

  var fogU2 = THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
  fogU2.uTime = shaderTime;
  lavaShaderMat = new THREE.ShaderMaterial({
    uniforms: fogU2,
    vertexShader: lavaVert,
    fragmentShader: lavaFrag,
    fog: true,
    side: THREE.DoubleSide
  });
}
