import { BIOME_MAP, MAP_W, MAP_H } from '../data/map.js';
import { BIOME } from '../data/biomes.js';

// Base height per biome
var BIOME_HEIGHT = {};
BIOME_HEIGHT[BIOME.PLAINS] = 0;
BIOME_HEIGHT[BIOME.FOREST] = 0.15;
BIOME_HEIGHT[BIOME.TOWN] = 0;
BIOME_HEIGHT[BIOME.ROUTE] = 0;
BIOME_HEIGHT[BIOME.LAKE] = -0.2;
BIOME_HEIGHT[BIOME.MOUNTAIN] = 0.8;
BIOME_HEIGHT[BIOME.DESERT] = 0.1;
BIOME_HEIGHT[BIOME.BEACH] = -0.05;
BIOME_HEIGHT[BIOME.SWAMP] = -0.1;
BIOME_HEIGHT[BIOME.VOLCANO] = 0.6;
BIOME_HEIGHT[BIOME.CAVE_ENTRANCE] = 0.4;

// Pre-computed height array
var HEIGHT = null;

export function initHeightMap() {
  HEIGHT = [];
  for (var z = 0; z < MAP_H; z++) {
    HEIGHT[z] = [];
    for (var x = 0; x < MAP_W; x++) {
      var biome = BIOME_MAP[z][x];
      var base = BIOME_HEIGHT[biome] !== undefined ? BIOME_HEIGHT[biome] : 0;
      // Deterministic noise for variation within biome
      var noise = hashNoise(x * 0.15, z * 0.15) * 0.12;
      HEIGHT[z][x] = base + noise;
    }
  }
  // Smooth to eliminate hard biome edges
  smooth();
  smooth(); // Two passes for gentler transitions
}

// Integer tile height lookup (for builder)
export function getHeight(x, z) {
  if (!HEIGHT) return 0;
  var ix = Math.floor(x);
  var iz = Math.floor(z);
  if (ix < 0 || iz < 0 || ix >= MAP_W || iz >= MAP_H) return 0;
  return HEIGHT[iz][ix];
}

// Bilinear interpolation for smooth player/camera Y
export function getHeightSmooth(x, z) {
  if (!HEIGHT) return 0;
  var ix = Math.floor(x);
  var iz = Math.floor(z);
  if (ix < 0 || iz < 0 || ix + 1 >= MAP_W || iz + 1 >= MAP_H) return getHeight(x, z);
  var fx = x - ix;
  var fz = z - iz;
  var h00 = HEIGHT[iz][ix];
  var h10 = HEIGHT[iz][ix + 1];
  var h01 = HEIGHT[iz + 1][ix];
  var h11 = HEIGHT[iz + 1][ix + 1];
  return h00 * (1 - fx) * (1 - fz) + h10 * fx * (1 - fz) + h01 * (1 - fx) * fz + h11 * fx * fz;
}

// Hash-based deterministic noise (fast, no dependencies)
function hashNoise(x, z) {
  var s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

// Smooth height map with 5x5 averaging kernel
function smooth() {
  var buf = [];
  for (var z = 0; z < MAP_H; z++) {
    buf[z] = [];
    for (var x = 0; x < MAP_W; x++) {
      var sum = HEIGHT[z][x] * 4; // Center has higher weight
      var count = 4;
      for (var dz = -2; dz <= 2; dz++) {
        for (var dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dz === 0) continue;
          var nz = z + dz, nx = x + dx;
          if (nz >= 0 && nz < MAP_H && nx >= 0 && nx < MAP_W) {
            sum += HEIGHT[nz][nx];
            count++;
          }
        }
      }
      buf[z][x] = sum / count;
    }
  }
  HEIGHT = buf;
}
