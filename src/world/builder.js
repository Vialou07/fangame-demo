import * as THREE from 'three';
import { TILE, MAP_W, MAP_H, MAP, BLDG_TYPE, BIOME_MAP, G, P, W, T, H, R, D, F, S, B, L, N, TG, SD, RK, LV } from '../data/map.js';
import { BIOME } from '../data/biomes.js';
import {
  mGrass, mGrassD, mPath, mWater, mTrunk, mLeaf, mLeafL, mLeafDark,
  mPine, mPineD, mBush, mBushD,
  mWall, mRoof, mRoofBlue, mRoofGreen, mRoofOrange, mRoofDarkBlue, mRoofPurple, mRoofTeal, mRoofYellow,
  mDoor, mDoorF, mGlass, mKnob, mStem, mFCenter, mFlowers, mStone,
  mFoundation, mShutter, mChimney, mAwning, mStep,
  mSign, mSignPost, mBench, mBenchLeg, mLamp, mLampLight, mFenceWood,
  mSand, mReed, mLilyPad, mLilyFlower,
  mSandTile, mRock, mRockD, mLava,
  grassMats, pathMats,
  bladeGeo,
  tileGeo, waterGeo, waterPlaneGeo
} from './materials.js';
import { getHeight } from './heightMap.js';
import { detectBuildings } from './buildingDetector.js';
import { getBuildingConfig, getModelForBuilding } from './modelRegistry.js';
import { waterShaderMat, lavaShaderMat } from './shaders.js';

// Building type → roof material
function getRoofMat(wx, wz) {
  if (!BLDG_TYPE || !BLDG_TYPE[wz]) return mRoof;
  switch (BLDG_TYPE[wz][wx]) {
    case 2: return mRoofBlue;      // Labo
    case 3: return mRoof;          // Centre Pokemon (red)
    case 4: return mRoofGreen;     // Boutique
    case 5: return mRoofOrange;    // Auberge
    case 6: return mRoofDarkBlue;  // Chantier naval
    case 7: return mRoofPurple;    // Marché
    case 8: return mRoofTeal;      // Maison joueur
    case 9: return mRoofYellow;    // Phare
    default: return mRoof;
  }
}

// ===================== INSTANCED RENDERING =====================
// Build context for collecting instances (set during buildChunk)
var _ctx = null;

// Reusable math objects (avoid per-frame allocation)
var _mat4 = new THREE.Matrix4();
var _pos = new THREE.Vector3();
var _quat = new THREE.Quaternion();
var _scl = new THREE.Vector3();
var _euler = new THREE.Euler();
var _col = new THREE.Color();

// Shared material for instanced grass (white base * per-instance color)
var mBladeInst = new THREE.MeshStandardMaterial({ roughness: 0.8 });

// ===================== PUBLIC API =====================

export function buildWorld(worldGroup) {
  // Ground plane
  var gnd = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP_W + 12, MAP_H + 12),
    new THREE.MeshStandardMaterial({ color: 0x48A850, roughness: 0.9 })
  );
  gnd.rotation.x = -Math.PI / 2;
  gnd.position.set(MAP_W / 2 - 0.5, -0.08, MAP_H / 2 - 0.5);
  gnd.receiveShadow = true;
  worldGroup.add(gnd);

  var chunk = buildChunk(0, 0, MAP_W, MAP_H);
  worldGroup.add(chunk.group);
  return { waterTiles: chunk.waterTiles, lilyPads: chunk.lilyPads };
}

// Build a rectangular region of tiles — returns { group, waterTiles, lilyPads }
// Used by buildWorld now, and by chunk manager later
export function buildChunk(startX, startZ, width, height) {
  var group = new THREE.Group();
  _ctx = { blades: [], waterTiles: [], lilyPads: [], lampLights: [] };

  var endX = Math.min(startX + width, MAP_W);
  var endZ = Math.min(startZ + height, MAP_H);

  // Detect buildings in this chunk region and determine which tiles are model-covered
  var buildings = detectBuildings(startX, startZ, width, height);
  var modelCoveredTiles = {};

  for (var b = 0; b < buildings.length; b++) {
    var bldg = buildings[b];
    var config = getBuildingConfig(bldg.type);
    if (!config) continue; // No model → fallback to box geometry

    // Mark all tiles of this building as model-covered
    for (var bz = bldg.minZ; bz <= bldg.maxZ; bz++) {
      for (var bx = bldg.minX; bx <= bldg.maxX; bx++) {
        modelCoveredTiles[bx + ',' + bz] = true;
      }
    }

    // Only place model if the anchor (door) is within THIS chunk
    if (bldg.anchorX >= startX && bldg.anchorX < startX + width &&
        bldg.anchorZ >= startZ && bldg.anchorZ < startZ + height) {
      placeModelBuilding(group, bldg, config);
    }
  }

  for (var y = startZ; y < endZ; y++) {
    for (var x = startX; x < endX; x++) {
      if (modelCoveredTiles[x + ',' + y]) {
        // Place grass + path under model footprint
        var tile = MAP[y][x];
        addBox(group, x, y, 0, tileGeo, tile === D || tile === P ? mPath : mGrass, true);
        collectGrassBlades(x, y);
        continue;
      }
      buildTile(group, x, y, MAP[y][x]);
    }
  }

  flushInstances(group);

  var result = { group: group, waterTiles: _ctx.waterTiles, lilyPads: _ctx.lilyPads, lampLights: _ctx.lampLights };
  _ctx = null;
  return result;
}

// Place a GLTF model for a detected building
function placeModelBuilding(group, bldg, config) {
  var centerX = (bldg.minX + bldg.maxX) / 2;
  var centerZ = (bldg.minZ + bldg.maxZ) / 2;
  var h = getHeight(Math.round(centerX), Math.round(centerZ));
  var seedVal = (bldg.anchorX * 73856093) ^ (bldg.anchorZ * 19349669);
  var rng = tileSeed(bldg.anchorX * 500 + 17, bldg.anchorZ * 500 + 31);

  getModelForBuilding(bldg.type, seedVal).then(function(model) {
    if (!model) return;
    // Scale with slight variation (±10%)
    var scaleVar = config.scale * (0.92 + rng() * 0.16);
    model.scale.setScalar(scaleVar);
    model.position.set(centerX, h + config.yOffset, centerZ);
    // Face south with slight rotation variation
    model.rotation.y = Math.PI + (rng() - 0.5) * 0.12;

    // Tint materials for visual variety per building
    model.traverse(function(child) {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.color.offsetHSL(
          (rng() - 0.5) * 0.05,  // subtle hue shift
          (rng() - 0.5) * 0.08,  // saturation variation
          (rng() - 0.5) * 0.06   // lightness variation
        );
      }
    });

    group.add(model);
  });
}

// ===================== TILE BUILDER =====================

// Quick integer hash for tile-based randomness
function tileHash(x, z) {
  return ((x * 73856093) ^ (z * 19349669)) & 0x7fffffff;
}

function getGrassMat(x, z) {
  return grassMats[tileHash(x * 3 + 1, z * 7 + 3) % grassMats.length];
}

function getPathMat(x, z) {
  return pathMats[tileHash(x * 11 + 5, z * 17 + 7) % pathMats.length];
}

// Small Y jitter to break the perfectly flat grid look
function grassJitter(x, z) {
  return ((tileHash(x * 23, z * 41) % 30) - 15) * 0.001;
}

function getBiomeAt(x, z) {
  if (x < 0 || z < 0 || x >= MAP_W || z >= MAP_H) return -1;
  return BIOME_MAP[z][x];
}

function buildTile(group, x, y, type) {
  var biome = getBiomeAt(x, y);
  switch (type) {
    case G:
      addBox(group, x, y, grassJitter(x, y), tileGeo, getGrassMat(x, y), true);
      collectGrassBlades(x, y);
      if ((x * 7 + y * 13) % 4 === 0) collectTallGrass(x, y);
      break;
    case P: {
      addBox(group, x, y, -0.01 + grassJitter(x, y), tileGeo, getPathMat(x, y), true);
      var rng = tileSeed(x * 131 + 1, y * 137 + 1);
      if (rng() > 0.6) addPebble(group, x, y);
      break;
    }
    case W:
      addBox(group, x, y, -0.1, tileGeo, mGrassD, false);
      addWaterShader(group, x, y);
      addWaterEdge(group, x, y);
      addWaterDecor(group, x, y);
      break;
    case T: {
      addBox(group, x, y, grassJitter(x, y), tileGeo, getGrassMat(x, y), true);
      var treeType = pickTreeType(x, y);
      if (treeType === 0) addTreeRound(group, x, y);
      else if (treeType === 1) addTreePine(group, x, y);
      else addBush(group, x, y);
      break;
    }
    case H: addHouseWall(group, x, y); break;
    case R: addHouseRoof(group, x, y); break;
    case D: addDoor(group, x, y); break;
    case F:
      addBox(group, x, y, grassJitter(x, y), tileGeo, getGrassMat(x, y), true);
      collectGrassBlades(x, y);
      addFlowers(group, x, y);
      break;
    case S:
      addBox(group, x, y, grassJitter(x, y), tileGeo, getGrassMat(x, y), true);
      collectGrassBlades(x, y);
      addSign(group, x, y);
      break;
    case B:
      addBox(group, x, y, grassJitter(x, y), tileGeo, getGrassMat(x, y), true);
      collectGrassBlades(x, y);
      addBenchProp(group, x, y);
      break;
    case L:
      addBox(group, x, y, grassJitter(x, y), tileGeo, getGrassMat(x, y), true);
      addLampPost(group, x, y);
      break;
    case N:
      addBox(group, x, y, grassJitter(x, y), tileGeo, getGrassMat(x, y), true);
      collectGrassBlades(x, y);
      addFence(group, x, y);
      break;
    case TG:
      addBox(group, x, y, grassJitter(x, y), tileGeo, getGrassMat(x, y), true);
      collectGrassBlades(x, y);
      collectTallGrassPatch(x, y);
      break;
    case SD:
      addBox(group, x, y, -0.01 + grassJitter(x, y), tileGeo, mSandTile, true);
      addSandDetail(group, x, y);
      break;
    case RK:
      addBox(group, x, y, grassJitter(x, y), tileGeo, getGrassMat(x, y), true);
      if (biome === BIOME.MOUNTAIN || biome === BIOME.CAVE_ENTRANCE) {
        addMountainRock(group, x, y, biome);
      } else {
        addRockProp(group, x, y);
      }
      break;
    case LV:
      addBox(group, x, y, -0.05, tileGeo, mGrassD, false);
      addLavaShader(group, x, y);
      break;
  }
}

// ===================== HELPERS =====================

function addBox(group, x, z, yOff, geo, mat, shadow) {
  var m = new THREE.Mesh(geo, mat);
  m.position.set(x, yOff + getHeight(x, z), z);
  m.receiveShadow = shadow;
  group.add(m);
  return m;
}

// Deterministic seed based on tile position (same for all players)
function tileSeed(x, z) {
  var s = (x * 73856093) ^ (z * 19349669);
  return function() {
    s = (s ^ (s << 13)) & 0x7fffffff;
    s = (s ^ (s >> 17)) & 0x7fffffff;
    s = (s ^ (s << 5)) & 0x7fffffff;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

// ===================== INSTANCED GRASS COLLECTION =====================
// Instead of creating individual meshes, we collect instance data
// and batch them into InstancedMesh at the end (flushInstances)

function collectGrassBlades(wx, wz) {
  var rng = tileSeed(wx * 100, wz * 100);
  var count = 5 + Math.floor(rng() * 6);
  var tileH = getHeight(wx, wz);
  for (var i = 0; i < count; i++) {
    var h = 0.1 + rng() * 0.18;
    _col.setHSL(0.3 + rng() * 0.06, 0.55 + rng() * 0.15, 0.28 + rng() * 0.18);
    _ctx.blades.push({
      x: wx + (rng() - 0.5) * 0.85,
      y: tileH + 0.06 + h / 2,
      z: wz + (rng() - 0.5) * 0.85,
      rx: (rng() - 0.5) * 0.35,
      rz: (rng() - 0.5) * 0.35,
      sx: 1, sy: h / 0.15, sz: 1,
      r: _col.r, g: _col.g, b: _col.b
    });
  }
}

function collectTallGrass(wx, wz) {
  var rng = tileSeed(wx * 200 + 7, wz * 200 + 13);
  var count = 3 + Math.floor(rng() * 3);
  var rf = 0.025 / 0.018; // radius factor vs bladeGeo
  var tileH = getHeight(wx, wz);
  for (var i = 0; i < count; i++) {
    var h = 0.25 + rng() * 0.15;
    _col.setHSL(0.28 + rng() * 0.04, 0.65, 0.25 + rng() * 0.1);
    _ctx.blades.push({
      x: wx + (rng() - 0.5) * 0.4,
      y: tileH + 0.06 + h / 2,
      z: wz + (rng() - 0.5) * 0.4,
      rx: (rng() - 0.5) * 0.2,
      rz: (rng() - 0.5) * 0.2,
      sx: rf, sy: h / 0.15, sz: rf,
      r: _col.r, g: _col.g, b: _col.b
    });
  }
}

function collectTallGrassPatch(wx, wz) {
  var rng = tileSeed(wx * 500 + 3, wz * 500 + 7);
  var count = 8 + Math.floor(rng() * 5);
  var rf = 0.03 / 0.018; // radius factor vs bladeGeo
  var tileH = getHeight(wx, wz);
  for (var i = 0; i < count; i++) {
    var h = 0.3 + rng() * 0.2;
    _col.setHSL(0.26 + rng() * 0.04, 0.7 + rng() * 0.1, 0.2 + rng() * 0.08);
    _ctx.blades.push({
      x: wx + (rng() - 0.5) * 0.8,
      y: tileH + 0.06 + h / 2,
      z: wz + (rng() - 0.5) * 0.8,
      rx: (rng() - 0.5) * 0.3,
      rz: (rng() - 0.5) * 0.3,
      sx: rf, sy: h / 0.15, sz: rf,
      r: _col.r, g: _col.g, b: _col.b
    });
  }
}

// Create InstancedMesh from collected blade data
function flushInstances(group) {
  var blades = _ctx.blades;
  if (blades.length === 0) return;

  var mesh = new THREE.InstancedMesh(bladeGeo, mBladeInst, blades.length);

  for (var i = 0; i < blades.length; i++) {
    var b = blades[i];
    _pos.set(b.x, b.y, b.z);
    _euler.set(b.rx, 0, b.rz);
    _quat.setFromEuler(_euler);
    _scl.set(b.sx, b.sy, b.sz);
    _mat4.compose(_pos, _quat, _scl);
    mesh.setMatrixAt(i, _mat4);
    _col.setRGB(b.r, b.g, b.b);
    mesh.setColorAt(i, _col);
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  group.add(mesh);
}

// ===================== NON-INSTANCED DECORATIONS =====================

function addPebble(group, wx, wz) {
  var rng = tileSeed(wx * 131, wz * 137);
  var p = new THREE.Mesh(new THREE.SphereGeometry(0.04 + rng() * 0.04, 6, 4), mStone);
  p.position.set(wx + (rng() - 0.5) * 0.5, getHeight(wx, wz) + 0.04, wz + (rng() - 0.5) * 0.5);
  group.add(p);
}

// ===================== TREES =====================

function pickTreeType(x, z) {
  var h = ((x * 73856093) ^ (z * 19349669)) & 0x7fffffff;
  return h % 3;
}

function addTreeRound(group, wx, wz) {
  var rng = tileSeed(wx * 300 + 1, wz * 300 + 1);
  var g = new THREE.Group();
  var tH = 0.7 + rng() * 0.35;
  var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, tH, 8), mTrunk);
  trunk.position.y = tH / 2 + 0.06;
  trunk.castShadow = true; trunk.receiveShadow = true;
  g.add(trunk);

  var base = tH + 0.05;
  var mainR = 0.4 + rng() * 0.15;
  var mainLeaf = new THREE.Mesh(
    new THREE.SphereGeometry(mainR, 8, 6),
    rng() > 0.5 ? mLeaf : mLeafL
  );
  mainLeaf.position.set(0, base + mainR * 0.7, 0);
  mainLeaf.castShadow = true; mainLeaf.receiveShadow = true;
  g.add(mainLeaf);

  var extras = 2 + Math.floor(rng() * 2);
  for (var i = 0; i < extras; i++) {
    var r = 0.2 + rng() * 0.15;
    var angle = rng() * Math.PI * 2;
    var dist = 0.15 + rng() * 0.1;
    var leaf = new THREE.Mesh(
      new THREE.SphereGeometry(r, 7, 5),
      rng() > 0.3 ? mLeaf : (rng() > 0.5 ? mLeafL : mLeafDark)
    );
    leaf.position.set(
      Math.cos(angle) * dist,
      base + mainR * 0.5 + rng() * 0.2,
      Math.sin(angle) * dist
    );
    leaf.castShadow = true; leaf.receiveShadow = true;
    g.add(leaf);
  }

  g.position.set(wx, getHeight(wx, wz), wz);
  g.rotation.y = rng() * Math.PI * 2;
  group.add(g);
}

function addTreePine(group, wx, wz) {
  var rng = tileSeed(wx * 400 + 2, wz * 400 + 2);
  var g = new THREE.Group();
  var tH = 0.9 + rng() * 0.4;
  var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, tH, 6), mTrunk);
  trunk.position.y = tH / 2 + 0.06;
  trunk.castShadow = true; trunk.receiveShadow = true;
  g.add(trunk);

  var layers = [
    { y: tH * 0.45, r: 0.38, h: 0.45 },
    { y: tH * 0.7, r: 0.28, h: 0.4 },
    { y: tH * 0.95, r: 0.18, h: 0.35 }
  ];
  for (var i = 0; i < layers.length; i++) {
    var l = layers[i];
    var cone = new THREE.Mesh(
      new THREE.ConeGeometry(l.r + rng() * 0.05, l.h, 8),
      rng() > 0.4 ? mPine : mPineD
    );
    cone.position.y = l.y + 0.06;
    cone.castShadow = true; cone.receiveShadow = true;
    g.add(cone);
  }

  g.position.set(wx, getHeight(wx, wz), wz);
  group.add(g);
}

function addBush(group, wx, wz) {
  var rng = tileSeed(wx * 500 + 3, wz * 500 + 3);
  var g = new THREE.Group();

  var mainR = 0.25 + rng() * 0.1;
  var main = new THREE.Mesh(
    new THREE.SphereGeometry(mainR, 8, 5),
    rng() > 0.5 ? mBush : mBushD
  );
  main.scale.y = 0.6;
  main.position.y = mainR * 0.5 + 0.06;
  main.castShadow = true; main.receiveShadow = true;
  g.add(main);

  var lumps = 1 + Math.floor(rng() * 2);
  for (var i = 0; i < lumps; i++) {
    var r = 0.15 + rng() * 0.08;
    var angle = rng() * Math.PI * 2;
    var lump = new THREE.Mesh(
      new THREE.SphereGeometry(r, 7, 4),
      rng() > 0.5 ? mBush : mBushD
    );
    lump.scale.y = 0.55;
    lump.position.set(
      Math.cos(angle) * 0.15,
      r * 0.45 + 0.06,
      Math.sin(angle) * 0.15
    );
    lump.castShadow = true; lump.receiveShadow = true;
    g.add(lump);
  }

  g.position.set(wx, getHeight(wx, wz), wz);
  group.add(g);
}

// ===================== HOUSES =====================

function addHouseWall(group, wx, wz) {
  var hY = getHeight(wx, wz);
  addBox(group, wx, wz, 0, tileGeo, mGrass, true);

  var found = new THREE.Mesh(new THREE.BoxGeometry(TILE, 0.12, TILE), mFoundation);
  found.position.set(wx, hY + 0.12, wz);
  found.castShadow = true; found.receiveShadow = true;
  group.add(found);

  var wall = new THREE.Mesh(new THREE.BoxGeometry(TILE, 0.78, TILE), mWall);
  wall.position.set(wx, hY + 0.57, wz);
  wall.castShadow = true; wall.receiveShadow = true;
  group.add(wall);

  if (wz + 1 < MAP_H) {
    var below = MAP[wz + 1][wx];
    if (below !== H && below !== R && below !== D) {
      var win = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.02), mGlass);
      win.position.set(wx, hY + 0.6, wz + 0.51);
      group.add(win);
      var fr = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.01), mDoorF);
      fr.position.set(wx, hY + 0.6, wz + 0.505);
      group.add(fr);
      var sL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.02), mShutter);
      sL.position.set(wx - 0.22, hY + 0.6, wz + 0.515);
      sL.rotation.y = 0.15;
      group.add(sL);
      var sR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.02), mShutter);
      sR.position.set(wx + 0.22, hY + 0.6, wz + 0.515);
      sR.rotation.y = -0.15;
      group.add(sR);
    }
  }
}

function addHouseRoof(group, wx, wz) {
  var rm = getRoofMat(wx, wz);
  var hY = getHeight(wx, wz);

  var wall = new THREE.Mesh(new THREE.BoxGeometry(TILE, 0.9, TILE), mWall);
  wall.position.set(wx, hY + 0.51, wz);
  wall.castShadow = true;
  group.add(wall);

  var roof = new THREE.Mesh(new THREE.BoxGeometry(TILE + 0.2, 0.12, TILE + 0.2), rm);
  roof.position.set(wx, hY + 1.0, wz);
  roof.castShadow = true; roof.receiveShadow = true;
  group.add(roof);

  var mid = new THREE.Mesh(new THREE.BoxGeometry(TILE + 0.05, 0.1, TILE + 0.05), rm);
  mid.position.set(wx, hY + 1.12, wz);
  mid.castShadow = true;
  group.add(mid);

  var peak = new THREE.Mesh(new THREE.BoxGeometry(TILE - 0.15, 0.1, TILE - 0.15), rm);
  peak.position.set(wx, hY + 1.22, wz);
  peak.castShadow = true;
  group.add(peak);

  if ((wx * 5 + wz * 11) % 3 === 0) {
    var chimney = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.15), mChimney);
    chimney.position.set(wx + 0.2, hY + 1.4, wz - 0.15);
    chimney.castShadow = true;
    group.add(chimney);
    var rim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.2), mChimney);
    rim.position.set(wx + 0.2, hY + 1.55, wz - 0.15);
    group.add(rim);
  }
}

function addDoor(group, wx, wz) {
  var hY = getHeight(wx, wz);
  addBox(group, wx, wz, -0.01, tileGeo, mPath, true);

  var fL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, TILE), mFoundation);
  fL.position.set(wx - 0.35, hY + 0.12, wz); group.add(fL);
  var fR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, TILE), mFoundation);
  fR.position.set(wx + 0.35, hY + 0.12, wz); group.add(fR);

  var wl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.78, TILE), mWall);
  wl.position.set(wx - 0.35, hY + 0.57, wz); wl.castShadow = true; group.add(wl);
  var wr = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.78, TILE), mWall);
  wr.position.set(wx + 0.35, hY + 0.57, wz); wr.castShadow = true; group.add(wr);
  var wt = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, TILE), mWall);
  wt.position.set(wx, hY + 0.87, wz); group.add(wt);

  var door = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.65, 0.06), mDoor);
  door.position.set(wx, hY + 0.45, wz + 0.48); door.castShadow = true; group.add(door);

  var doorHY = hY;
  [[wx - 0.2, 0.45, 0.04, 0.7], [wx + 0.2, 0.45, 0.04, 0.7]].forEach(function(p) {
    var f = new THREE.Mesh(new THREE.BoxGeometry(p[2], p[3], 0.08), mDoorF);
    f.position.set(p[0], doorHY + p[1], wz + 0.48); group.add(f);
  });
  var ftop = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.08), mDoorF);
  ftop.position.set(wx, hY + 0.8, wz + 0.48); group.add(ftop);

  var knob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), mKnob);
  knob.position.set(wx + 0.12, hY + 0.48, wz + 0.52); group.add(knob);

  var awning = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.25), mAwning);
  awning.position.set(wx, hY + 0.88, wz + 0.55);
  awning.rotation.x = 0.15;
  awning.castShadow = true;
  group.add(awning);

  var step1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.15), mStep);
  step1.position.set(wx, hY + 0.09, wz + 0.6); step1.receiveShadow = true; group.add(step1);
  var step2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.18), mStep);
  step2.position.set(wx, hY + 0.03, wz + 0.75); step2.receiveShadow = true; group.add(step2);

  var mat = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.15), new THREE.MeshStandardMaterial({ color: 0x8B6840, roughness: 0.95 }));
  mat.position.set(wx, hY + 0.1, wz + 0.55); mat.receiveShadow = true; group.add(mat);
}

// ===================== WATER =====================

function addWaterEdge(group, wx, wz) {
  var rng = tileSeed(wx * 600 + 4, wz * 600 + 4);
  var dirs = [
    { dx: 0, dz: -1, ox: 0, oz: -0.4 },
    { dx: 0, dz: 1, ox: 0, oz: 0.4 },
    { dx: -1, dz: 0, ox: -0.4, oz: 0 },
    { dx: 1, dz: 0, ox: 0.4, oz: 0 }
  ];
  for (var i = 0; i < dirs.length; i++) {
    var d = dirs[i];
    var nx = wx + d.dx;
    var nz = wz + d.dz;
    if (nx < 0 || nz < 0 || nx >= MAP_W || nz >= MAP_H) continue;
    if (MAP[nz][nx] === W) continue;
    var count = 3 + Math.floor(rng() * 4);
    for (var j = 0; j < count; j++) {
      var spread = (rng() - 0.5) * 0.7;
      var px = wx + d.ox + (d.dz !== 0 ? spread : (rng() - 0.5) * 0.2);
      var pz = wz + d.oz + (d.dx !== 0 ? spread : (rng() - 0.5) * 0.2);
      var r = 0.03 + rng() * 0.04;
      var pebble = new THREE.Mesh(new THREE.SphereGeometry(r, 5, 4), mSand);
      pebble.position.set(px, getHeight(wx, wz) - 0.01, pz);
      pebble.scale.y = 0.5;
      group.add(pebble);
    }
  }
}

function addWaterDecor(group, wx, wz) {
  var rng = tileSeed(wx * 700 + 5, wz * 700 + 5);
  var waterNeighbors = 0;
  var dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  for (var i = 0; i < dirs.length; i++) {
    var nx = wx + dirs[i][0];
    var nz = wz + dirs[i][1];
    if (nx >= 0 && nz >= 0 && nx < MAP_W && nz < MAP_H && MAP[nz][nx] === W) {
      waterNeighbors++;
    }
  }

  if (waterNeighbors <= 2 && rng() > 0.5) {
    var reeds = 2 + Math.floor(rng() * 3);
    for (var j = 0; j < reeds; j++) {
      var h = 0.3 + rng() * 0.25;
      var reed = new THREE.Mesh(new THREE.ConeGeometry(0.015, h, 4), mReed);
      reed.position.set(
        wx + (rng() - 0.5) * 0.6,
        getHeight(wx, wz) + h / 2,
        wz + (rng() - 0.5) * 0.6
      );
      reed.rotation.x = (rng() - 0.5) * 0.15;
      reed.rotation.z = (rng() - 0.5) * 0.15;
      group.add(reed);
    }
  }

  if (waterNeighbors >= 3 && rng() > 0.4) {
    var padX = wx + (rng() - 0.5) * 0.5;
    var padZ = wz + (rng() - 0.5) * 0.5;
    var pad = new THREE.Mesh(
      new THREE.CircleGeometry(0.1 + rng() * 0.06, 8),
      mLilyPad
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(padX, getHeight(wx, wz) - 0.01, padZ);
    group.add(pad);
    _ctx.lilyPads.push(pad);

    if (rng() > 0.5) {
      var flower = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), mLilyFlower);
      flower.position.set(padX, getHeight(wx, wz) + 0.02, padZ);
      group.add(flower);
      _ctx.lilyPads.push(flower);
    }
  }
}

// ===================== PROPS =====================

function addSign(group, wx, wz) {
  var g = new THREE.Group();
  var post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 6), mSignPost);
  post.position.y = 0.36;
  post.castShadow = true;
  g.add(post);
  var panel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.04), mSign);
  panel.position.y = 0.6;
  panel.castShadow = true; panel.receiveShadow = true;
  g.add(panel);
  var frame = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.29, 0.02), mSignPost);
  frame.position.y = 0.6;
  frame.position.z = -0.015;
  g.add(frame);
  g.position.set(wx, getHeight(wx, wz), wz);
  group.add(g);
}

function addBenchProp(group, wx, wz) {
  var g = new THREE.Group();
  var legL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.3), mBenchLeg);
  legL.position.set(-0.25, 0.21, 0);
  legL.castShadow = true;
  g.add(legL);
  var legR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.3), mBenchLeg);
  legR.position.set(0.25, 0.21, 0);
  legR.castShadow = true;
  g.add(legR);
  for (var i = -1; i <= 1; i++) {
    var plank = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.1), mBench);
    plank.position.set(0, 0.36, i * 0.1);
    plank.castShadow = true; plank.receiveShadow = true;
    g.add(plank);
  }
  var back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.03), mBench);
  back.position.set(0, 0.5, -0.15);
  back.castShadow = true;
  g.add(back);
  g.position.set(wx, getHeight(wx, wz), wz);
  group.add(g);
}

function addLampPost(group, wx, wz) {
  var g = new THREE.Group();
  var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.2, 8), mLamp);
  pole.position.y = 0.66;
  pole.castShadow = true;
  g.add(pole);
  var base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 8), mLamp);
  base.position.y = 0.1;
  g.add(base);
  var housing = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.18), mLamp);
  housing.position.y = 1.28;
  housing.castShadow = true;
  g.add(housing);
  var top = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.08, 4), mLamp);
  top.position.y = 1.38;
  top.rotation.y = Math.PI / 4;
  g.add(top);
  var globe = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mLampLight);
  globe.position.y = 1.22;
  g.add(globe);
  // Night glow point light (intensity controlled by main loop, only nearest are active)
  var light = new THREE.PointLight(0xFFE8A0, 0, 8, 1.2);
  light.position.y = 1.2;
  light._worldX = wx;
  light._worldZ = wz;
  g.add(light);
  // Light pool on ground (emissive circle for visual warmth even when PointLight is off)
  var poolGeo = new THREE.CircleGeometry(1.2, 12);
  poolGeo.rotateX(-Math.PI / 2);
  var poolMat = new THREE.MeshBasicMaterial({ color: 0xFFE8A0, transparent: true, opacity: 0, depthWrite: false });
  var pool = new THREE.Mesh(poolGeo, poolMat);
  pool.position.y = 0.02;
  g.add(pool);
  light._poolMat = poolMat;
  g.position.set(wx, getHeight(wx, wz), wz);
  group.add(g);
  if (_ctx) _ctx.lampLights.push(light);
}

function addFence(group, wx, wz) {
  var g = new THREE.Group();
  var pL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), mFenceWood);
  pL.position.set(-0.35, 0.31, 0);
  pL.castShadow = true;
  g.add(pL);
  var pR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), mFenceWood);
  pR.position.set(0.35, 0.31, 0);
  pR.castShadow = true;
  g.add(pR);
  var barT = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.04), mFenceWood);
  barT.position.y = 0.48;
  barT.castShadow = true;
  g.add(barT);
  var barB = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.04), mFenceWood);
  barB.position.y = 0.25;
  barB.castShadow = true;
  g.add(barB);
  var mid = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), mFenceWood);
  mid.position.set(0, 0.29, 0);
  mid.castShadow = true;
  g.add(mid);
  g.position.set(wx, getHeight(wx, wz), wz);
  group.add(g);
}

function addFlowers(group, wx, wz) {
  var rng = tileSeed(wx * 900 + 9, wz * 900 + 11);
  var hY = getHeight(wx, wz);
  var count = 2 + Math.floor(rng() * 3);
  for (var i = 0; i < count; i++) {
    var fx = wx + (rng() - 0.5) * 0.7;
    var fz = wz + (rng() - 0.5) * 0.7;
    var fm = mFlowers[Math.floor(rng() * mFlowers.length)];
    var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.2, 4), mStem);
    stem.position.set(fx, hY + 0.16, fz); group.add(stem);
    for (var p = 0; p < 5; p++) {
      var a = (p / 5) * Math.PI * 2;
      var petal = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), fm);
      petal.position.set(fx + Math.cos(a) * 0.06, hY + 0.27, fz + Math.sin(a) * 0.06);
      group.add(petal);
    }
    var c = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), mFCenter);
    c.position.set(fx, hY + 0.28, fz); group.add(c);
  }
}

// ===================== NEW TERRAIN TYPES =====================

function addSandDetail(group, wx, wz) {
  var rng = tileSeed(wx * 1100 + 11, wz * 1100 + 13);
  if (rng() > 0.7) {
    var p = new THREE.Mesh(new THREE.SphereGeometry(0.03 + rng() * 0.03, 5, 3), mSand);
    p.position.set(wx + (rng() - 0.5) * 0.5, getHeight(wx, wz) + 0.02, wz + (rng() - 0.5) * 0.5);
    p.scale.y = 0.5;
    group.add(p);
  }
}

function addRockProp(group, wx, wz) {
  var rng = tileSeed(wx * 1200 + 12, wz * 1200 + 14);
  var g = new THREE.Group();
  // Main boulder
  var r = 0.25 + rng() * 0.2;
  var main = new THREE.Mesh(
    new THREE.SphereGeometry(r, 7, 5),
    rng() > 0.5 ? mRock : mRockD
  );
  main.scale.set(1, 0.6 + rng() * 0.3, 1);
  main.position.y = r * 0.4 + 0.06;
  main.castShadow = true; main.receiveShadow = true;
  g.add(main);
  // Small extra rock
  if (rng() > 0.4) {
    var sr = 0.1 + rng() * 0.1;
    var small = new THREE.Mesh(new THREE.SphereGeometry(sr, 6, 4), mRock);
    small.scale.y = 0.5;
    small.position.set((rng() - 0.5) * 0.3, sr * 0.3 + 0.06, (rng() - 0.5) * 0.3);
    small.castShadow = true;
    g.add(small);
  }
  g.position.set(wx, getHeight(wx, wz), wz);
  g.rotation.y = rng() * Math.PI * 2;
  group.add(g);
}

function addLavaTile(group, wx, wz) {
  var lava = new THREE.Mesh(waterGeo, mLava);
  lava.position.set(wx, getHeight(wx, wz) - 0.01, wz);
  group.add(lava);
}

// ===================== SHADER WATER/LAVA =====================

function addWaterShader(group, wx, wz) {
  var mat = waterShaderMat || mWater;
  var geo = waterShaderMat ? waterPlaneGeo : waterGeo;
  var w = new THREE.Mesh(geo, mat);
  w.position.set(wx, getHeight(wx, wz) - 0.02, wz);
  group.add(w);
  _ctx.waterTiles.push(w);
}

function addLavaShader(group, wx, wz) {
  var mat = lavaShaderMat || mLava;
  var geo = lavaShaderMat ? waterPlaneGeo : waterGeo;
  var lv = new THREE.Mesh(geo, mat);
  lv.position.set(wx, getHeight(wx, wz) - 0.01, wz);
  group.add(lv);
}

// ===================== DRAMATIC MOUNTAINS & CAVES =====================

var mMountainRock = new THREE.MeshStandardMaterial({ color: 0x6A6A72, roughness: 0.92 });
var mMountainRockD = new THREE.MeshStandardMaterial({ color: 0x4A4A52, roughness: 0.88 });
var mCaveDark = new THREE.MeshStandardMaterial({ color: 0x1A1A28, roughness: 0.95 });
var mCaveFrame = new THREE.MeshStandardMaterial({ color: 0x4A4A58, roughness: 0.9 });

function addMountainRock(group, wx, wz, biome) {
  var rng = tileSeed(wx * 1300 + 17, wz * 1300 + 19);
  var g = new THREE.Group();
  var hY = getHeight(wx, wz);

  if (biome === BIOME.CAVE_ENTRANCE && rng() > 0.7) {
    // Cave entrance formation
    addCaveMouth(g, rng);
  } else {
    // Tall mountain rock pillar
    var height = 0.8 + rng() * 1.5;
    var baseR = 0.3 + rng() * 0.2;
    var mat1 = rng() > 0.5 ? mMountainRock : mMountainRockD;

    // Main pillar (tapers toward top)
    var pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(baseR * 0.5, baseR, height, 7, 1),
      mat1
    );
    pillar.position.y = height / 2 + 0.06;
    pillar.castShadow = true; pillar.receiveShadow = true;
    g.add(pillar);

    // Irregular top cap
    var cap = new THREE.Mesh(
      new THREE.SphereGeometry(baseR * 0.6, 6, 4),
      mMountainRockD
    );
    cap.scale.y = 0.4;
    cap.position.y = height + 0.06;
    cap.castShadow = true;
    g.add(cap);

    // Extra boulders at base
    var extras = 1 + Math.floor(rng() * 2);
    for (var i = 0; i < extras; i++) {
      var er = 0.15 + rng() * 0.15;
      var ea = rng() * Math.PI * 2;
      var boulder = new THREE.Mesh(
        new THREE.SphereGeometry(er, 6, 4),
        rng() > 0.5 ? mMountainRock : mRockD
      );
      boulder.scale.y = 0.5 + rng() * 0.3;
      boulder.position.set(Math.cos(ea) * 0.3, er * 0.35 + 0.06, Math.sin(ea) * 0.3);
      boulder.castShadow = true;
      g.add(boulder);
    }

    // Snow on top for very tall peaks
    if (height > 1.8) {
      var snowMat = new THREE.MeshStandardMaterial({ color: 0xE8E8F0, roughness: 0.7 });
      var snow = new THREE.Mesh(new THREE.SphereGeometry(baseR * 0.55, 6, 4), snowMat);
      snow.scale.y = 0.25;
      snow.position.y = height + 0.15;
      g.add(snow);
    }
  }

  g.position.set(wx, hY, wz);
  g.rotation.y = rng() * Math.PI * 2;
  group.add(g);
}

function addCaveMouth(g, rng) {
  // Dark interior
  var interior = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 1.0),
    mCaveDark
  );
  interior.position.set(0, 0.55, -0.15);
  g.add(interior);

  // Rocky frame - left pillar
  var leftH = 1.2 + rng() * 0.4;
  var left = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.25, leftH, 6),
    mCaveFrame
  );
  left.position.set(-0.55, leftH / 2, 0);
  left.castShadow = true;
  g.add(left);

  // Right pillar
  var rightH = 1.1 + rng() * 0.5;
  var right = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, rightH, 6),
    mCaveFrame
  );
  right.position.set(0.55, rightH / 2, 0);
  right.castShadow = true;
  g.add(right);

  // Arch top
  var arch = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.35, 0.4),
    mMountainRock
  );
  arch.position.set(0, Math.max(leftH, rightH) + 0.1, 0);
  arch.castShadow = true;
  g.add(arch);

  // Stalactites
  for (var i = 0; i < 3; i++) {
    var sx = (rng() - 0.5) * 0.8;
    var sh = 0.15 + rng() * 0.2;
    var stal = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, sh, 4),
      mMountainRockD
    );
    stal.rotation.x = Math.PI; // point downward
    stal.position.set(sx, Math.max(leftH, rightH) - 0.05, -0.05);
    g.add(stal);
  }

  // Boulders around entrance
  for (var j = 0; j < 4; j++) {
    var br = 0.1 + rng() * 0.12;
    var bx = (rng() - 0.5) * 1.2;
    var bz = rng() * 0.3;
    var boulder = new THREE.Mesh(
      new THREE.SphereGeometry(br, 5, 4),
      mMountainRockD
    );
    boulder.scale.y = 0.5 + rng() * 0.3;
    boulder.position.set(bx, br * 0.3, bz);
    boulder.castShadow = true;
    g.add(boulder);
  }
}
