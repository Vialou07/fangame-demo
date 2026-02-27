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
var SD = 13, RK = 14, LV = 15;

// Building type codes (for colored roofs)
var BT_MAISON = 1, BT_LABO = 2, BT_CENTRE = 3, BT_BOUTIQUE = 4;
var BT_AUBERGE = 5, BT_CHANTIER = 6, BT_MARCHE = 7, BT_JOUEUR = 8, BT_PHARE = 9;

// ==================== BIOME LAYOUT ====================
// Each cell = 20x20 tiles → 200x200 map
var GRID_SIZE = 20;
var GRID_W = 10;
var GRID_H = 10;

// See plan for named zones
var LAYOUT = [
  [5, 5, 0, 0, 0, 0, 0, 1, 1, 1],
  [5, 9, 0, 0, 0, 0, 10, 1, 1, 1],
  [5, 5, 0, 3, 3, 2, 0, 1, 3, 1],
  [1, 3, 3, 3, 2, 2, 3, 3, 3, 6],
  [1, 1, 8, 3, 3, 3, 3, 1, 6, 6],
  [1, 8, 8, 4, 4, 3, 1, 3, 6, 6],
  [3, 3, 3, 4, 4, 3, 2, 2, 3, 7],
  [0, 0, 3, 8, 3, 3, 2, 2, 7, 7],
  [0, 0, 0, 3, 3, 1, 3, 7, 7, 7],
  [0, 0, 0, 0, 1, 1, 1, 7, 7, 7]
];

// ==================== MAP GENERATION ====================

export function generateBiomeMap(mapW, mapH) {
  var map = [];
  var biomeMap = [];
  var bldgType = [];

  for (var z = 0; z < mapH; z++) {
    map[z] = [];
    biomeMap[z] = [];
    bldgType[z] = [];
    for (var x = 0; x < mapW; x++) {
      map[z][x] = G;
      biomeMap[z][x] = BIOME.PLAINS;
      bldgType[z][x] = 0;
    }
  }

  // Pass 1: Fill tiles based on biome with edge-softening
  for (var z = 0; z < mapH; z++) {
    for (var x = 0; x < mapW; x++) {
      var gx = Math.min(Math.floor(x / GRID_SIZE), GRID_W - 1);
      var gz = Math.min(Math.floor(z / GRID_SIZE), GRID_H - 1);
      var biome = LAYOUT[gz][gx];
      biomeMap[z][x] = biome;

      // Edge softening: reduce density near biome cell borders (3 tile buffer)
      var lx = x % GRID_SIZE;
      var lz = z % GRID_SIZE;
      var edgeDist = Math.min(lx, lz, GRID_SIZE - 1 - lx, GRID_SIZE - 1 - lz);
      var edgeFactor = edgeDist < 3 ? 0.4 + (edgeDist / 3) * 0.6 : 1.0;

      var rng = seed(x * 17 + 1, z * 31 + 1);
      var def = BIOME_DEF[biome];
      var r = rng();

      if (biome === BIOME.LAKE) {
        var cx = (gx * GRID_SIZE) + GRID_SIZE / 2;
        var cz = (gz * GRID_SIZE) + GRID_SIZE / 2;
        var dist = Math.sqrt((x - cx) * (x - cx) + (z - cz) * (z - cz));
        if (dist < 7 + rng() * 2) {
          map[z][x] = W;
        } else if (dist < 9) {
          map[z][x] = r < 0.3 ? TG : G;
        } else {
          map[z][x] = r < 0.05 ? T : (r < 0.09 ? F : G);
        }
      } else if (biome === BIOME.FOREST) {
        var td = def.treeDensity * edgeFactor;
        if (r < td) map[z][x] = T;
        else if (r < td + def.tallGrass) map[z][x] = TG;
        else if (r < td + def.tallGrass + def.flowers) map[z][x] = F;
        else map[z][x] = G;
      } else if (biome === BIOME.PLAINS) {
        if (r < def.treeDensity) map[z][x] = T;
        else if (r < def.treeDensity + def.tallGrass) map[z][x] = TG;
        else if (r < def.treeDensity + def.tallGrass + def.flowers) map[z][x] = F;
        else map[z][x] = G;
      } else if (biome === BIOME.MOUNTAIN) {
        var rd = 0.20 * edgeFactor;
        var td2 = 0.10 * edgeFactor;
        if (r < rd) map[z][x] = RK;
        else if (r < rd + td2) map[z][x] = T;
        else map[z][x] = G;
      } else if (biome === BIOME.VOLCANO) {
        var lrd = 0.15 * edgeFactor;
        var rrd = 0.20 * edgeFactor;
        if (r < lrd) map[z][x] = LV;
        else if (r < lrd + rrd) map[z][x] = RK;
        else map[z][x] = G;
      } else if (biome === BIOME.DESERT) {
        if (r < 0.05 * edgeFactor) map[z][x] = RK;
        else map[z][x] = SD;
      } else if (biome === BIOME.BEACH) {
        // Deeper rows = water (ocean edge)
        var bz = z - (gz * GRID_SIZE);
        var bx = x - (gx * GRID_SIZE);
        // Water only at far edges of map
        if (gx === 9 && bx > 15) map[z][x] = W;
        else if (gz === 9 && bz > 15) map[z][x] = W;
        else if (r < 0.02) map[z][x] = T;
        else map[z][x] = SD;
      } else if (biome === BIOME.SWAMP) {
        var wd = 0.15 * edgeFactor;
        var std = 0.08 * edgeFactor;
        if (r < wd) map[z][x] = W;
        else if (r < wd + 0.20) map[z][x] = TG;
        else if (r < wd + 0.20 + std) map[z][x] = T;
        else map[z][x] = G;
      } else if (biome === BIOME.CAVE_ENTRANCE) {
        var crd = 0.20 * edgeFactor;
        if (r < crd) map[z][x] = RK;
        else if (r < crd + 0.08) map[z][x] = T;
        else map[z][x] = G;
      }
      // TOWN and ROUTE stay as grass (handled in later passes)
    }
  }

  // Pass 2: Carve ALL routes (complete network)
  carveRoutes(map, mapW, mapH);

  // Pass 3: Build towns (after routes so streets connect)
  buildTown1(map, bldgType, 80, 60);
  buildTown2(map, bldgType, 130, 130);

  // Pass 3b: Enrich Route 1 (Bourg-Aurore → Port-Ciel)
  buildRoute1(map);

  // Pass 4: Place props along routes
  placeRouteProps(map, mapW, mapH);

  // Pass 5: Border ring
  for (var x = 0; x < mapW; x++) {
    if (map[0][x] === G || map[0][x] === SD) map[0][x] = T;
    if (map[mapH - 1][x] === G || map[mapH - 1][x] === SD) map[mapH - 1][x] = T;
  }
  for (var z = 0; z < mapH; z++) {
    if (map[z][0] === G || map[z][0] === SD) map[z][0] = T;
    if (map[z][mapW - 1] === G || map[z][mapW - 1] === SD) map[z][mapW - 1] = T;
  }

  return { map: map, biomeMap: biomeMap, bldgType: bldgType };
}

// ==================== ROUTE CARVING ====================

function carveRoutes(map, mapW, mapH) {
  // === Main arteries (3-wide) ===
  // East-west highway through center (z=65)
  carvePath(map, 10, 65, 190, 65, 3, mapW, mapH);
  // North-south highway (x=90)
  carvePath(map, 90, 10, 90, 190, 3, mapW, mapH);

  // === Route 1: Bourg-Aurore → Port-Ciel (east, z=65 already covered) ===

  // === Route 2: Bourg-Aurore west ===
  carvePath(map, 20, 65, 75, 65, 2, mapW, mapH);
  carvePath(map, 30, 30, 30, 65, 2, mapW, mapH); // North to volcano area

  // === Route 3: Bourg-Aurore north to forest/cave ===
  carvePath(map, 90, 10, 90, 55, 2, mapW, mapH);
  carvePath(map, 90, 25, 130, 25, 2, mapW, mapH); // East to cave entrance

  // === Route 4: North-east plains to desert ===
  carvePath(map, 160, 45, 160, 65, 2, mapW, mapH);

  // === Route 5: Bourg-Aurore south to Port-Ciel via lake ===
  carvePath(map, 90, 80, 90, 130, 3, mapW, mapH);
  carvePath(map, 90, 130, 130, 130, 3, mapW, mapH);
  // Lake shore connection
  carvePath(map, 60, 100, 90, 100, 2, mapW, mapH);
  carvePath(map, 60, 100, 60, 130, 2, mapW, mapH);
  carvePath(map, 90, 100, 90, 110, 2, mapW, mapH);

  // === Route 6: Port-Ciel east to beach ===
  carvePath(map, 135, 130, 155, 130, 2, mapW, mapH);
  carvePath(map, 155, 130, 155, 170, 2, mapW, mapH);
  carvePath(map, 140, 170, 190, 170, 2, mapW, mapH); // Beach promenade

  // === Route 7: West traverse (south) ===
  carvePath(map, 10, 125, 55, 125, 2, mapW, mapH);
  carvePath(map, 30, 65, 30, 125, 2, mapW, mapH); // Connect from Route 2

  // === Route 8: South central ===
  carvePath(map, 65, 165, 90, 165, 2, mapW, mapH);
  carvePath(map, 90, 130, 90, 165, 2, mapW, mapH);

  // === Desert interior route ===
  carvePath(map, 160, 65, 160, 115, 2, mapW, mapH);
  carvePath(map, 160, 115, 185, 115, 2, mapW, mapH);
}

function carvePath(map, x1, z1, x2, z2, width, mapW, mapH) {
  var hw = Math.floor(width / 2);
  var cx = x1;
  var cz = z1;

  var dx = x2 > x1 ? 1 : (x2 < x1 ? -1 : 0);
  while (cx !== x2) {
    for (var w = -hw; w <= hw; w++) {
      var pz = cz + w;
      if (cx >= 0 && cx < mapW && pz >= 0 && pz < mapH) {
        if (map[pz][cx] !== D && map[pz][cx] !== H && map[pz][cx] !== R) {
          map[pz][cx] = P;
        }
      }
    }
    cx += dx;
  }

  var dz = z2 > z1 ? 1 : (z2 < z1 ? -1 : 0);
  while (cz !== z2) {
    for (var w = -hw; w <= hw; w++) {
      var px = cx + w;
      if (px >= 0 && px < mapW && cz >= 0 && cz < mapH) {
        if (map[cz][px] !== D && map[cz][px] !== H && map[cz][px] !== R) {
          map[cz][px] = P;
        }
      }
    }
    cz += dz;
  }
}

// ==================== TOWN BUILDERS ====================

function buildHouse(map, bt, x, z, type) {
  if (x + 2 >= 200 || z + 1 >= 200) return;
  map[z][x] = R; map[z][x + 1] = R; map[z][x + 2] = R;
  map[z + 1][x] = H; map[z + 1][x + 1] = D; map[z + 1][x + 2] = H;
  type = type || BT_MAISON;
  markBldg(bt, x, z, 3, 2, type);
}

function buildLargeHouse(map, bt, x, z, type) {
  if (x + 3 >= 200 || z + 1 >= 200) return;
  map[z][x] = R; map[z][x + 1] = R; map[z][x + 2] = R; map[z][x + 3] = R;
  map[z + 1][x] = H; map[z + 1][x + 1] = H; map[z + 1][x + 2] = D; map[z + 1][x + 3] = H;
  type = type || BT_MAISON;
  markBldg(bt, x, z, 4, 2, type);
}

function markBldg(bt, x, z, w, h, type) {
  for (var rz = z; rz < z + h && rz < 200; rz++) {
    for (var rx = x; rx < x + w && rx < 200; rx++) {
      bt[rz][rx] = type;
    }
  }
}

function fillRect(map, x, z, w, h, tile) {
  for (var rz = z; rz < z + h && rz < 200; rz++) {
    for (var rx = x; rx < x + w && rx < 200; rx++) {
      map[rz][rx] = tile;
    }
  }
}

function buildTown1(map, bt, cx, cz) {
  // Bourg-Aurore: centered around (cx, cz) = (80, 60)
  // Expanded area: 36x32
  fillRect(map, cx - 17, cz - 14, 36, 32, G);

  // === Main streets (cross pattern) ===
  fillRect(map, cx - 17, cz, 36, 2, P); // East-west main road
  fillRect(map, cx, cz - 14, 2, 32, P); // North-south main road

  // Secondary east-west street (south side)
  fillRect(map, cx - 12, cz + 8, 26, 1, P);
  // Secondary north-south street (west side)
  fillRect(map, cx - 8, cz - 10, 1, 22, P);

  // === Labo du Prof. Sequoia (large, 5x2, NW quadrant) ===
  buildLargeHouse(map, bt, cx - 12, cz - 6, BT_LABO);
  // Extra wing
  map[cz - 6][cx - 13] = R;
  map[cz - 5][cx - 13] = H;
  bt[cz - 6][cx - 13] = BT_LABO;
  bt[cz - 5][cx - 13] = BT_LABO;
  // Sign outside lab
  map[cz - 4][cx - 11] = S;

  // === Maison du joueur (NE, near center) ===
  buildHouse(map, bt, cx + 4, cz - 5, BT_JOUEUR);

  // === Maisons de villageois ===
  buildHouse(map, bt, cx - 6, cz - 9);          // NW house 1
  buildHouse(map, bt, cx + 4, cz - 9);          // NE house 1
  buildHouse(map, bt, cx + 8, cz - 5);          // NE house 2
  buildLargeHouse(map, bt, cx - 12, cz + 3);    // SW house 1
  buildHouse(map, bt, cx - 6, cz + 4);          // SW house 2
  buildHouse(map, bt, cx + 4, cz + 4);          // SE house 1
  buildLargeHouse(map, bt, cx + 7, cz + 4);     // SE house 2
  buildHouse(map, bt, cx - 6, cz + 10);         // South house 1
  buildHouse(map, bt, cx + 4, cz + 10);         // South house 2

  // === Parc (NE area) ===
  fillRect(map, cx + 5, cz - 12, 8, 4, G);
  map[cz - 12][cx + 5] = F; map[cz - 12][cx + 7] = F; map[cz - 12][cx + 9] = F; map[cz - 12][cx + 11] = F;
  map[cz - 11][cx + 6] = F; map[cz - 11][cx + 10] = F;
  map[cz - 10][cx + 5] = T; map[cz - 10][cx + 8] = B; map[cz - 10][cx + 12] = T;
  map[cz - 9][cx + 7] = F; map[cz - 9][cx + 9] = F; map[cz - 9][cx + 11] = F;

  // === Etang (SW area, 5x4 water + shore) ===
  fillRect(map, cx - 15, cz + 9, 7, 5, G); // Clear area
  fillRect(map, cx - 14, cz + 10, 5, 3, W); // Water
  map[cz + 9][cx - 13] = F; map[cz + 9][cx - 11] = F; // Flowers on shore
  map[cz + 13][cx - 13] = F; map[cz + 13][cx - 11] = F;
  map[cz + 11][cx - 15] = T; // Tree by pond
  map[cz + 12][cx - 10] = B; // Bench facing pond

  // === Lampadaires le long des rues ===
  map[cz - 1][cx - 3] = L;
  map[cz - 1][cx + 3] = L;
  map[cz + 2][cx - 3] = L;
  map[cz + 2][cx + 3] = L;
  map[cz - 1][cx - 10] = L;
  map[cz + 2][cx + 8] = L;
  map[cz + 7][cx - 3] = L;
  map[cz + 7][cx + 3] = L;

  // === Bancs ===
  map[cz][cx - 5] = B;
  map[cz][cx + 6] = B;
  map[cz + 8][cx - 5] = B;

  // === Jardin fleuri (SE) ===
  fillRect(map, cx + 8, cz + 8, 5, 4, F);
  map[cz + 9][cx + 10] = B;

  // === Clôtures d'entrée ===
  map[cz - 14][cx] = S; // Welcome sign north
  for (var i = 0; i < 6; i++) {
    map[cz - 14][cx - 7 + i] = N;
    map[cz - 14][cx + 3 + i] = N;
  }
  map[cz + 17][cx] = S; // Welcome sign south
  for (var i = 0; i < 6; i++) {
    map[cz + 17][cx - 7 + i] = N;
    map[cz + 17][cx + 3 + i] = N;
  }

  // === Petit chemin vers l'étang ===
  fillRect(map, cx - 8, cz + 10, 3, 1, P); // Connect secondary street to pond area
}

function buildTown2(map, bt, cx, cz) {
  // Port-Ciel: ville portuaire centered around (cx, cz) = (130, 130)
  // Expanded area: 34x30
  fillRect(map, cx - 16, cz - 13, 34, 30, G);

  // === Main streets ===
  fillRect(map, cx - 16, cz, 34, 2, P); // E-W main street
  fillRect(map, cx, cz - 13, 2, 30, P); // N-S main street
  // Boardwalk street (south, along water)
  fillRect(map, cx - 12, cz + 10, 28, 1, P);

  // === Quai / Dock (south edge, wooden path over water) ===
  fillRect(map, cx - 10, cz + 12, 24, 2, P); // Dock planks
  fillRect(map, cx - 10, cz + 14, 24, 3, W); // Harbor water
  // Dock pillars (fences as pilings)
  for (var i = 0; i < 6; i++) {
    map[cz + 12][cx - 9 + i * 4] = N;
    map[cz + 13][cx - 9 + i * 4] = N;
  }

  // === Plage (SE corner, sand + water) ===
  fillRect(map, cx + 10, cz + 8, 8, 4, SD);  // Sand beach
  fillRect(map, cx + 10, cz + 12, 8, 2, SD);  // Sand near water
  fillRect(map, cx + 10, cz + 14, 8, 3, W);   // Ocean

  // === Bâtiments — quartier nord ===
  buildLargeHouse(map, bt, cx - 10, cz - 6, BT_CENTRE);   // Centre Pokemon (large)
  buildHouse(map, bt, cx - 4, cz - 6);                     // Maison 1
  buildHouse(map, bt, cx + 4, cz - 6, BT_BOUTIQUE);       // Boutique
  buildLargeHouse(map, bt, cx + 8, cz - 6, BT_AUBERGE);   // Auberge

  // === Bâtiments — quartier nord-est ===
  buildHouse(map, bt, cx - 10, cz - 10);
  buildHouse(map, bt, cx + 4, cz - 10);

  // === Bâtiments — quartier sud ===
  buildLargeHouse(map, bt, cx - 12, cz + 4, BT_CHANTIER);  // Chantier naval
  buildHouse(map, bt, cx - 6, cz + 4);                       // Maison pêcheur 1
  buildHouse(map, bt, cx + 4, cz + 4);                       // Maison pêcheur 2
  buildLargeHouse(map, bt, cx + 4, cz + 7, BT_MARCHE);      // Marché aux poissons

  // === Phare (NE, tall landmark — simulated with stacked roofs) ===
  map[cz - 11][cx + 10] = R;
  map[cz - 11][cx + 11] = R;
  map[cz - 10][cx + 10] = H;
  map[cz - 10][cx + 11] = H;
  map[cz - 12][cx + 10] = R;
  map[cz - 12][cx + 11] = R;
  markBldg(bt, cx + 10, cz - 12, 2, 3, BT_PHARE);

  // === Place du marché (paved area) ===
  fillRect(map, cx + 5, cz - 3, 5, 5, P);
  map[cz - 2][cx + 7] = L; // Lamp in market
  map[cz + 1][cx + 6] = B; // Bench in market

  // === Lampadaires ===
  map[cz - 1][cx - 4] = L;
  map[cz - 1][cx + 3] = L;
  map[cz + 2][cx - 4] = L;
  map[cz + 2][cx + 3] = L;
  map[cz + 10][cx - 6] = L;
  map[cz + 10][cx + 3] = L;
  map[cz + 10][cx + 8] = L;
  map[cz - 7][cx - 4] = L;
  map[cz - 7][cx + 3] = L;

  // === Bancs face à la mer ===
  map[cz + 11][cx - 5] = B;
  map[cz + 11][cx + 2] = B;
  map[cz + 11][cx + 8] = B;

  // === Fleurs et déco ===
  map[cz - 3][cx - 6] = F; map[cz - 3][cx - 5] = F;
  map[cz + 3][cx - 4] = F;
  map[cz - 8][cx + 7] = F; map[cz - 8][cx + 8] = F;
  map[cz + 6][cx - 14] = F; map[cz + 6][cx - 13] = F;

  // === Panneaux ===
  map[cz - 13][cx] = S; // Welcome sign north
  map[cz + 11][cx - 2] = S; // Port sign

  // === Clôtures d'entrée ===
  for (var i = 0; i < 5; i++) {
    map[cz - 13][cx - 6 + i] = N;
    map[cz - 13][cx + 3 + i] = N;
  }
}

// ==================== ROUTE 1: Sentier des Premiers Pas ====================
// Bourg-Aurore (80,60) → south via (90,80-130) → east to Port-Ciel (130,130)

function buildRoute1(map) {
  // Tall grass patches flanking the N-S route (x=89-92, z=78-125)
  // West side tall grass zones
  fillRect(map, 85, 80, 3, 5, TG);   // Patch 1
  fillRect(map, 84, 90, 4, 4, TG);   // Patch 2
  fillRect(map, 85, 100, 3, 6, TG);  // Patch 3
  fillRect(map, 84, 112, 4, 5, TG);  // Patch 4

  // East side tall grass zones
  fillRect(map, 93, 83, 3, 4, TG);   // Patch 5
  fillRect(map, 94, 95, 4, 5, TG);   // Patch 6
  fillRect(map, 93, 108, 3, 5, TG);  // Patch 7
  fillRect(map, 94, 120, 3, 4, TG);  // Patch 8

  // Scattered trees along route (natural corridor feel)
  var treePosW = [[83,82],[83,88],[82,95],[83,103],[82,110],[83,118],[83,125]];
  var treePosE = [[96,80],[97,87],[96,93],[97,101],[96,107],[97,115],[96,123]];
  for (var i = 0; i < treePosW.length; i++) {
    map[treePosW[i][1]][treePosW[i][0]] = T;
  }
  for (var i = 0; i < treePosE.length; i++) {
    map[treePosE[i][1]][treePosE[i][0]] = T;
  }

  // Route signs and lamps at key points
  map[78][88] = S;   // "Route 1 — Sentier des Premiers Pas"
  map[85][93] = L;   // Lamp post
  map[95][88] = L;   // Lamp post
  map[105][93] = L;  // Lamp post
  map[115][88] = L;  // Lamp post
  map[125][88] = S;  // Direction sign to Port-Ciel

  // Rest area mid-route (z~100, bench + flowers)
  map[100][87] = B;
  map[99][86] = F;
  map[101][86] = F;
  map[100][86] = L;

  // Old tree landmark (mini-boss area from script: "vieil arbre creux")
  map[93][85] = T;
  map[92][85] = T;
  map[93][84] = T;
  map[92][84] = F;

  // East-west connector path z=130 already carved (Port-Ciel approach)
  // Add tall grass along that connector too
  fillRect(map, 100, 128, 5, 2, TG);
  fillRect(map, 110, 132, 4, 2, TG);
  fillRect(map, 118, 128, 4, 2, TG);
}

// ==================== ROUTE PROPS ====================

function placeRouteProps(map, mapW, mapH) {
  for (var z = 1; z < mapH - 1; z++) {
    for (var x = 1; x < mapW - 1; x++) {
      if (map[z][x] !== P) continue;
      var rng = seed(x * 991 + 3, z * 877 + 7);
      var r = rng();

      if (r < 0.003 && map[z - 1][x] === G) {
        map[z - 1][x] = S;
      } else if (r < 0.015 && map[z][x + 1] === G) {
        map[z][x + 1] = L;
      } else if (r < 0.020 && map[z + 1][x] === G) {
        map[z + 1][x] = B;
      }
    }
  }
}
