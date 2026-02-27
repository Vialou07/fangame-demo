import { loadModel } from './modelLoader.js';

// Base path respecting Vite's base config
var BASE = import.meta.env.BASE_URL || '/';

// Building type codes (must match biomeGen.js)
// BT_MAISON=1, BT_LABO=2, BT_CENTRE=3, BT_BOUTIQUE=4,
// BT_AUBERGE=5, BT_CHANTIER=6, BT_MARCHE=7, BT_JOUEUR=8, BT_PHARE=9

// Registry: building type code -> model config
// scale is tuned so models fit their tile footprint
// yOffset shifts the model vertically (some models float/sink)
var BUILDING_MODELS = {
  1: { paths: [
    BASE + 'models/buildings/house-small-a.glb',
    BASE + 'models/buildings/house-small-b.glb',
    BASE + 'models/buildings/house-small-c.glb'
  ], scale: 1.8, yOffset: 0 },
  2: { paths: [BASE + 'models/buildings/laboratory.glb'], scale: 2.2, yOffset: 0 },
  3: { paths: [BASE + 'models/buildings/pokemon-center.glb'], scale: 2.2, yOffset: 0 },
  4: { paths: [BASE + 'models/buildings/shop.glb'], scale: 1.6, yOffset: 0 },
  5: { paths: [BASE + 'models/buildings/inn.glb'], scale: 2.0, yOffset: 0 },
  6: { paths: [BASE + 'models/buildings/warehouse.glb'], scale: 2.0, yOffset: 0 },
  7: { paths: [BASE + 'models/buildings/market-stall.glb'], scale: 1.8, yOffset: 0 },
  8: { paths: [BASE + 'models/buildings/house-player.glb'], scale: 2.0, yOffset: 0 },
  9: { paths: [BASE + 'models/buildings/lighthouse.glb'], scale: 2.4, yOffset: 0 }
};

// Nature model configs for trees, bushes, rocks
export var NATURE_MODELS = {
  tree: [
    BASE + 'models/nature/tree-oak.glb',
    BASE + 'models/nature/tree-detailed.glb',
    BASE + 'models/nature/tree-fat.glb'
  ],
  pine: [
    BASE + 'models/nature/tree-pine.glb'
  ],
  bush: [
    BASE + 'models/nature/bush.glb',
    BASE + 'models/nature/bush-large.glb'
  ],
  rock: [
    BASE + 'models/nature/rock-large.glb',
    BASE + 'models/nature/rock-tall.glb'
  ],
  flower: [
    BASE + 'models/nature/flower-red.glb',
    BASE + 'models/nature/flower-yellow.glb',
    BASE + 'models/nature/flower-purple.glb'
  ]
};

// Prop model configs
export var PROP_MODELS = {
  sign: BASE + 'models/props/sign.glb',
  fence: BASE + 'models/props/fence-segment.glb'
};

// Track preload state
var preloadPromise = null;

export function preloadAllModels() {
  if (preloadPromise) return preloadPromise;

  var paths = [];

  // Collect all building model paths
  for (var key in BUILDING_MODELS) {
    var config = BUILDING_MODELS[key];
    for (var i = 0; i < config.paths.length; i++) {
      if (paths.indexOf(config.paths[i]) === -1) paths.push(config.paths[i]);
    }
  }

  // Collect nature model paths
  for (var cat in NATURE_MODELS) {
    var arr = NATURE_MODELS[cat];
    for (var j = 0; j < arr.length; j++) {
      if (paths.indexOf(arr[j]) === -1) paths.push(arr[j]);
    }
  }

  // Collect prop model paths
  for (var pk in PROP_MODELS) {
    var pp = PROP_MODELS[pk];
    if (paths.indexOf(pp) === -1) paths.push(pp);
  }

  var promises = [];
  for (var p = 0; p < paths.length; p++) {
    (function(modelPath) {
      promises.push(
        loadModel(modelPath).then(function() {
          // Model parsed and cached — discard result, we just want the buffer cached
        }).catch(function(err) {
          console.warn('Model preload failed: ' + modelPath, err);
        })
      );
    })(paths[p]);
  }

  preloadPromise = Promise.all(promises);
  return preloadPromise;
}

export function getBuildingConfig(typeCode) {
  return BUILDING_MODELS[typeCode] || null;
}

// Returns a promise that resolves to a fresh THREE.Group for the given building type
// Uses deterministic index to pick variant for buildings with multiple models
export function getModelForBuilding(typeCode, seedVal) {
  var config = BUILDING_MODELS[typeCode];
  if (!config) return Promise.resolve(null);
  var idx = Math.abs(seedVal || 0) % config.paths.length;
  return loadModel(config.paths[idx]);
}

// Returns a promise for a nature model (tree, bush, rock, flower)
export function getNatureModel(category, seedVal) {
  var arr = NATURE_MODELS[category];
  if (!arr || arr.length === 0) return Promise.resolve(null);
  var idx = Math.abs(seedVal || 0) % arr.length;
  return loadModel(arr[idx]);
}

// Returns a promise for a prop model
export function getPropModel(name) {
  var path = PROP_MODELS[name];
  if (!path) return Promise.resolve(null);
  return loadModel(path);
}
