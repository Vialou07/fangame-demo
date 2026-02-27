import * as THREE from 'three';

// Day/night cycle configuration
// Full cycle = 20 minutes real time (1200 seconds)
var CYCLE_DURATION = 1200;

// Time of day (0-1): 0=midnight, 0.25=sunrise, 0.5=noon, 0.75=sunset
export var dayState = {
  time: 0.35,     // Start at morning
  speed: 1,       // 1x speed (can be changed)
  paused: false,
  _skyColor: 0x8ED8F8,
  _fogColor: 0x8ED8F8
};

// Time-of-day color keyframes (interpolated smoothly)
// Night is bright (moonlit) — player can see and play comfortably
var KEYS = [
  // Midnight (bright moonlit blue — clearly night but fully playable)
  { t: 0.00, sun: 0x6888C8, sunInt: 0.55, amb: 0x384868, ambInt: 0.5, hemiSky: 0x405878, hemiGround: 0x283848, hemiInt: 0.35, sky: 0x1A2848, fog: 0x1A2848, fillInt: 0.3 },
  // Pre-dawn (blue-purple warming)
  { t: 0.20, sun: 0x8098D0, sunInt: 0.6, amb: 0x384060, ambInt: 0.45, hemiSky: 0x486080, hemiGround: 0x283040, hemiInt: 0.35, sky: 0x283850, fog: 0x283850, fillInt: 0.28 },
  // Sunrise (warm orange-pink)
  { t: 0.25, sun: 0xFFB060, sunInt: 0.9, amb: 0xFFA860, ambInt: 0.35, hemiSky: 0xFFB878, hemiGround: 0x4A3828, hemiInt: 0.3, sky: 0xFFB080, fog: 0xFFA870, fillInt: 0.15 },
  // Morning (bright warm)
  { t: 0.32, sun: 0xFFF0C8, sunInt: 1.3, amb: 0xFFF0D8, ambInt: 0.45, hemiSky: 0x90C8FF, hemiGround: 0x4A6828, hemiInt: 0.35, sky: 0x8ED8F8, fog: 0x8ED8F8, fillInt: 0.25 },
  // Noon (full daylight)
  { t: 0.50, sun: 0xFFF8E8, sunInt: 1.6, amb: 0xFFF0D8, ambInt: 0.5, hemiSky: 0x90C8FF, hemiGround: 0x4A6828, hemiInt: 0.4, sky: 0x8ED8F8, fog: 0x8ED8F8, fillInt: 0.3 },
  // Afternoon (slightly warm)
  { t: 0.65, sun: 0xFFF0C0, sunInt: 1.4, amb: 0xFFF0D0, ambInt: 0.48, hemiSky: 0x88C0F0, hemiGround: 0x4A6828, hemiInt: 0.38, sky: 0x88C8F0, fog: 0x88C8F0, fillInt: 0.28 },
  // Sunset (deep orange-red)
  { t: 0.75, sun: 0xFF7830, sunInt: 0.9, amb: 0xF08040, ambInt: 0.35, hemiSky: 0xFF9060, hemiGround: 0x3A2818, hemiInt: 0.28, sky: 0xE07848, fog: 0xD07040, fillInt: 0.2 },
  // Dusk (purple-blue transition — still well lit)
  { t: 0.82, sun: 0x7868B8, sunInt: 0.55, amb: 0x404068, ambInt: 0.4, hemiSky: 0x506080, hemiGround: 0x302840, hemiInt: 0.3, sky: 0x303858, fog: 0x303858, fillInt: 0.25 },
  // Night (moonlit — bright enough to play comfortably)
  { t: 0.90, sun: 0x6888C8, sunInt: 0.55, amb: 0x384868, ambInt: 0.5, hemiSky: 0x405878, hemiGround: 0x283848, hemiInt: 0.35, sky: 0x1A2848, fog: 0x1A2848, fillInt: 0.3 },
  // End = Midnight (loops)
  { t: 1.00, sun: 0x6888C8, sunInt: 0.55, amb: 0x384868, ambInt: 0.5, hemiSky: 0x405878, hemiGround: 0x283848, hemiInt: 0.35, sky: 0x1A2848, fog: 0x1A2848, fillInt: 0.3 }
];

// Internal color objects for lerping
var _c1 = new THREE.Color();
var _c2 = new THREE.Color();
var _cOut = new THREE.Color();

function lerpColor(hex1, hex2, alpha) {
  _c1.setHex(hex1);
  _c2.setHex(hex2);
  _cOut.copy(_c1).lerp(_c2, alpha);
  return _cOut;
}

function lerp(a, b, alpha) {
  return a + (b - a) * alpha;
}

// Find the two keyframes surrounding time t and return interpolation factor
function getKeyPair(t) {
  t = t % 1;
  if (t < 0) t += 1;
  for (var i = 0; i < KEYS.length - 1; i++) {
    if (t >= KEYS[i].t && t <= KEYS[i + 1].t) {
      var span = KEYS[i + 1].t - KEYS[i].t;
      var alpha = span > 0 ? (t - KEYS[i].t) / span : 0;
      // Smoothstep for nicer transitions
      alpha = alpha * alpha * (3 - 2 * alpha);
      return { a: KEYS[i], b: KEYS[i + 1], alpha: alpha };
    }
  }
  return { a: KEYS[KEYS.length - 1], b: KEYS[0], alpha: 0 };
}

// Sun angle: at noon sun is high, at night it acts as moonlight from above
function getSunAngle(t) {
  var angle = (t - 0.25) * Math.PI * 2;
  var y = Math.sin(angle) * 14;
  var xz = Math.cos(angle) * 8;
  // At night, keep sun (acting as moon) higher so shadows still work
  return { dx: xz, dy: Math.max(y, 4), dz: -Math.abs(xz) * 0.5 };
}

// References to scene lights (set once via init)
var _sun = null;
var _ambient = null;
var _hemi = null;
var _fill = null;
var _scene = null;

export function initDayNight(scene, sun) {
  _scene = scene;
  _sun = sun;

  scene.children.forEach(function(child) {
    if (child.isAmbientLight) _ambient = child;
    if (child.isHemisphereLight) _hemi = child;
    if (child.isDirectionalLight && child !== sun) _fill = child;
  });
}

// Update the cycle — call every frame with dt
export function updateDayNight(dt, px, pz) {
  if (!_sun || !_scene || dayState.paused) return;

  // Advance time
  dayState.time += (dt / CYCLE_DURATION) * dayState.speed;
  dayState.time = dayState.time % 1;

  var kp = getKeyPair(dayState.time);
  var a = kp.a, b = kp.b, al = kp.alpha;

  // Sun light color and intensity
  lerpColor(a.sun, b.sun, al);
  _sun.color.copy(_cOut);
  _sun.intensity = lerp(a.sunInt, b.sunInt, al);

  // Sun position (orbital arc)
  var sunPos = getSunAngle(dayState.time);
  _sun.position.set(px + sunPos.dx, sunPos.dy, pz + sunPos.dz);
  _sun.target.position.set(px, 0, pz);

  // Ambient light
  if (_ambient) {
    lerpColor(a.amb, b.amb, al);
    _ambient.color.copy(_cOut);
    _ambient.intensity = lerp(a.ambInt, b.ambInt, al);
  }

  // Hemisphere light
  if (_hemi) {
    lerpColor(a.hemiSky, b.hemiSky, al);
    _hemi.color.copy(_cOut);
    lerpColor(a.hemiGround, b.hemiGround, al);
    _hemi.groundColor.copy(_cOut);
    _hemi.intensity = lerp(a.hemiInt, b.hemiInt, al);
  }

  // Fill light
  if (_fill) {
    _fill.intensity = lerp(a.fillInt, b.fillInt, al);
  }

  // Sky/fog base colors (blended with zone theme in main.js)
  lerpColor(a.sky, b.sky, al);
  dayState._skyColor = _cOut.getHex();
  lerpColor(a.fog, b.fog, al);
  dayState._fogColor = _cOut.getHex();
}

// Get current time label for UI
export function getTimeLabel() {
  var hours = Math.floor(dayState.time * 24);
  var minutes = Math.floor((dayState.time * 24 - hours) * 60);
  return (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes;
}

// Check if it's "night" (for enabling lamppost glow, fireflies, etc.)
export function isNight() {
  return dayState.time < 0.22 || dayState.time > 0.80;
}

// Night intensity factor (0 = full day, 1 = deep night) — smooth transition
// Lamps start turning on during late afternoon for realistic feel
export function getNightFactor() {
  var t = dayState.time;
  if (t >= 0.30 && t <= 0.65) return 0; // Full day
  if (t > 0.65 && t <= 0.82) return (t - 0.65) / 0.17; // Dusk ramp (starts earlier)
  if (t > 0.82 || t < 0.20) return 1; // Full night
  if (t >= 0.20 && t < 0.30) return 1 - (t - 0.20) / 0.10; // Dawn ramp
  return 0;
}
