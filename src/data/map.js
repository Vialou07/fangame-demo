import { generateBiomeMap } from '../world/biomeGen.js';

export var TILE = 1;
export var MAP_W = 200;
export var MAP_H = 200;
export var MOVE_SPEED = 3.2;

export var G = 0, P = 1, W = 2, T = 3, H = 4, R = 5, D = 6, F = 7;
export var S = 8, B = 9, L = 10, N = 11; // Sign, Bench, Lamp, Fence
export var TG = 12; // Tall Grass (walkable, encounter zone)
export var SD = 13; // Sand (walkable)
export var RK = 14; // Rock (blocking)
export var LV = 15; // Lava (blocking)

// Generate the 200x200 map using biome system
var _gen = generateBiomeMap(MAP_W, MAP_H);
export var MAP = _gen.map;
export var BIOME_MAP = _gen.biomeMap;

export function isBlocked(x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true;
  var t = MAP[y][x];
  return t === T || t === H || t === R || t === W || t === S || t === B || t === L || t === N || t === RK || t === LV;
}
