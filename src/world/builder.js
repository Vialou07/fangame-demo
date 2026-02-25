import * as THREE from 'three';
import { TILE, MAP_W, MAP_H, MAP, G, P, W, T, H, R, D, F } from '../data/map.js';
import {
  mGrass, mGrassD, mPath, mWater, mTrunk, mLeaf, mLeafL,
  mWall, mRoof, mDoor, mDoorF, mGlass, mKnob, mStem, mFCenter, mFlowers, mStone,
  tileGeo, waterGeo
} from './materials.js';

var waterTiles = [];

export function buildWorld(worldGroup) {
  // Ground plane
  var gnd = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP_W + 12, MAP_H + 12),
    new THREE.MeshStandardMaterial({ color: 0x4DA848, roughness: 0.95 })
  );
  gnd.rotation.x = -Math.PI / 2;
  gnd.position.set(MAP_W / 2 - 0.5, -0.08, MAP_H / 2 - 0.5);
  gnd.receiveShadow = true;
  worldGroup.add(gnd);

  waterTiles = [];

  for (var y = 0; y < MAP_H; y++) {
    for (var x = 0; x < MAP_W; x++) {
      buildTile(worldGroup, x, y, MAP[y][x]);
    }
  }

  return { waterTiles: waterTiles };
}

function buildTile(worldGroup, x, y, type) {
  switch (type) {
    case G:
      addBox(worldGroup, x, y, 0, tileGeo, (x + y) % 3 === 0 ? mGrassD : mGrass, true);
      if (Math.random() > 0.4) addGrassBlades(worldGroup, x, y);
      break;
    case P:
      addBox(worldGroup, x, y, -0.01, tileGeo, mPath, true);
      if (Math.random() > 0.6) addPebble(worldGroup, x, y);
      break;
    case W:
      addBox(worldGroup, x, y, -0.1, tileGeo, mGrassD, false);
      var w = addBox(worldGroup, x, y, -0.03, waterGeo, mWater, true);
      waterTiles.push(w);
      break;
    case T:
      addBox(worldGroup, x, y, 0, tileGeo, mGrassD, true);
      addTree(worldGroup, x, y);
      break;
    case H: addHouseWall(worldGroup, x, y); break;
    case R: addHouseRoof(worldGroup, x, y); break;
    case D: addDoor(worldGroup, x, y); break;
    case F:
      addBox(worldGroup, x, y, 0, tileGeo, mGrass, true);
      addGrassBlades(worldGroup, x, y);
      addFlowers(worldGroup, x, y);
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

function addGrassBlades(worldGroup, wx, wz) {
  for (var i = 0; i < 3 + Math.floor(Math.random() * 4); i++) {
    var blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.02, 0.13 + Math.random() * 0.12, 4),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.3 + Math.random() * 0.05, 0.6, 0.32 + Math.random() * 0.15),
        roughness: 0.8
      })
    );
    blade.position.set(wx + (Math.random() - 0.5) * 0.8, 0.12, wz + (Math.random() - 0.5) * 0.8);
    blade.rotation.x = (Math.random() - 0.5) * 0.3;
    blade.rotation.z = (Math.random() - 0.5) * 0.3;
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

function addTree(worldGroup, wx, wz) {
  var g = new THREE.Group();
  var tH = 0.8 + Math.random() * 0.3;
  var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, tH, 8), mTrunk);
  trunk.position.y = tH / 2 + 0.06;
  trunk.castShadow = true; trunk.receiveShadow = true;
  g.add(trunk);

  var base = tH + 0.1;
  [[0, base + 0.3, 0, 0.45], [-0.15, base + 0.1, 0.1, 0.35], [0.15, base + 0.15, -0.1, 0.32], [0, base + 0.55, 0, 0.3], [-0.1, base + 0.2, -0.15, 0.28]].forEach(function(s) {
    var leaf = new THREE.Mesh(new THREE.SphereGeometry(s[3], 8, 6), Math.random() > 0.4 ? mLeaf : mLeafL);
    leaf.position.set(s[0], s[1], s[2]);
    leaf.castShadow = true; leaf.receiveShadow = true;
    g.add(leaf);
  });

  g.position.set(wx, 0, wz);
  g.rotation.y = Math.random() * Math.PI * 2;
  worldGroup.add(g);
}

function addHouseWall(worldGroup, wx, wz) {
  addBox(worldGroup, wx, wz, 0, tileGeo, mGrass, true);
  var wall = new THREE.Mesh(new THREE.BoxGeometry(TILE, 0.9, TILE), mWall);
  wall.position.set(wx, 0.51, wz);
  wall.castShadow = true; wall.receiveShadow = true;
  worldGroup.add(wall);

  if (wz + 1 < MAP_H) {
    var below = MAP[wz + 1][wx];
    if (below !== H && below !== R && below !== D) {
      var win = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.02), mGlass);
      win.position.set(wx, 0.6, wz + 0.51);
      worldGroup.add(win);
      var fr = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.01), mDoorF);
      fr.position.set(wx, 0.6, wz + 0.505);
      worldGroup.add(fr);
    }
  }
}

function addHouseRoof(worldGroup, wx, wz) {
  var wall = new THREE.Mesh(new THREE.BoxGeometry(TILE, 0.9, TILE), mWall);
  wall.position.set(wx, 0.51, wz);
  wall.castShadow = true;
  worldGroup.add(wall);
  var roof = new THREE.Mesh(new THREE.BoxGeometry(TILE + 0.15, 0.15, TILE + 0.15), mRoof);
  roof.position.set(wx, 1.02, wz);
  roof.castShadow = true; roof.receiveShadow = true;
  worldGroup.add(roof);
  var peak = new THREE.Mesh(new THREE.BoxGeometry(TILE - 0.1, 0.12, TILE - 0.1), mRoof);
  peak.position.set(wx, 1.16, wz);
  peak.castShadow = true;
  worldGroup.add(peak);
}

function addDoor(worldGroup, wx, wz) {
  addBox(worldGroup, wx, wz, -0.01, tileGeo, mPath, true);
  var wl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, TILE), mWall);
  wl.position.set(wx - 0.35, 0.51, wz); wl.castShadow = true; worldGroup.add(wl);
  var wr = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, TILE), mWall);
  wr.position.set(wx + 0.35, 0.51, wz); wr.castShadow = true; worldGroup.add(wr);
  var wt = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, TILE), mWall);
  wt.position.set(wx, 0.86, wz); worldGroup.add(wt);

  var door = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.65, 0.06), mDoor);
  door.position.set(wx, 0.42, wz + 0.48); door.castShadow = true; worldGroup.add(door);

  [[wx - 0.2, 0.42, 0.04, 0.7], [wx + 0.2, 0.42, 0.04, 0.7]].forEach(function(p) {
    var f = new THREE.Mesh(new THREE.BoxGeometry(p[2], p[3], 0.08), mDoorF);
    f.position.set(p[0], p[1], wz + 0.48); worldGroup.add(f);
  });
  var ftop = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.08), mDoorF);
  ftop.position.set(wx, 0.77, wz + 0.48); worldGroup.add(ftop);

  var knob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), mKnob);
  knob.position.set(wx + 0.12, 0.45, wz + 0.52); worldGroup.add(knob);

  var mat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.2), new THREE.MeshStandardMaterial({ color: 0x8B6840, roughness: 0.95 }));
  mat.position.set(wx, 0.07, wz + 0.55); mat.receiveShadow = true; worldGroup.add(mat);
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
