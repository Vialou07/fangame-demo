import * as THREE from 'three';
import { TILE, MAP_W, MAP_H, MAP, G, P, W, T, H, R, D, F, S, B, L, N } from '../data/map.js';
import {
  mGrass, mGrassD, mPath, mWater, mTrunk, mLeaf, mLeafL, mLeafDark,
  mPine, mPineD, mBush, mBushD,
  mWall, mRoof, mDoor, mDoorF, mGlass, mKnob, mStem, mFCenter, mFlowers, mStone,
  mFoundation, mShutter, mChimney, mAwning, mStep,
  mSign, mSignPost, mBench, mBenchLeg, mLamp, mLampLight, mFenceWood,
  mSand, mReed, mLilyPad, mLilyFlower,
  tileGeo, waterGeo
} from './materials.js';

var waterTiles = [];
var lilyPads = [];

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

  waterTiles = [];
  lilyPads = [];

  for (var y = 0; y < MAP_H; y++) {
    for (var x = 0; x < MAP_W; x++) {
      buildTile(worldGroup, x, y, MAP[y][x]);
    }
  }

  return { waterTiles: waterTiles, lilyPads: lilyPads };
}

function buildTile(worldGroup, x, y, type) {
  switch (type) {
    case G:
      addBox(worldGroup, x, y, 0, tileGeo, (x + y) % 3 === 0 ? mGrassD : mGrass, true);
      addGrassBlades(worldGroup, x, y);
      if ((x * 7 + y * 13) % 4 === 0) addTallGrass(worldGroup, x, y);
      break;
    case P:
      addBox(worldGroup, x, y, -0.01, tileGeo, mPath, true);
      if (Math.random() > 0.6) addPebble(worldGroup, x, y);
      break;
    case W:
      addBox(worldGroup, x, y, -0.1, tileGeo, mGrassD, false);
      var w = addBox(worldGroup, x, y, -0.03, waterGeo, mWater, true);
      waterTiles.push(w);
      addWaterEdge(worldGroup, x, y);
      addWaterDecor(worldGroup, x, y);
      break;
    case T: {
      addBox(worldGroup, x, y, 0, tileGeo, mGrassD, true);
      var treeType = pickTreeType(x, y);
      if (treeType === 0) addTreeRound(worldGroup, x, y);
      else if (treeType === 1) addTreePine(worldGroup, x, y);
      else addBush(worldGroup, x, y);
      break;
    }
    case H: addHouseWall(worldGroup, x, y); break;
    case R: addHouseRoof(worldGroup, x, y); break;
    case D: addDoor(worldGroup, x, y); break;
    case F:
      addBox(worldGroup, x, y, 0, tileGeo, mGrass, true);
      addGrassBlades(worldGroup, x, y);
      addFlowers(worldGroup, x, y);
      break;
    case S:
      addBox(worldGroup, x, y, 0, tileGeo, mGrass, true);
      addGrassBlades(worldGroup, x, y);
      addSign(worldGroup, x, y);
      break;
    case B:
      addBox(worldGroup, x, y, 0, tileGeo, mGrass, true);
      addGrassBlades(worldGroup, x, y);
      addBenchProp(worldGroup, x, y);
      break;
    case L:
      addBox(worldGroup, x, y, 0, tileGeo, mGrass, true);
      addLampPost(worldGroup, x, y);
      break;
    case N:
      addBox(worldGroup, x, y, 0, tileGeo, mGrass, true);
      addGrassBlades(worldGroup, x, y);
      addFence(worldGroup, x, y);
      break;
  }
}

function addBox(worldGroup, x, z, yOff, geo, mat, shadow) {
  var m = new THREE.Mesh(geo, mat);
  m.position.set(x, yOff, z);
  m.receiveShadow = shadow;
  worldGroup.add(m);
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

function addGrassBlades(worldGroup, wx, wz) {
  var rng = tileSeed(wx * 100, wz * 100);
  var count = 5 + Math.floor(rng() * 6); // 5-10 blades (was 3-7)
  for (var i = 0; i < count; i++) {
    var h = 0.1 + rng() * 0.18;
    var blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.018, h, 4),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.3 + rng() * 0.06, 0.55 + rng() * 0.15, 0.28 + rng() * 0.18),
        roughness: 0.8
      })
    );
    blade.position.set(wx + (rng() - 0.5) * 0.85, h / 2 + 0.06, wz + (rng() - 0.5) * 0.85);
    blade.rotation.x = (rng() - 0.5) * 0.35;
    blade.rotation.z = (rng() - 0.5) * 0.35;
    blade.castShadow = true;
    worldGroup.add(blade);
  }
}

// Tall grass tuft (appears on ~25% of grass tiles)
function addTallGrass(worldGroup, wx, wz) {
  var rng = tileSeed(wx * 200 + 7, wz * 200 + 13);
  var count = 3 + Math.floor(rng() * 3);
  for (var i = 0; i < count; i++) {
    var h = 0.25 + rng() * 0.15;
    var blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.025, h, 4),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.28 + rng() * 0.04, 0.65, 0.25 + rng() * 0.1),
        roughness: 0.75
      })
    );
    var ox = (rng() - 0.5) * 0.4;
    var oz = (rng() - 0.5) * 0.4;
    blade.position.set(wx + ox, h / 2 + 0.06, wz + oz);
    blade.rotation.x = (rng() - 0.5) * 0.2;
    blade.rotation.z = (rng() - 0.5) * 0.2;
    blade.castShadow = true;
    worldGroup.add(blade);
  }
}

function addPebble(worldGroup, wx, wz) {
  var p = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.04, 6, 4), mStone);
  p.position.set(wx + (Math.random() - 0.5) * 0.5, 0.04, wz + (Math.random() - 0.5) * 0.5);
  p.castShadow = true;
  worldGroup.add(p);
}

// Pick tree type deterministically: 0=round, 1=pine, 2=bush
function pickTreeType(x, z) {
  var h = ((x * 73856093) ^ (z * 19349669)) & 0x7fffffff;
  return h % 3;
}

// Round tree — big leafy canopy (improved original)
function addTreeRound(worldGroup, wx, wz) {
  var rng = tileSeed(wx * 300 + 1, wz * 300 + 1);
  var g = new THREE.Group();
  var tH = 0.7 + rng() * 0.35;
  var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, tH, 8), mTrunk);
  trunk.position.y = tH / 2 + 0.06;
  trunk.castShadow = true; trunk.receiveShadow = true;
  g.add(trunk);

  // Main canopy — 1 big sphere + 2-3 smaller ones
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

  g.position.set(wx, 0, wz);
  g.rotation.y = rng() * Math.PI * 2;
  worldGroup.add(g);
}

// Pine tree — conifer with stacked cones
function addTreePine(worldGroup, wx, wz) {
  var rng = tileSeed(wx * 400 + 2, wz * 400 + 2);
  var g = new THREE.Group();
  var tH = 0.9 + rng() * 0.4;
  var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, tH, 6), mTrunk);
  trunk.position.y = tH / 2 + 0.06;
  trunk.castShadow = true; trunk.receiveShadow = true;
  g.add(trunk);

  // 3 stacked cones, bottom to top (wider to narrower)
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

  g.position.set(wx, 0, wz);
  worldGroup.add(g);
}

// Bush — low, no trunk, flattened sphere(s)
function addBush(worldGroup, wx, wz) {
  var rng = tileSeed(wx * 500 + 3, wz * 500 + 3);
  var g = new THREE.Group();

  var mainR = 0.25 + rng() * 0.1;
  var main = new THREE.Mesh(
    new THREE.SphereGeometry(mainR, 8, 5),
    rng() > 0.5 ? mBush : mBushD
  );
  main.scale.y = 0.6; // flatten
  main.position.y = mainR * 0.5 + 0.06;
  main.castShadow = true; main.receiveShadow = true;
  g.add(main);

  // 1-2 extra lumps
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

  g.position.set(wx, 0, wz);
  worldGroup.add(g);
}

function addHouseWall(worldGroup, wx, wz) {
  addBox(worldGroup, wx, wz, 0, tileGeo, mGrass, true);

  // Foundation strip (dark grey band at bottom)
  var found = new THREE.Mesh(new THREE.BoxGeometry(TILE, 0.12, TILE), mFoundation);
  found.position.set(wx, 0.12, wz);
  found.castShadow = true; found.receiveShadow = true;
  worldGroup.add(found);

  // Main wall (sits on top of foundation)
  var wall = new THREE.Mesh(new THREE.BoxGeometry(TILE, 0.78, TILE), mWall);
  wall.position.set(wx, 0.57, wz);
  wall.castShadow = true; wall.receiveShadow = true;
  worldGroup.add(wall);

  // Window with shutters on exposed faces
  if (wz + 1 < MAP_H) {
    var below = MAP[wz + 1][wx];
    if (below !== H && below !== R && below !== D) {
      // Glass pane
      var win = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.02), mGlass);
      win.position.set(wx, 0.6, wz + 0.51);
      worldGroup.add(win);
      // Window frame
      var fr = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.01), mDoorF);
      fr.position.set(wx, 0.6, wz + 0.505);
      worldGroup.add(fr);
      // Left shutter
      var sL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.02), mShutter);
      sL.position.set(wx - 0.22, 0.6, wz + 0.515);
      sL.rotation.y = 0.15;
      worldGroup.add(sL);
      // Right shutter
      var sR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.02), mShutter);
      sR.position.set(wx + 0.22, 0.6, wz + 0.515);
      sR.rotation.y = -0.15;
      worldGroup.add(sR);
    }
  }
}

function addHouseRoof(worldGroup, wx, wz) {
  // Wall under the roof
  var wall = new THREE.Mesh(new THREE.BoxGeometry(TILE, 0.9, TILE), mWall);
  wall.position.set(wx, 0.51, wz);
  wall.castShadow = true;
  worldGroup.add(wall);

  // Roof overhang (wider than the wall)
  var roof = new THREE.Mesh(new THREE.BoxGeometry(TILE + 0.2, 0.12, TILE + 0.2), mRoof);
  roof.position.set(wx, 1.0, wz);
  roof.castShadow = true; roof.receiveShadow = true;
  worldGroup.add(roof);

  // Roof middle tier
  var mid = new THREE.Mesh(new THREE.BoxGeometry(TILE + 0.05, 0.1, TILE + 0.05), mRoof);
  mid.position.set(wx, 1.12, wz);
  mid.castShadow = true;
  worldGroup.add(mid);

  // Roof peak
  var peak = new THREE.Mesh(new THREE.BoxGeometry(TILE - 0.15, 0.1, TILE - 0.15), mRoof);
  peak.position.set(wx, 1.22, wz);
  peak.castShadow = true;
  worldGroup.add(peak);

  // Chimney (on some roof tiles, deterministic)
  if ((wx * 5 + wz * 11) % 3 === 0) {
    var chimney = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.15), mChimney);
    chimney.position.set(wx + 0.2, 1.4, wz - 0.15);
    chimney.castShadow = true;
    worldGroup.add(chimney);
    // Chimney top rim
    var rim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.2), mChimney);
    rim.position.set(wx + 0.2, 1.55, wz - 0.15);
    worldGroup.add(rim);
  }
}

function addDoor(worldGroup, wx, wz) {
  addBox(worldGroup, wx, wz, -0.01, tileGeo, mPath, true);

  // Foundation under door walls
  var fL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, TILE), mFoundation);
  fL.position.set(wx - 0.35, 0.12, wz); worldGroup.add(fL);
  var fR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, TILE), mFoundation);
  fR.position.set(wx + 0.35, 0.12, wz); worldGroup.add(fR);

  // Side walls
  var wl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.78, TILE), mWall);
  wl.position.set(wx - 0.35, 0.57, wz); wl.castShadow = true; worldGroup.add(wl);
  var wr = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.78, TILE), mWall);
  wr.position.set(wx + 0.35, 0.57, wz); wr.castShadow = true; worldGroup.add(wr);
  // Top wall above door
  var wt = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, TILE), mWall);
  wt.position.set(wx, 0.87, wz); worldGroup.add(wt);

  // Door panel
  var door = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.65, 0.06), mDoor);
  door.position.set(wx, 0.45, wz + 0.48); door.castShadow = true; worldGroup.add(door);

  // Door frame panels
  [[wx - 0.2, 0.45, 0.04, 0.7], [wx + 0.2, 0.45, 0.04, 0.7]].forEach(function(p) {
    var f = new THREE.Mesh(new THREE.BoxGeometry(p[2], p[3], 0.08), mDoorF);
    f.position.set(p[0], p[1], wz + 0.48); worldGroup.add(f);
  });
  var ftop = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.08), mDoorF);
  ftop.position.set(wx, 0.8, wz + 0.48); worldGroup.add(ftop);

  // Doorknob
  var knob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), mKnob);
  knob.position.set(wx + 0.12, 0.48, wz + 0.52); worldGroup.add(knob);

  // Awning above the door
  var awning = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.25), mAwning);
  awning.position.set(wx, 0.88, wz + 0.55);
  awning.rotation.x = 0.15; // slight tilt forward
  awning.castShadow = true;
  worldGroup.add(awning);

  // Steps (2 small steps in front)
  var step1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.15), mStep);
  step1.position.set(wx, 0.09, wz + 0.6); step1.receiveShadow = true; worldGroup.add(step1);
  var step2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.18), mStep);
  step2.position.set(wx, 0.03, wz + 0.75); step2.receiveShadow = true; worldGroup.add(step2);

  // Door mat
  var mat = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.15), new THREE.MeshStandardMaterial({ color: 0x8B6840, roughness: 0.95 }));
  mat.position.set(wx, 0.1, wz + 0.55); mat.receiveShadow = true; worldGroup.add(mat);
}

// Water edge — sand/pebbles where water meets land
function addWaterEdge(worldGroup, wx, wz) {
  var rng = tileSeed(wx * 600 + 4, wz * 600 + 4);
  var dirs = [
    { dx: 0, dz: -1, ox: 0, oz: -0.4 },  // north
    { dx: 0, dz: 1, ox: 0, oz: 0.4 },     // south
    { dx: -1, dz: 0, ox: -0.4, oz: 0 },   // west
    { dx: 1, dz: 0, ox: 0.4, oz: 0 }      // east
  ];
  for (var i = 0; i < dirs.length; i++) {
    var d = dirs[i];
    var nx = wx + d.dx;
    var nz = wz + d.dz;
    if (nx < 0 || nz < 0 || nx >= MAP_W || nz >= MAP_H) continue;
    if (MAP[nz][nx] === W) continue;
    // This edge faces land — add sand pebbles
    var count = 3 + Math.floor(rng() * 4);
    for (var j = 0; j < count; j++) {
      var spread = (rng() - 0.5) * 0.7;
      var px = wx + d.ox + (d.dz !== 0 ? spread : (rng() - 0.5) * 0.2);
      var pz = wz + d.oz + (d.dx !== 0 ? spread : (rng() - 0.5) * 0.2);
      var r = 0.03 + rng() * 0.04;
      var pebble = new THREE.Mesh(new THREE.SphereGeometry(r, 5, 4), mSand);
      pebble.position.set(px, -0.01, pz);
      pebble.scale.y = 0.5;
      worldGroup.add(pebble);
    }
  }
}

// Water decorations — reeds on edges, lily pads on interior
function addWaterDecor(worldGroup, wx, wz) {
  var rng = tileSeed(wx * 700 + 5, wz * 700 + 5);
  // Count water neighbors
  var waterNeighbors = 0;
  var dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  for (var i = 0; i < dirs.length; i++) {
    var nx = wx + dirs[i][0];
    var nz = wz + dirs[i][1];
    if (nx >= 0 && nz >= 0 && nx < MAP_W && nz < MAP_H && MAP[nz][nx] === W) {
      waterNeighbors++;
    }
  }

  // Edge tiles (fewer water neighbors) get reeds
  if (waterNeighbors <= 2 && rng() > 0.5) {
    var reeds = 2 + Math.floor(rng() * 3);
    for (var j = 0; j < reeds; j++) {
      var h = 0.3 + rng() * 0.25;
      var reed = new THREE.Mesh(new THREE.ConeGeometry(0.015, h, 4), mReed);
      reed.position.set(
        wx + (rng() - 0.5) * 0.6,
        h / 2,
        wz + (rng() - 0.5) * 0.6
      );
      reed.rotation.x = (rng() - 0.5) * 0.15;
      reed.rotation.z = (rng() - 0.5) * 0.15;
      reed.castShadow = true;
      worldGroup.add(reed);
    }
  }

  // Interior tiles (more water neighbors) get lily pads
  if (waterNeighbors >= 3 && rng() > 0.4) {
    var padX = wx + (rng() - 0.5) * 0.5;
    var padZ = wz + (rng() - 0.5) * 0.5;
    var pad = new THREE.Mesh(
      new THREE.CircleGeometry(0.1 + rng() * 0.06, 8),
      mLilyPad
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(padX, -0.01, padZ);
    worldGroup.add(pad);
    lilyPads.push(pad);

    // Some lily pads have a flower
    if (rng() > 0.5) {
      var flower = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), mLilyFlower);
      flower.position.set(padX, 0.02, padZ);
      worldGroup.add(flower);
      lilyPads.push(flower);
    }
  }
}

// Sign — wooden post + panel
function addSign(worldGroup, wx, wz) {
  var g = new THREE.Group();
  // Post
  var post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 6), mSignPost);
  post.position.y = 0.36;
  post.castShadow = true;
  g.add(post);
  // Panel
  var panel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.04), mSign);
  panel.position.y = 0.6;
  panel.castShadow = true; panel.receiveShadow = true;
  g.add(panel);
  // Panel frame (darker edge)
  var frame = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.29, 0.02), mSignPost);
  frame.position.y = 0.6;
  frame.position.z = -0.015;
  g.add(frame);
  g.position.set(wx, 0, wz);
  worldGroup.add(g);
}

// Bench — two legs + planks
function addBenchProp(worldGroup, wx, wz) {
  var g = new THREE.Group();
  // Left leg
  var legL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.3), mBenchLeg);
  legL.position.set(-0.25, 0.21, 0);
  legL.castShadow = true;
  g.add(legL);
  // Right leg
  var legR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.3), mBenchLeg);
  legR.position.set(0.25, 0.21, 0);
  legR.castShadow = true;
  g.add(legR);
  // Seat (3 planks)
  for (var i = -1; i <= 1; i++) {
    var plank = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.1), mBench);
    plank.position.set(0, 0.36, i * 0.1);
    plank.castShadow = true; plank.receiveShadow = true;
    g.add(plank);
  }
  // Backrest
  var back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.03), mBench);
  back.position.set(0, 0.5, -0.15);
  back.castShadow = true;
  g.add(back);
  g.position.set(wx, 0, wz);
  worldGroup.add(g);
}

// Lamp post — pole + lantern
function addLampPost(worldGroup, wx, wz) {
  var g = new THREE.Group();
  // Pole
  var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.2, 8), mLamp);
  pole.position.y = 0.66;
  pole.castShadow = true;
  g.add(pole);
  // Pole base
  var base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 8), mLamp);
  base.position.y = 0.1;
  g.add(base);
  // Lantern housing
  var housing = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.18), mLamp);
  housing.position.y = 1.28;
  housing.castShadow = true;
  g.add(housing);
  // Lantern top
  var top = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.08, 4), mLamp);
  top.position.y = 1.38;
  top.rotation.y = Math.PI / 4;
  g.add(top);
  // Light globe (emissive)
  var globe = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mLampLight);
  globe.position.y = 1.22;
  g.add(globe);
  g.position.set(wx, 0, wz);
  worldGroup.add(g);
}

// Fence — 2 posts + 2 horizontal bars
function addFence(worldGroup, wx, wz) {
  var g = new THREE.Group();
  // Left post
  var pL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), mFenceWood);
  pL.position.set(-0.35, 0.31, 0);
  pL.castShadow = true;
  g.add(pL);
  // Right post
  var pR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), mFenceWood);
  pR.position.set(0.35, 0.31, 0);
  pR.castShadow = true;
  g.add(pR);
  // Top bar
  var barT = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.04), mFenceWood);
  barT.position.y = 0.48;
  barT.castShadow = true;
  g.add(barT);
  // Bottom bar
  var barB = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.04), mFenceWood);
  barB.position.y = 0.25;
  barB.castShadow = true;
  g.add(barB);
  // Middle picket
  var mid = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), mFenceWood);
  mid.position.set(0, 0.29, 0);
  mid.castShadow = true;
  g.add(mid);
  g.position.set(wx, 0, wz);
  worldGroup.add(g);
}

function addFlowers(worldGroup, wx, wz) {
  for (var i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
    var fx = wx + (Math.random() - 0.5) * 0.7;
    var fz = wz + (Math.random() - 0.5) * 0.7;
    var fm = mFlowers[Math.floor(Math.random() * mFlowers.length)];
    var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.2, 4), mStem);
    stem.position.set(fx, 0.16, fz); worldGroup.add(stem);
    for (var p = 0; p < 5; p++) {
      var a = (p / 5) * Math.PI * 2;
      var petal = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), fm);
      petal.position.set(fx + Math.cos(a) * 0.06, 0.27, fz + Math.sin(a) * 0.06);
      petal.castShadow = true;
      worldGroup.add(petal);
    }
    var c = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), mFCenter);
    c.position.set(fx, 0.28, fz); worldGroup.add(c);
  }
}
