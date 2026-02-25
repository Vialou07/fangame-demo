export var TILE = 1;
export var MAP_W = 40;
export var MAP_H = 30;
export var MOVE_SPEED = 3.2;

export var G = 0, P = 1, W = 2, T = 3, H = 4, R = 5, D = 6, F = 7;
export var S = 8, B = 9, L = 10, N = 11; // Sign, Bench, Lamp, Fence
export var TG = 12; // Tall Grass (walkable, encounter zone)

// Generate the 40x30 map programmatically
export var MAP = generateMap();

export function isBlocked(x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true;
  var t = MAP[y][x];
  return t === T || t === H || t === R || t === W || t === S || t === B || t === L || t === N;
}

// ----- Map generator -----

function fillArea(map, x, y, w, h, tile) {
  for (var row = y; row < y + h && row < MAP_H; row++) {
    for (var col = x; col < x + w && col < MAP_W; col++) {
      map[row][col] = tile;
    }
  }
}

function buildHouse(map, x, y) {
  // 3-wide house: roof row, wall row with door in center
  fillArea(map, x, y, 3, 1, R);
  map[y + 1][x] = H;
  map[y + 1][x + 1] = D;
  map[y + 1][x + 2] = H;
}

function buildLargeHouse(map, x, y) {
  // 4-wide house: roof row, wall row with door
  fillArea(map, x, y, 4, 1, R);
  map[y + 1][x] = H;
  map[y + 1][x + 1] = H;
  map[y + 1][x + 2] = D;
  map[y + 1][x + 3] = H;
}

function generateMap() {
  // Create empty map filled with grass
  var map = [];
  for (var row = 0; row < MAP_H; row++) {
    map[row] = [];
    for (var col = 0; col < MAP_W; col++) {
      map[row][col] = G;
    }
  }

  // ========================================
  // DENSE FOREST (top rows 0-8, full width)
  // ========================================
  for (var row = 0; row < 7; row++) {
    for (var col = 0; col < MAP_W; col++) {
      // Dense trees with narrow paths
      var seed = (col * 7 + row * 13) % 10;
      if (seed < 7) map[row][col] = T;
      else map[row][col] = G;
    }
  }
  // Forest path winding east-west at row 3
  fillArea(map, 4, 3, 8, 1, P);
  fillArea(map, 15, 3, 6, 1, P);
  fillArea(map, 24, 3, 10, 1, P);
  // Connectors between path segments
  map[2][12] = P; map[3][12] = P; map[4][12] = P;
  map[2][21] = P; map[3][21] = P; map[4][21] = P;
  // Some flowers in forest clearings
  map[1][8] = F; map[2][8] = G; map[4][9] = F;
  map[1][26] = F; map[5][30] = F;
  // Tall grass patches in forest
  fillArea(map, 6, 5, 3, 2, TG);
  fillArea(map, 28, 5, 4, 2, TG);

  // Transition row (row 7-8): thin tree line + grass
  for (var col = 0; col < MAP_W; col++) {
    var s = (col * 11 + 7) % 6;
    map[7][col] = s < 2 ? T : G;
    map[8][col] = G;
  }

  // ========================================
  // ROUTE 2 (west side, cols 0-10, rows 9-20)
  // ========================================
  // Tall grass encounter zones along western route
  fillArea(map, 0, 9, 3, 2, TG);
  fillArea(map, 0, 13, 3, 3, TG);
  fillArea(map, 0, 18, 4, 2, TG);
  // Path going south (narrow, 2 tiles wide)
  fillArea(map, 4, 9, 2, 12, P);
  // Trees flanking the path
  for (var row = 9; row <= 20; row++) {
    if (row % 3 === 0) { map[row][3] = T; map[row][7] = T; }
    if (row % 4 === 1) { map[row][8] = T; }
  }
  // Fences along route 2
  map[9][6] = N; map[10][6] = N; map[11][6] = N;
  // Sign at route entrance
  map[9][3] = S;
  // Flowers scattered
  map[11][1] = F; map[15][2] = F; map[18][1] = F;

  // ========================================
  // BOURG-AURORE (center, cols 13-26, rows 10-19)
  // ========================================
  // Central plaza - wide path area
  fillArea(map, 13, 14, 14, 2, P); // Main street (east-west)
  fillArea(map, 19, 10, 2, 10, P); // Main street (north-south)

  // Connect route 2 to town
  fillArea(map, 6, 14, 7, 2, P);

  // House 1 (top-left of town)
  buildHouse(map, 14, 11);
  map[13][15] = F; // Garden flower

  // House 2 (top-right of town)
  buildLargeHouse(map, 22, 11);
  map[13][23] = F; map[13][24] = F;

  // House 3 (bottom-left of town)
  buildHouse(map, 14, 17);
  map[19][14] = P; // Connect to main street

  // House 4 (bottom-right - larger)
  buildLargeHouse(map, 22, 17);

  // Town decorations
  map[14][13] = L; // Lamp post west entrance
  map[14][27] = L; // Lamp post east
  map[15][17] = B; // Bench near plaza
  map[15][21] = B; // Bench near plaza
  map[10][20] = S; // Welcome sign north
  map[16][18] = F; // Flower in plaza
  map[16][21] = F;

  // Fence around town (partial, south)
  fillArea(map, 13, 20, 1, 1, N);
  fillArea(map, 27, 20, 1, 1, N);

  // Green areas in town
  map[12][13] = G; map[12][27] = G;
  map[16][13] = G; map[16][27] = G;

  // ========================================
  // EAST AREA (cols 28-39, rows 8-20) - Forest + meadow
  // ========================================
  // Connect town to east
  fillArea(map, 27, 14, 5, 2, P);

  // Eastern meadow with tall grass encounters
  fillArea(map, 33, 10, 5, 3, TG);
  fillArea(map, 34, 14, 4, 3, TG);
  fillArea(map, 33, 18, 5, 2, TG);

  // Trees bordering the east
  for (var row = 8; row <= 20; row++) {
    map[row][39] = T;
    if (row % 2 === 0) map[row][38] = T;
  }
  // Some trees in meadow
  map[11][35] = T; map[13][37] = T; map[16][36] = T;
  map[19][35] = T; map[10][32] = T;

  // East path winding through
  fillArea(map, 32, 14, 1, 2, P);
  map[12][33] = P; map[13][33] = P; map[14][33] = P;
  map[17][33] = P; map[18][33] = P;

  // Flowers and bench
  map[12][34] = F; map[15][37] = F;
  map[15][32] = B;

  // ========================================
  // LAKE (south-west, cols 2-12, rows 22-28)
  // ========================================
  // Water body
  fillArea(map, 4, 23, 7, 5, W);
  // Irregular edges
  map[23][5] = G; map[23][10] = G; // Notches
  map[27][4] = G; map[27][10] = G;
  map[22][6] = W; map[22][7] = W; map[22][8] = W; // North extension
  map[28][6] = W; map[28][7] = W; // South extension

  // Sandy shore (use path tiles for sand effect)
  map[22][4] = P; map[22][5] = P; map[22][9] = P; map[22][10] = P;
  map[23][3] = P; map[24][3] = P; map[25][3] = P; map[26][3] = P; map[27][3] = P;
  map[23][11] = P; map[24][11] = P; map[25][11] = P; map[26][11] = P; map[27][11] = P;
  map[28][4] = P; map[28][5] = P; map[28][8] = P; map[28][9] = P; map[28][10] = P;

  // Benches by the lake
  map[23][2] = B; map[26][12] = B;

  // Flowers near lake
  map[22][3] = F; map[22][11] = F; map[28][3] = F;
  map[21][5] = F; map[21][8] = F;

  // Trees around lake
  map[21][2] = T; map[21][11] = T; map[21][12] = T;
  map[29][3] = T; map[29][4] = T; map[29][10] = T; map[29][11] = T;
  map[23][1] = T; map[26][1] = T;

  // Connect town south to lake area
  fillArea(map, 19, 20, 2, 3, P);
  fillArea(map, 12, 22, 8, 1, P); // Path east-west to lake

  // ========================================
  // ROUTE 1 SOUTH (cols 15-30, rows 22-29)
  // ========================================
  // Wide path (3 tiles) going south
  fillArea(map, 19, 22, 3, 8, P);

  // Tall grass along route 1
  fillArea(map, 15, 23, 3, 3, TG);
  fillArea(map, 23, 23, 3, 3, TG);
  fillArea(map, 16, 27, 2, 2, TG);
  fillArea(map, 23, 27, 3, 2, TG);

  // Trees and decorations along route
  map[22][15] = T; map[22][26] = T;
  map[24][14] = T; map[25][27] = T;
  map[27][14] = T; map[28][27] = T;
  map[22][18] = S; // Route 1 sign
  map[25][22] = L; // Lamp on route
  map[26][18] = F; map[28][24] = F;

  // ========================================
  // BORDERS - tree ring around entire map
  // ========================================
  // Only place trees on border if the cell is still default grass
  for (var col = 0; col < MAP_W; col++) {
    if (map[0][col] === G) map[0][col] = T;
    if (map[MAP_H - 1][col] === G) map[MAP_H - 1][col] = T;
  }
  for (var row = 0; row < MAP_H; row++) {
    if (map[row][0] === G) map[row][0] = T;
    if (map[row][MAP_W - 1] === G) map[row][MAP_W - 1] = T;
  }

  return map;
}
