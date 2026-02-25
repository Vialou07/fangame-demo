import { BIOME, BIOME_DEF } from '../data/biomes.js';

// Deterministic PRNG (same as builder.js tileSeed)
function seed(a, b) {
  var s = (a * 73856093) ^ (b * 19349669);
  return function() {
    s = (s ^ (s << 13)) & 0x7fffffff;
    s = (s ^ (s >> 17)) & 0x7fffffff;
    s = (s ^ (s << 5)) & 0x7fffffff;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

// Tile codes (must match map.js)
var G = 0, P = 1, W = 2, T = 3, H = 4, R = 5, D = 6, F = 7;
var S = 8, B = 9, L = 10, N = 11, TG = 12;
// New tile types
var SD = 13; // Sand
var RK = 14; // Rock (blocking)
var LV = 15; // Lava (blocking)

// ==================== BIOME LAYOUT (coarse grid) ====================
// Each cell = 20x20 tiles in the final 200x200 map (10x10 grid)
// Layout:
//   Row 0: Mountain | Mountain | Forest   | Forest   | Forest   | Forest   | Forest   | Plains  | Plains  | Plains
//   Row 1: Mountain | Volcano  | Forest   | Forest   | Forest   | Forest   | Cave     | Plains  | Plains  | Plains
//   Row 2: Mountain | Mountain | Forest   | Route    | Route    | Town1    | Forest   | Plains  | Route   | Plains
//   Row 3: Plains   | Route    | Route    | Route    | Town1    | Town1    | Route    | Route   | Route   | Desert
//   Row 4: Plains   | Plains   | Swamp    | Route    | Town1    | Route    | Route    | Plains  | Desert  | Desert
//   Row 5: Plains   | Swamp    | Swamp    | Lake     | Lake     | Route    | Plains   | Route   | Desert  | Desert
//   Row 6: Route    | Route    | Route    | Lake     | Lake     | Route    | Town2    | Town2   | Route   | Beach
//   Row 7: Forest   | Forest   | Route    | Swamp    | Route    | Route    | Town2    | Town2   | Beach   | Beach
//   Row 8: Forest   | Forest   | Forest   | Route    | Route    | Plains   | Route    | Beach   | Beach   | Beach
//   Row 9: Forest   | Forest   | Forest   | Forest   | Plains   | Plains   | Plains   | Beach   | Beach   | Beach

var GRID_SIZE = 20; // Each biome cell = 20x20 tiles
var GRID_W = 10;
var GRID_H = 10;

var LAYOUT = [
  [5, 5, 0, 0, 0, 0, 0, 1, 1, 1],
  [5, 9, 0, 0, 0, 0, 10, 1, 1, 1],
  [5, 5, 0, 3, 3, 2, 0, 1, 3, 1],
  [1, 3, 3, 3, 2, 2, 3, 3, 3, 6],
  [1, 1, 8, 3, 2, 3, 3, 1, 6, 6],
  [1, 8, 8, 4, 4, 3, 1, 3, 6, 6],
  [3, 3, 3, 4, 4, 3, 2, 2, 3, 7],
  [0, 0, 3, 8, 3, 3, 2, 2, 7, 7],
  [0, 0, 0, 3, 3, 1, 3, 7, 7, 7],
  [0, 0, 0, 0, 1, 1, 1, 7, 7, 7]
];

// ==================== MAP GENERATION ====================

export function generateBiomeMap(mapW, mapH) {
  var map = [];
  var biomeMap = []; // Store biome per tile for builder context

  // Initialize with grass
  for (var z = 0; z < mapH; z++) {
    map[z] = [];
    biomeMap[z] = [];
    for (var x = 0; x < mapW; x++) {
      map[z][x] = G;
      biomeMap[z][x] = BIOME.PLAINS;
    }
  }

  // Pass 1: Fill tiles based on biome layout
  for (var z = 0; z < mapH; z++) {
    for (var x = 0; x < mapW; x++) {
      var gx = Math.min(Math.floor(x / GRID_SIZE), GRID_W - 1);
      var gz = Math.min(Math.floor(z / GRID_SIZE), GRID_H - 1);
      var biome = LAYOUT[gz][gx];
      biomeMap[z][x] = biome;

      var rng = seed(x * 17 + 1, z * 31 + 1);
      var def = BIOME_DEF[biome];
      var r = rng();

      if (biome === BIOME.LAKE) {
        // Lakes: water center, grass/reeds edges
        var lx = x % GRID_SIZE;
        var lz = z % GRID_SIZE;
        var cx = GRID_SIZE / 2;
        var cz = GRID_SIZE / 2;
        var dist = Math.sqrt((lx - cx) * (lx - cx) + (lz - cz) * (lz - cz));
        if (dist < 7 + rng() * 2) {
          map[z][x] = W;
        } else if (dist < 9) {
          map[z][x] = r < 0.3 ? TG : G;
        } else {
          map[z][x] = r < def.treeDensity ? T : (r < def.treeDensity + def.flowers ? F : G);
        }
      } else if (biome === BIOME.FOREST) {
        if (r < def.treeDensity) map[z][x] = T;
        else if (r < def.treeDensity + def.tallGrass) map[z][x] = TG;
        else if (r < def.treeDensity + def.tallGrass + def.flowers) map[z][x] = F;
        else map[z][x] = G;
      } else if (biome === BIOME.PLAINS) {
        if (r < def.treeDensity) map[z][x] = T;
        else if (r < def.treeDensity + def.tallGrass) map[z][x] = TG;
        else if (r < def.treeDensity + def.tallGrass + def.flowers) map[z][x] = F;
        else map[z][x] = G;
      } else if (biome === BIOME.MOUNTAIN) {
        if (r < 0.35) map[z][x] = RK;
        else if (r < 0.5) map[z][x] = T;
        else map[z][x] = G;
      } else if (biome === BIOME.VOLCANO) {
        if (r < 0.25) map[z][x] = LV;
        else if (r < 0.55) map[z][x] = RK;
        else map[z][x] = G;
      } else if (biome === BIOME.DESERT) {
        if (r < 0.08) map[z][x] = RK;
        else map[z][x] = SD;
      } else if (biome === BIOME.BEACH) {
        var bz = z % GRID_SIZE;
        if (bz > 14) map[z][x] = W;
        else if (r < 0.02) map[z][x] = T;
        else map[z][x] = SD;
      } else if (biome === BIOME.SWAMP) {
        if (r < 0.25) map[z][x] = W;
        else if (r < 0.5) map[z][x] = TG;
        else if (r < 0.62) map[z][x] = T;
        else map[z][x] = G;
      } else if (biome === BIOME.CAVE_ENTRANCE) {
        if (r < 0.3) map[z][x] = RK;
        else if (r < 0.4) map[z][x] = T;
        else map[z][x] = G;
      }
      // TOWN and ROUTE are handled in pass 2
    }
  }

  // Pass 2: Carve routes (3-wide paths connecting towns)
  carveRoutes(map, mapW, mapH);

  // Pass 3: Build towns
  buildTown1(map, 80, 60); // Bourg-Aurore (grid 4,3 area)
  buildTown2(map, 130, 130); // Ville Portuaire (grid 6-7, 6-7 area)

  // Pass 4: Place props along routes
  placeRouteProps(map, mapW, mapH, biomeMap);

  // Pass 5: Border ring of trees
  for (var x = 0; x < mapW; x++) {
    if (map[0][x] === G || map[0][x] === SD) map[0][x] = T;
    if (map[mapH - 1][x] === G || map[mapH - 1][x] === SD) map[mapH - 1][x] = T;
  }
  for (var z = 0; z < mapH; z++) {
    if (map[z][0] === G || map[z][0] === SD) map[z][0] = T;
    if (map[z][mapW - 1] === G || map[z][mapW - 1] === SD) map[z][mapW - 1] = T;
  }

  return { map: map, biomeMap: biomeMap };
}

// ==================== ROUTE CARVING ====================

function carveRoutes(map, mapW, mapH) {
  // Main horizontal route at z=65 (row 3 center) connecting west to east
  carvePath(map, 10, 65, 190, 65, 3, mapW, mapH);

  // Main vertical route at x=90 connecting north to south
  carvePath(map, 90, 10, 90, 190, 3, mapW, mapH);

  // Route from Bourg-Aurore east to desert
  carvePath(map, 100, 65, 180, 65, 3, mapW, mapH);

  // Route from Bourg-Aurore south to Town 2
  carvePath(map, 90, 80, 90, 130, 3, mapW, mapH);
  carvePath(map, 90, 130, 130, 130, 3, mapW, mapH);

  // Route from Town 2 south to beach
  carvePath(map, 135, 145, 135, 170, 3, mapW, mapH);

  // Route north to mountain/cave
  carvePath(map, 90, 10, 90, 55, 2, mapW, mapH);

  // Route from forest to town (northwest)
  carvePath(map, 30, 65, 75, 65, 2, mapW, mapH);

  // Route to volcano area
  carvePath(map, 30, 30, 30, 60, 2, mapW, mapH);

  // Lake shore path
  carvePath(map, 60, 105, 80, 105, 2, mapW, mapH);
  carvePath(map, 60, 105, 60, 125, 2, mapW, mapH);

  // Desert route
  carvePath(map, 160, 65, 160, 110, 2, mapW, mapH);

  // Beach promenade
  carvePath(map, 140, 170, 190, 170, 2, mapW, mapH);
}

function carvePath(map, x1, z1, x2, z2, width, mapW, mapH) {
  var hw = Math.floor(width / 2);
  // Simple line carving (horizontal then vertical)
  var cx = x1;
  var cz = z1;

  // Move horizontally first
  var dx = x2 > x1 ? 1 : (x2 < x1 ? -1 : 0);
  while (cx !== x2) {
    for (var w = -hw; w <= hw; w++) {
      var px = cx;
      var pz = cz + w;
      if (px >= 0 && px < mapW && pz >= 0 && pz < mapH) {
        if (map[pz][px] !== D && map[pz][px] !== H && map[pz][px] !== R) {
          map[pz][px] = P;
        }
      }
    }
    cx += dx;
  }

  // Then vertically
  var dz = z2 > z1 ? 1 : (z2 < z1 ? -1 : 0);
  while (cz !== z2) {
    for (var w = -hw; w <= hw; w++) {
      var px = cx + w;
      var pz = cz;
      if (px >= 0 && px < mapW && pz >= 0 && pz < mapH) {
        if (map[pz][px] !== D && map[pz][px] !== H && map[pz][px] !== R) {
          map[pz][px] = P;
        }
      }
    }
    cz += dz;
  }
}

// ==================== TOWN BUILDERS ====================

function buildHouse(map, x, z) {
  // 3-wide: roof, wall+door+wall
  if (x + 2 >= 200 || z + 1 >= 200) return;
  map[z][x] = R; map[z][x + 1] = R; map[z][x + 2] = R;
  map[z + 1][x] = H; map[z + 1][x + 1] = D; map[z + 1][x + 2] = H;
}

function buildLargeHouse(map, x, z) {
  if (x + 3 >= 200 || z + 1 >= 200) return;
  map[z][x] = R; map[z][x + 1] = R; map[z][x + 2] = R; map[z][x + 3] = R;
  map[z + 1][x] = H; map[z + 1][x + 1] = H; map[z + 1][x + 2] = D; map[z + 1][x + 3] = H;
}

function fillRect(map, x, z, w, h, tile) {
  for (var rz = z; rz < z + h && rz < 200; rz++) {
    for (var rx = x; rx < x + w && rx < 200; rx++) {
      map[rz][rx] = tile;
    }
  }
}

function buildTown1(map, cx, cz) {
  // Bourg-Aurore: centered around (cx, cz), ~20x20 area
  // Clear area to grass first
  fillRect(map, cx - 10, cz - 8, 22, 18, G);

  // Main streets
  fillRect(map, cx - 10, cz, 22, 2, P); // East-west main street
  fillRect(map, cx, cz - 8, 2, 18, P);  // North-south main street

  // Houses
  buildHouse(map, cx - 7, cz - 5);
  buildLargeHouse(map, cx + 4, cz - 5);
  buildHouse(map, cx - 7, cz + 4);
  buildLargeHouse(map, cx + 4, cz + 4);
  buildHouse(map, cx - 3, cz - 6);
  buildHouse(map, cx + 8, cz - 3);

  // Decorations
  map[cz - 1][cx - 2] = L; // Lamp
  map[cz - 1][cx + 3] = L;
  map[cz + 2][cx - 2] = L;
  map[cz + 2][cx + 3] = L;
  map[cz - 2][cx - 4] = F; // Flowers
  map[cz - 2][cx + 6] = F;
  map[cz + 3][cx - 4] = F;
  map[cz + 3][cx + 6] = F;
  map[cz][cx - 4] = B; // Benches
  map[cz][cx + 5] = B;
  map[cz - 8][cx] = S; // Welcome sign
  // Small garden
  fillRect(map, cx + 6, cz + 6, 4, 3, F);
  map[cz + 7][cx + 7] = B;
  // Fences
  for (var i = 0; i < 5; i++) {
    map[cz - 8][cx - 5 + i] = N;
    map[cz + 9][cx - 5 + i] = N;
  }
}

function buildTown2(map, cx, cz) {
  // Ville Portuaire: coastal town, centered around (cx, cz), ~18x18
  fillRect(map, cx - 8, cz - 7, 18, 16, G);

  // Main streets
  fillRect(map, cx - 8, cz, 18, 2, P);
  fillRect(map, cx, cz - 7, 2, 16, P);

  // Houses (more densely packed)
  buildHouse(map, cx - 6, cz - 4);
  buildHouse(map, cx + 4, cz - 4);
  buildLargeHouse(map, cx - 6, cz + 3);
  buildLargeHouse(map, cx + 3, cz + 3);
  buildHouse(map, cx - 3, cz - 6);
  buildHouse(map, cx + 4, cz + 6);

  // Market area (path square)
  fillRect(map, cx + 5, cz - 2, 4, 4, P);

  // Decorations
  map[cz - 1][cx - 3] = L;
  map[cz - 1][cx + 3] = L;
  map[cz + 2][cx - 3] = L;
  map[cz + 2][cx + 3] = L;
  map[cz][cx - 3] = B;
  map[cz][cx + 8] = B;
  map[cz - 7][cx] = S;
  map[cz - 2][cx - 5] = F;
  map[cz + 5][cx + 7] = F;
}

// ==================== ROUTE PROPS ====================

function placeRouteProps(map, mapW, mapH, biomeMap) {
  for (var z = 1; z < mapH - 1; z++) {
    for (var x = 1; x < mapW - 1; x++) {
      if (map[z][x] !== P) continue;
      var rng = seed(x * 991 + 3, z * 877 + 7);
      var r = rng();

      // Only place props next to paths, on grass tiles
      if (r < 0.003 && map[z - 1][x] === G) {
        map[z - 1][x] = S; // Sign
      } else if (r < 0.006 && map[z][x + 1] === G) {
        map[z][x + 1] = L; // Lamp
      } else if (r < 0.009 && map[z + 1][x] === G) {
        map[z + 1][x] = B; // Bench
      }
    }
  }
}
