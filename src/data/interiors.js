// Interior tile codes (100+ to avoid conflicts with exterior codes)
export var FL = 100;     // Floor (walkable)
export var WL = 101;     // Wall (blocking)
export var DX = 102;     // Door exit (walkable, triggers exit)
export var CT = 103;     // Counter/desk (blocking)
export var TB = 104;     // Table (blocking)
export var CH = 105;     // Chair (walkable, decorative)
export var SH = 106;     // Shelf/bookcase (blocking)
export var BD = 107;     // Bed (blocking)
export var RG = 108;     // Rug (walkable, decorative)
export var NP = 110;     // NPC spot (blocking)
export var PC = 111;     // PC/Computer (blocking)
export var PT = 112;     // Potted plant (blocking)
export var HM = 113;     // Healing machine (blocking, Pokemon Center)
export var CB = 114;     // Cabinet (blocking)

// Interior definitions per building type
// Each layout[z][x] where z=0 is north wall (top)
export var INTERIORS = {};

// BT_MAISON = 1 — Simple house (8x8)
INTERIORS[1] = {
  name: 'Maison',
  width: 8, height: 8,
  spawnX: 3, spawnZ: 6,
  floorColor: 0xC8A870,
  layout: [
    [WL, WL, WL, WL, WL, WL, WL, WL],
    [WL, FL, FL, FL, FL, FL, FL, WL],
    [WL, FL, SH, FL, FL, BD, BD, WL],
    [WL, FL, FL, FL, FL, FL, FL, WL],
    [WL, FL, TB, CH, FL, PT, FL, WL],
    [WL, FL, FL, FL, FL, FL, FL, WL],
    [WL, FL, FL, FL, FL, FL, FL, WL],
    [WL, WL, WL, DX, DX, WL, WL, WL],
  ]
};

// BT_LABO = 2 — Professor's Laboratory (12x10)
INTERIORS[2] = {
  name: 'Laboratoire du Prof. Sequoia',
  width: 12, height: 10,
  spawnX: 5, spawnZ: 8,
  floorColor: 0xE0E0E8,
  layout: [
    [WL, WL, WL, WL, WL, WL, WL, WL, WL, WL, WL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, FL, SH, SH, FL, FL, FL, FL, SH, SH, FL, WL],
    [WL, FL, FL, FL, FL, NP, FL, FL, FL, FL, FL, WL],
    [WL, FL, PC, FL, FL, FL, FL, FL, FL, PC, FL, WL],
    [WL, FL, CT, CT, FL, FL, FL, FL, CT, CT, FL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, FL, PT, FL, FL, RG, RG, FL, FL, PT, FL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, WL, WL, WL, WL, DX, DX, WL, WL, WL, WL, WL],
  ]
};

// BT_CENTRE = 3 — Pokemon Center (12x10)
INTERIORS[3] = {
  name: 'Centre Pokemon',
  width: 12, height: 10,
  spawnX: 5, spawnZ: 8,
  floorColor: 0xF0E8E0,
  layout: [
    [WL, WL, WL, WL, WL, WL, WL, WL, WL, WL, WL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, FL, FL, FL, FL, HM, FL, FL, FL, FL, FL, WL],
    [WL, FL, FL, FL, CT, CT, CT, CT, FL, FL, FL, WL],
    [WL, FL, FL, FL, FL, NP, FL, FL, FL, FL, FL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, FL, CH, TB, FL, FL, FL, TB, CH, FL, FL, WL],
    [WL, FL, CH, TB, FL, RG, FL, TB, CH, FL, FL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, WL, WL, WL, WL, DX, DX, WL, WL, WL, WL, WL],
  ]
};

// BT_BOUTIQUE = 4 — Shop (10x8)
INTERIORS[4] = {
  name: 'Boutique',
  width: 10, height: 8,
  spawnX: 4, spawnZ: 6,
  floorColor: 0xE8E0D0,
  layout: [
    [WL, WL, WL, WL, WL, WL, WL, WL, WL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, FL, SH, SH, FL, FL, SH, SH, FL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, FL, CT, CT, CT, CT, FL, FL, FL, WL],
    [WL, FL, FL, FL, NP, FL, FL, PT, FL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, WL, WL, WL, DX, DX, WL, WL, WL, WL],
  ]
};

// BT_AUBERGE = 5 — Inn (12x10)
INTERIORS[5] = {
  name: 'Auberge',
  width: 12, height: 10,
  spawnX: 5, spawnZ: 8,
  floorColor: 0xC8A870,
  layout: [
    [WL, WL, WL, WL, WL, WL, WL, WL, WL, WL, WL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, FL, BD, BD, FL, FL, FL, BD, BD, FL, FL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, FL, CB, FL, FL, FL, FL, FL, CB, FL, FL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, FL, FL, FL, CT, CT, CT, FL, FL, FL, FL, WL],
    [WL, FL, PT, FL, FL, NP, FL, FL, PT, FL, FL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, WL, WL, WL, WL, DX, DX, WL, WL, WL, WL, WL],
  ]
};

// BT_CHANTIER = 6 — Shipyard (10x8)
INTERIORS[6] = {
  name: 'Chantier Naval',
  width: 10, height: 8,
  spawnX: 4, spawnZ: 6,
  floorColor: 0xA89878,
  layout: [
    [WL, WL, WL, WL, WL, WL, WL, WL, WL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, FL, CB, FL, FL, FL, FL, CB, FL, WL],
    [WL, FL, FL, FL, TB, TB, FL, FL, FL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, FL, SH, FL, FL, NP, FL, SH, FL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, WL, WL, WL, DX, DX, WL, WL, WL, WL],
  ]
};

// BT_MARCHE = 7 — Fish Market (10x8)
INTERIORS[7] = {
  name: 'Marche aux Poissons',
  width: 10, height: 8,
  spawnX: 4, spawnZ: 6,
  floorColor: 0xD8D0C0,
  layout: [
    [WL, WL, WL, WL, WL, WL, WL, WL, WL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, FL, CT, CT, FL, FL, CT, CT, FL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, FL, CT, FL, FL, FL, FL, CT, FL, WL],
    [WL, FL, FL, FL, NP, FL, FL, FL, FL, WL],
    [WL, FL, FL, FL, FL, FL, FL, FL, FL, WL],
    [WL, WL, WL, WL, DX, DX, WL, WL, WL, WL],
  ]
};

// BT_JOUEUR = 8 — Player's House (8x8)
INTERIORS[8] = {
  name: 'Maison du Joueur',
  width: 8, height: 8,
  spawnX: 3, spawnZ: 6,
  floorColor: 0xD0B888,
  layout: [
    [WL, WL, WL, WL, WL, WL, WL, WL],
    [WL, FL, FL, FL, FL, FL, FL, WL],
    [WL, FL, BD, BD, FL, PC, FL, WL],
    [WL, FL, FL, FL, FL, FL, FL, WL],
    [WL, FL, RG, RG, FL, SH, FL, WL],
    [WL, FL, RG, RG, FL, FL, FL, WL],
    [WL, FL, FL, FL, FL, PT, FL, WL],
    [WL, WL, WL, DX, DX, WL, WL, WL],
  ]
};

// BT_PHARE = 9 — Lighthouse (6x6)
INTERIORS[9] = {
  name: 'Phare',
  width: 6, height: 6,
  spawnX: 2, spawnZ: 4,
  floorColor: 0xB0A898,
  layout: [
    [WL, WL, WL, WL, WL, WL],
    [WL, FL, FL, FL, FL, WL],
    [WL, FL, CB, FL, FL, WL],
    [WL, FL, FL, FL, FL, WL],
    [WL, FL, FL, FL, FL, WL],
    [WL, WL, DX, DX, WL, WL],
  ]
};

// Check if an interior tile is blocking
export function isBlockedInterior(interiorDef, x, z) {
  if (!interiorDef) return true;
  var ix = Math.floor(x);
  var iz = Math.floor(z);
  if (ix < 0 || iz < 0 || ix >= interiorDef.width || iz >= interiorDef.height) return true;
  var t = interiorDef.layout[iz][ix];
  return t === WL || t === CT || t === TB || t === SH || t === BD || t === NP || t === PC || t === PT || t === HM || t === CB;
}
