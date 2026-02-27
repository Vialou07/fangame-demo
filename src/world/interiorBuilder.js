import * as THREE from 'three';
import {
  FL, WL, DX, CT, TB, CH, SH, BD, RG, NP, PC, PT, HM, CB
} from '../data/interiors.js';
import {
  mFloorWood, mFloorTile, mIntWall, mIntWallTop,
  mCounter, mCounterTop, mTableWood, mChairSeat,
  mShelfWood, mBook1, mBook2, mBook3,
  mBedFrame, mBedSheet, mPillow,
  mRug1, mPotTerra, mPotLeaf,
  mMonitor, mScreen, mHealMachine, mHealLight,
  mCabinetWood, mExitArrow, mDoor
} from './materials.js';

var TILE = 1;
var WALL_H = 1.2;

// Build a THREE.Group representing an interior room
// interiorDef = { name, width, height, spawnX, spawnZ, floorColor, layout }
export function buildInterior(interiorDef) {
  var group = new THREE.Group();
  var w = interiorDef.width;
  var h = interiorDef.height;

  // Floor color from definition
  var floorMat = new THREE.MeshStandardMaterial({
    color: interiorDef.floorColor,
    roughness: 0.8
  });

  // Interior lighting (bright ambient, subtle directional)
  var ambLight = new THREE.AmbientLight(0xFFF8E8, 0.9);
  group.add(ambLight);
  var dirLight = new THREE.DirectionalLight(0xFFF0D0, 0.5);
  dirLight.position.set(w / 2, 3, -1);
  group.add(dirLight);

  // Ceiling (flat plane on top)
  var ceilGeo = new THREE.PlaneGeometry(w, h);
  var ceilMat = new THREE.MeshStandardMaterial({ color: 0xF8F4E8, roughness: 0.7 });
  var ceil = new THREE.Mesh(ceilGeo, ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(w / 2 - 0.5, WALL_H, h / 2 - 0.5);
  group.add(ceil);

  for (var z = 0; z < h; z++) {
    for (var x = 0; x < w; x++) {
      var t = interiorDef.layout[z][x];
      buildInteriorTile(group, x, z, t, interiorDef, floorMat);
    }
  }

  return group;
}

function buildInteriorTile(group, x, z, type, def, floorMat) {
  switch (type) {
    case FL:
      addFloor(group, x, z, floorMat);
      break;
    case WL:
      addWall(group, x, z, def);
      break;
    case DX:
      addFloor(group, x, z, floorMat);
      addExitDoor(group, x, z);
      break;
    case CT:
      addFloor(group, x, z, floorMat);
      addCounter(group, x, z);
      break;
    case TB:
      addFloor(group, x, z, floorMat);
      addTable(group, x, z);
      break;
    case CH:
      addFloor(group, x, z, floorMat);
      addChair(group, x, z);
      break;
    case SH:
      addFloor(group, x, z, floorMat);
      addShelf(group, x, z);
      break;
    case BD:
      addFloor(group, x, z, floorMat);
      addBed(group, x, z);
      break;
    case RG:
      addFloor(group, x, z, floorMat);
      addRug(group, x, z);
      break;
    case NP:
      addFloor(group, x, z, floorMat);
      addNPCSpot(group, x, z);
      break;
    case PC:
      addFloor(group, x, z, floorMat);
      addComputer(group, x, z);
      break;
    case PT:
      addFloor(group, x, z, floorMat);
      addPottedPlant(group, x, z);
      break;
    case HM:
      addFloor(group, x, z, floorMat);
      addHealingMachine(group, x, z);
      break;
    case CB:
      addFloor(group, x, z, floorMat);
      addCabinet(group, x, z);
      break;
  }
}

function addFloor(group, x, z, mat) {
  var geo = new THREE.BoxGeometry(TILE * 1.01, 0.08, TILE * 1.01);
  var m = new THREE.Mesh(geo, mat);
  m.position.set(x, 0, z);
  m.receiveShadow = true;
  group.add(m);
}

function addWall(group, x, z, def) {
  // Floor under wall
  var fGeo = new THREE.BoxGeometry(TILE * 1.01, 0.08, TILE * 1.01);
  var fMat = new THREE.MeshStandardMaterial({ color: def.floorColor, roughness: 0.8 });
  var floor = new THREE.Mesh(fGeo, fMat);
  floor.position.set(x, 0, z);
  group.add(floor);

  // Wall block
  var wGeo = new THREE.BoxGeometry(TILE, WALL_H, TILE);
  var wall = new THREE.Mesh(wGeo, mIntWall);
  wall.position.set(x, WALL_H / 2 + 0.04, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  // Baseboard trim (darker strip at bottom)
  var trimGeo = new THREE.BoxGeometry(TILE + 0.02, 0.06, TILE + 0.02);
  var trimMat = new THREE.MeshStandardMaterial({ color: 0x8B7050, roughness: 0.85 });
  var trim = new THREE.Mesh(trimGeo, trimMat);
  trim.position.set(x, 0.07, z);
  group.add(trim);
}

function addExitDoor(group, x, z) {
  // Door frame
  var frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.85, 0.08),
    mDoor
  );
  frame.position.set(x, 0.46, z + 0.46);
  group.add(frame);

  // Pulsing exit arrow on floor
  var arrowGeo = new THREE.ConeGeometry(0.12, 0.2, 3);
  arrowGeo.rotateX(-Math.PI / 2);
  var arrow = new THREE.Mesh(arrowGeo, mExitArrow);
  arrow.position.set(x, 0.06, z + 0.15);
  group.add(arrow);

  // "EXIT" mat
  var matGeo = new THREE.BoxGeometry(0.6, 0.02, 0.4);
  var matMesh = new THREE.Mesh(matGeo, new THREE.MeshStandardMaterial({ color: 0x8B6840, roughness: 0.95 }));
  matMesh.position.set(x, 0.05, z);
  group.add(matMesh);
}

function addCounter(group, x, z) {
  // Counter body
  var body = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.65, 0.85),
    mCounter
  );
  body.position.set(x, 0.37, z);
  body.castShadow = true;
  group.add(body);

  // Counter top surface
  var top = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.06, 0.9),
    mCounterTop
  );
  top.position.set(x, 0.72, z);
  top.receiveShadow = true;
  group.add(top);
}

function addTable(group, x, z) {
  // Table top
  var top = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.05, 0.75),
    mTableWood
  );
  top.position.set(x, 0.42, z);
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // 4 legs
  var legGeo = new THREE.BoxGeometry(0.06, 0.38, 0.06);
  var offsets = [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]];
  for (var i = 0; i < offsets.length; i++) {
    var leg = new THREE.Mesh(legGeo, mTableWood);
    leg.position.set(x + offsets[i][0], 0.23, z + offsets[i][1]);
    leg.castShadow = true;
    group.add(leg);
  }
}

function addChair(group, x, z) {
  // Seat
  var seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.04, 0.35),
    mChairSeat
  );
  seat.position.set(x, 0.28, z);
  seat.castShadow = true;
  group.add(seat);

  // 4 legs
  var legGeo = new THREE.BoxGeometry(0.04, 0.26, 0.04);
  var offsets = [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]];
  for (var i = 0; i < offsets.length; i++) {
    var leg = new THREE.Mesh(legGeo, mChairSeat);
    leg.position.set(x + offsets[i][0], 0.15, z + offsets[i][1]);
    group.add(leg);
  }

  // Back rest
  var back = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.25, 0.04),
    mChairSeat
  );
  back.position.set(x, 0.43, z - 0.15);
  back.castShadow = true;
  group.add(back);
}

function addShelf(group, x, z) {
  // Shelf body (tall bookcase)
  var body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.0, 0.35),
    mShelfWood
  );
  body.position.set(x, 0.54, z);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Books on shelves (3 rows)
  var bookMats = [mBook1, mBook2, mBook3];
  for (var row = 0; row < 3; row++) {
    var by = 0.25 + row * 0.3;
    var count = 3 + Math.floor(((x * 7 + z * 11 + row * 3) & 0xff) / 85);
    for (var b = 0; b < count; b++) {
      var bw = 0.06 + ((x * 3 + z * 5 + b * 7) % 4) * 0.015;
      var bh = 0.18 + ((x * 11 + z * 3 + b * 13) % 5) * 0.02;
      var book = new THREE.Mesh(
        new THREE.BoxGeometry(bw, bh, 0.15),
        bookMats[(x + z + b + row) % 3]
      );
      book.position.set(x - 0.3 + b * 0.14 + 0.05, by, z);
      group.add(book);
    }
  }
}

function addBed(group, x, z) {
  // Frame
  var frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.22, 0.9),
    mBedFrame
  );
  frame.position.set(x, 0.15, z);
  frame.castShadow = true;
  group.add(frame);

  // Mattress / sheet
  var sheet = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 0.1, 0.82),
    mBedSheet
  );
  sheet.position.set(x, 0.31, z);
  sheet.receiveShadow = true;
  group.add(sheet);

  // Pillow
  var pillow = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.08, 0.2),
    mPillow
  );
  pillow.position.set(x, 0.38, z - 0.28);
  group.add(pillow);
}

function addRug(group, x, z) {
  var rugMat = mRug1;
  var rug = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.02, 0.9),
    rugMat
  );
  rug.position.set(x, 0.05, z);
  rug.receiveShadow = true;
  group.add(rug);

  // Border pattern (slightly different shade)
  var borderMat = new THREE.MeshStandardMaterial({ color: 0x802020, roughness: 0.92 });
  var borderGeo = new THREE.BoxGeometry(0.95, 0.015, 0.95);
  var border = new THREE.Mesh(borderGeo, borderMat);
  border.position.set(x, 0.045, z);
  group.add(border);
}

function addNPCSpot(group, x, z) {
  // Simple cylinder placeholder for NPC position
  var base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.02, 12),
    new THREE.MeshStandardMaterial({ color: 0x60A0D0, roughness: 0.7 })
  );
  base.position.set(x, 0.05, z);
  group.add(base);

  // Simple NPC body (capsule-like)
  var body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 0.45, 8),
    new THREE.MeshStandardMaterial({ color: 0xF0E0C0, roughness: 0.7 })
  );
  body.position.set(x, 0.31, z);
  body.castShadow = true;
  group.add(body);

  // Head
  var head = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xF0D0A8, roughness: 0.6 })
  );
  head.position.set(x, 0.65, z);
  head.castShadow = true;
  group.add(head);
}

function addComputer(group, x, z) {
  // Desk
  var desk = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.04, 0.5),
    mTableWood
  );
  desk.position.set(x, 0.42, z);
  desk.castShadow = true;
  group.add(desk);

  // Desk legs
  var legGeo = new THREE.BoxGeometry(0.05, 0.38, 0.05);
  var legs = [[-0.28, -0.18], [0.28, -0.18], [-0.28, 0.18], [0.28, 0.18]];
  for (var i = 0; i < legs.length; i++) {
    var leg = new THREE.Mesh(legGeo, mTableWood);
    leg.position.set(x + legs[i][0], 0.23, z + legs[i][1]);
    group.add(leg);
  }

  // Monitor
  var monitor = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.28, 0.04),
    mMonitor
  );
  monitor.position.set(x, 0.58, z - 0.1);
  monitor.castShadow = true;
  group.add(monitor);

  // Screen glow
  var screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.22, 0.01),
    mScreen
  );
  screen.position.set(x, 0.58, z - 0.075);
  group.add(screen);

  // Monitor stand
  var stand = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.08, 0.06),
    mMonitor
  );
  stand.position.set(x, 0.46, z - 0.1);
  group.add(stand);
}

function addPottedPlant(group, x, z) {
  // Pot
  var pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.1, 0.2, 8),
    mPotTerra
  );
  pot.position.set(x, 0.14, z);
  pot.castShadow = true;
  group.add(pot);

  // Dirt visible on top
  var dirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.02, 8),
    new THREE.MeshStandardMaterial({ color: 0x6B4830, roughness: 0.95 })
  );
  dirt.position.set(x, 0.25, z);
  group.add(dirt);

  // Leafy top (sphere cluster)
  var main = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 7, 5),
    mPotLeaf
  );
  main.position.set(x, 0.42, z);
  main.castShadow = true;
  group.add(main);

  var side1 = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 6, 4),
    mPotLeaf
  );
  side1.position.set(x + 0.1, 0.38, z + 0.08);
  group.add(side1);

  var side2 = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 6, 4),
    mPotLeaf
  );
  side2.position.set(x - 0.08, 0.36, z - 0.06);
  group.add(side2);
}

function addHealingMachine(group, x, z) {
  // Base unit
  var base = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.6, 0.6),
    mHealMachine
  );
  base.position.set(x, 0.34, z);
  base.castShadow = true;
  group.add(base);

  // Top panel
  var panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.04, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xC0C0C0, roughness: 0.5, metalness: 0.3 })
  );
  panel.position.set(x, 0.66, z);
  group.add(panel);

  // Healing light (glowing orb)
  var light = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 6),
    mHealLight
  );
  light.position.set(x, 0.78, z);
  group.add(light);

  // Pokeball slots (3 circles on top)
  var slotMat = new THREE.MeshStandardMaterial({ color: 0x505050, roughness: 0.6 });
  for (var i = -1; i <= 1; i++) {
    var slot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.02, 8),
      slotMat
    );
    slot.position.set(x + i * 0.2, 0.69, z);
    group.add(slot);
  }
}

function addCabinet(group, x, z) {
  var body = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.8, 0.4),
    mCabinetWood
  );
  body.position.set(x, 0.44, z);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Doors (two front panels)
  var doorMat = new THREE.MeshStandardMaterial({ color: 0x9B7848, roughness: 0.72 });
  var doorL = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.7, 0.02),
    doorMat
  );
  doorL.position.set(x - 0.17, 0.44, z + 0.21);
  group.add(doorL);

  var doorR = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.7, 0.02),
    doorMat
  );
  doorR.position.set(x + 0.17, 0.44, z + 0.21);
  group.add(doorR);

  // Knobs
  var knobMat = new THREE.MeshStandardMaterial({ color: 0xD8B860, roughness: 0.3, metalness: 0.6 });
  var knobL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), knobMat);
  knobL.position.set(x - 0.04, 0.44, z + 0.23);
  group.add(knobL);
  var knobR = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), knobMat);
  knobR.position.set(x + 0.04, 0.44, z + 0.23);
  group.add(knobR);
}
