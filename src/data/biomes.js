// Biome definitions for procedural map generation
// Each biome defines tile distribution weights and decoration rules

export var BIOME = {
  FOREST: 0,
  PLAINS: 1,
  TOWN: 2,
  ROUTE: 3,
  LAKE: 4,
  MOUNTAIN: 5,
  DESERT: 6,
  BEACH: 7,
  SWAMP: 8,
  VOLCANO: 9,
  CAVE_ENTRANCE: 10
};

// Biome properties used by biomeGen to place tiles
export var BIOME_DEF = {};

BIOME_DEF[BIOME.FOREST] = {
  name: 'Foret Dense',
  treeDensity: 0.55,
  grassType: 'dark',
  tallGrass: 0.15,
  flowers: 0.02
};

BIOME_DEF[BIOME.PLAINS] = {
  name: 'Plaine',
  treeDensity: 0.04,
  grassType: 'light',
  tallGrass: 0.08,
  flowers: 0.08
};

BIOME_DEF[BIOME.TOWN] = {
  name: 'Ville',
  treeDensity: 0,
  grassType: 'light',
  tallGrass: 0,
  flowers: 0.05
};

BIOME_DEF[BIOME.ROUTE] = {
  name: 'Route',
  treeDensity: 0.08,
  grassType: 'light',
  tallGrass: 0.2,
  flowers: 0.03
};

BIOME_DEF[BIOME.LAKE] = {
  name: 'Lac',
  treeDensity: 0.05,
  grassType: 'dark',
  tallGrass: 0.05,
  flowers: 0.04,
  water: true
};

BIOME_DEF[BIOME.MOUNTAIN] = {
  name: 'Montagne',
  treeDensity: 0.15,
  grassType: 'dark',
  tallGrass: 0.03,
  flowers: 0.01,
  rocks: true
};

BIOME_DEF[BIOME.DESERT] = {
  name: 'Desert',
  treeDensity: 0,
  grassType: 'sand',
  tallGrass: 0,
  flowers: 0,
  sand: true
};

BIOME_DEF[BIOME.BEACH] = {
  name: 'Plage',
  treeDensity: 0.02,
  grassType: 'sand',
  tallGrass: 0,
  flowers: 0.01,
  sand: true
};

BIOME_DEF[BIOME.SWAMP] = {
  name: 'Marais',
  treeDensity: 0.12,
  grassType: 'dark',
  tallGrass: 0.25,
  flowers: 0.02,
  water: true
};

BIOME_DEF[BIOME.VOLCANO] = {
  name: 'Volcan',
  treeDensity: 0,
  grassType: 'dark',
  tallGrass: 0,
  flowers: 0,
  rocks: true
};

BIOME_DEF[BIOME.CAVE_ENTRANCE] = {
  name: 'Grotte',
  treeDensity: 0.1,
  grassType: 'dark',
  tallGrass: 0,
  flowers: 0,
  rocks: true
};
