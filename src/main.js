import * as THREE from 'three';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';

import { createRenderer } from './engine/renderer.js';
import { createScene } from './engine/scene.js';
import { createCamera, VIEW_SIZE, CAM_DX, CAM_DY, CAM_DZ } from './engine/camera.js';
import { setupLighting } from './engine/lighting.js';
import { createInput } from './engine/input.js';

document.getElementById('info').style.display = '';

// ===================== CONSTANTS =====================
var TILE = 1;
var MAP_W = 14;
var MAP_H = 12;
var MOVE_SPEED = 3.2;

var G = 0, P = 1, W = 2, T = 3, H = 4, R = 5, D = 6, F = 7;

var MAP = [
  [T,T,T,G,G,G,G,G,G,G,G,T,T,T],
  [T,G,G,G,F,G,G,G,G,F,G,G,G,T],
  [G,G,R,R,R,G,G,G,R,R,R,R,G,G],
  [G,G,H,H,H,G,G,G,H,H,H,H,G,G],
  [G,G,H,D,H,G,G,G,H,D,H,H,G,G],
  [G,G,G,P,G,G,F,G,G,P,G,G,G,G],
  [P,P,P,P,P,P,P,P,P,P,P,P,P,P],
  [G,G,G,G,G,W,W,W,G,G,G,F,G,G],
  [G,F,G,G,W,W,W,W,W,G,G,G,G,G],
  [G,G,G,G,G,W,W,W,G,G,G,G,F,G],
  [G,G,F,G,G,G,G,G,G,G,F,G,G,G],
  [T,T,G,G,G,G,G,G,G,G,G,G,T,T],
];

function isBlocked(x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true;
  var t = MAP[y][x];
  return t === T || t === H || t === R || t === W;
}

// ===================== ENGINE SETUP =====================
var renderer = createRenderer();
var { scene, worldGroup } = createScene();
var camera = createCamera();
var aspect = window.innerWidth / window.innerHeight;
setupLighting(scene, MAP_W, MAP_H);
var keys = createInput();

// ===================== MATERIALS =====================
var mGrass = new THREE.MeshStandardMaterial({ color: 0x5DB858, roughness: 0.9 });
var mGrassD = new THREE.MeshStandardMaterial({ color: 0x4DA848, roughness: 0.9 });
var mPath = new THREE.MeshStandardMaterial({ color: 0xD8C898, roughness: 0.95 });
var mWater = new THREE.MeshStandardMaterial({ color: 0x3A8AD8, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.82 });
var mTrunk = new THREE.MeshStandardMaterial({ color: 0x6B4830, roughness: 0.85 });
var mLeaf = new THREE.MeshStandardMaterial({ color: 0x2E8B40, roughness: 0.65 });
var mLeafL = new THREE.MeshStandardMaterial({ color: 0x48B848, roughness: 0.65 });
var mWall = new THREE.MeshStandardMaterial({ color: 0xF0E8D8, roughness: 0.7 });
var mRoof = new THREE.MeshStandardMaterial({ color: 0xC84848, roughness: 0.55 });
var mDoor = new THREE.MeshStandardMaterial({ color: 0x8B6840, roughness: 0.75 });
var mDoorF = new THREE.MeshStandardMaterial({ color: 0x5A3820, roughness: 0.8 });
var mGlass = new THREE.MeshStandardMaterial({ color: 0x88CCFF, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.65 });
var mKnob = new THREE.MeshStandardMaterial({ color: 0xF0D030, roughness: 0.15, metalness: 0.85 });
var mStem = new THREE.MeshStandardMaterial({ color: 0x3D8838, roughness: 0.8 });
var mFCenter = new THREE.MeshStandardMaterial({ color: 0xFFF8D0, roughness: 0.4, emissive: 0xFFF8D0, emissiveIntensity: 0.12 });
var mFlowers = [
  new THREE.MeshStandardMaterial({ color: 0xF06878, roughness: 0.5 }),
  new THREE.MeshStandardMaterial({ color: 0xF8E040, roughness: 0.5 }),
  new THREE.MeshStandardMaterial({ color: 0x78A8F0, roughness: 0.5 }),
  new THREE.MeshStandardMaterial({ color: 0xFF88BB, roughness: 0.5 }),
];
var mStone = new THREE.MeshStandardMaterial({ color: 0x999, roughness: 0.85 });

// ===================== SHARED GEOS =====================
var tileGeo = new THREE.BoxGeometry(TILE, 0.12, TILE);
var waterGeo = new THREE.BoxGeometry(TILE, 0.05, TILE);

// ===================== BUILD WORLD =====================
var gnd = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W + 12, MAP_H + 12), new THREE.MeshStandardMaterial({ color: 0x4DA848, roughness: 0.95 }));
gnd.rotation.x = -Math.PI / 2;
gnd.position.set(MAP_W / 2 - 0.5, -0.08, MAP_H / 2 - 0.5);
gnd.receiveShadow = true;
worldGroup.add(gnd);

var waterTiles = [];

for (var y = 0; y < MAP_H; y++) {
  for (var x = 0; x < MAP_W; x++) {
    buildTile(x, y, MAP[y][x]);
  }
}

function buildTile(x, y, type) {
  switch (type) {
    case G:
      addBox(x, y, 0, tileGeo, (x + y) % 3 === 0 ? mGrassD : mGrass, true);
      if (Math.random() > 0.4) addGrassBlades(x, y);
      break;
    case P:
      addBox(x, y, -0.01, tileGeo, mPath, true);
      if (Math.random() > 0.6) addPebble(x, y);
      break;
    case W:
      addBox(x, y, -0.1, tileGeo, mGrassD, false);
      var w = addBox(x, y, -0.03, waterGeo, mWater, true);
      waterTiles.push(w);
      break;
    case T:
      addBox(x, y, 0, tileGeo, mGrassD, true);
      addTree(x, y);
      break;
    case H: addHouseWall(x, y); break;
    case R: addHouseRoof(x, y); break;
    case D: addDoor(x, y); break;
    case F:
      addBox(x, y, 0, tileGeo, mGrass, true);
      addGrassBlades(x, y);
      addFlowers(x, y);
      break;
  }
}

function addBox(x, z, yOff, geo, mat, shadow) {
  var m = new THREE.Mesh(geo, mat);
  m.position.set(x, yOff, z);
  m.receiveShadow = shadow;
  worldGroup.add(m);
  return m;
}

function addGrassBlades(wx, wz) {
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

function addPebble(wx, wz) {
  var p = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.04, 6, 4), mStone);
  p.position.set(wx + (Math.random() - 0.5) * 0.5, 0.04, wz + (Math.random() - 0.5) * 0.5);
  p.castShadow = true;
  worldGroup.add(p);
}

function addTree(wx, wz) {
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

function addHouseWall(wx, wz) {
  addBox(wx, wz, 0, tileGeo, mGrass, true);
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

function addHouseRoof(wx, wz) {
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

function addDoor(wx, wz) {
  addBox(wx, wz, -0.01, tileGeo, mPath, true);
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

function addFlowers(wx, wz) {
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

// ===================== PLAYER FACTORY =====================
function createPlayer(bodyColor, hatColor) {
  var group = new THREE.Group();
  var parts = [];
  var baseYs = [];

  var bMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.55 });
  var b = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.25, 8, 12), bMat);
  b.position.y = 0.32; b.castShadow = true; group.add(b);
  parts.push(b); baseYs.push(0.32);

  var hMat = new THREE.MeshStandardMaterial({ color: 0xF8C8A8, roughness: 0.65 });
  var h = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), hMat);
  h.position.y = 0.58; h.castShadow = true; group.add(h);
  parts.push(h); baseYs.push(0.58);

  var hrMat = new THREE.MeshStandardMaterial({ color: 0x383838, roughness: 0.8 });
  var hr = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hrMat);
  hr.position.y = 0.61; hr.castShadow = true; group.add(hr);
  parts.push(hr); baseYs.push(0.61);

  var htMat = new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.45 });
  var ht = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.08, 12), htMat);
  ht.position.y = 0.7; ht.castShadow = true; group.add(ht);
  parts.push(ht); baseYs.push(0.7);

  var brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 12), htMat);
  brim.position.y = 0.67; group.add(brim);
  parts.push(brim); baseYs.push(0.67);

  var eMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 });
  var eL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), eMat);
  eL.position.set(-0.05, 0.59, 0.11); group.add(eL);
  var eR = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), eMat);
  eR.position.set(0.05, 0.59, 0.11); group.add(eR);

  var shad = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }));
  shad.rotation.x = -Math.PI / 2; shad.position.y = 0.07; group.add(shad);

  return { group: group, parts: parts, baseYs: baseYs };
}

var PLAYER_COLORS = [0xE04040, 0x4080E0, 0x40C040, 0xA040E0, 0xE08040, 0xE040A0, 0x40C0C0, 0xC0C040];

var local = createPlayer(0xE04040, 0xE04040);
var playerGroup = local.group;
var playerX = 6, playerZ = 6;
playerGroup.position.set(playerX, 0, playerZ);
scene.add(playerGroup);

// ===================== REMOTE PLAYERS =====================
var remotePlayers = {};
var nametagContainer = document.getElementById('nametags');

function getOrCreateRemote(pid, colorIndex) {
  if (!remotePlayers[pid]) {
    var c = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
    var p = createPlayer(c, c);
    p.group.position.set(6, 0, 6);
    scene.add(p.group);
    var tag = document.createElement('div');
    tag.className = 'nametag';
    nametagContainer.appendChild(tag);
    remotePlayers[pid] = { player: p, state: { x: 6, z: 6, ry: 0, m: false }, name: '', tag: tag };
  }
  return remotePlayers[pid];
}

function removeRemote(pid) {
  if (remotePlayers[pid]) {
    scene.remove(remotePlayers[pid].player.group);
    if (remotePlayers[pid].tag) remotePlayers[pid].tag.remove();
    delete remotePlayers[pid];
  }
}

// ===================== LOCAL STATE =====================
var localMoving = false;

// ===================== FIREBASE =====================
var fb = firebase;
fb.initializeApp({
  apiKey: "AIzaSyDCpaLs-HjZFEUqnaLPYvtiug1-6wvO0m0",
  authDomain: "fangame-demo.firebaseapp.com",
  databaseURL: "https://fangame-demo-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "fangame-demo",
  storageBucket: "fangame-demo.firebasestorage.app",
  messagingSenderId: "824308900575",
  appId: "1:824308900575:web:28eb2ab2afd2b18ec8ff6a"
});
var auth = fb.auth();
var db = fb.database();

// ===================== GAME STATE =====================
var myUid = null;
var myName = '';
var myColor = 0;
var isOnline = false;
var presenceRef = null;
var enteringWorld = false;

var lobbyEl = document.getElementById('lobby');
var statusEl = document.getElementById('status');
var badge = document.getElementById('connBadge');

function showStatus(msg, isError) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#F06878' : '#6FE080';
}

function hideLobby() {
  lobbyEl.classList.add('hidden');
}

function updateBadge() {
  if (!myUid) { badge.style.display = 'none'; return; }
  var count = Object.keys(remotePlayers).length;
  var label = count > 0 ? (count + 1) + ' en ligne' : 'En ligne';
  badge.innerHTML = '<span class="badge-name">' + myName + '</span>' +
    '<span class="badge-info">' + label + '</span>' +
    '<span class="badge-logout" id="logoutBtn">Deconnexion</span>';
  badge.className = 'on';
  badge.style.display = 'block';
  document.getElementById('logoutBtn').onclick = logout;
}

// ===================== AUTH =====================
async function enterWorld(uid, displayName, colorIndex) {
  myUid = uid;
  myName = displayName;
  myColor = colorIndex;

  // Apply player color
  var c = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  local.parts[0].material.color.setHex(c); // body
  local.parts[3].material.color.setHex(c); // hat
  local.parts[4].material.color.setHex(c); // brim

  // Load saved position
  try {
    var snap = await db.ref('users/' + uid + '/gameState').once('value');
    var gameState = snap.val();
    if (gameState && gameState.position) {
      playerX = gameState.position.x;
      playerZ = gameState.position.z;
      playerGroup.position.set(playerX, 0, playerZ);
      if (gameState.position.ry !== undefined) {
        playerGroup.rotation.y = gameState.position.ry;
        targetAngle = gameState.position.ry;
      }
    }
  } catch (e) { console.error('Load failed:', e); }

  hideLobby();
  goOnline();
}

// Auto-login on page load
auth.onAuthStateChanged(async function(user) {
  if (user && !myUid && !enteringWorld) {
    enteringWorld = true;
    showStatus('Connexion automatique...', false);
    try {
      var snap = await db.ref('users/' + user.uid + '/profile').once('value');
      var profile = snap.val();
      if (profile) {
        await enterWorld(user.uid, profile.displayName, profile.color);
      }
    } catch (e) {
      console.error('Auto-login failed:', e);
      showStatus('', false);
    }
    enteringWorld = false;
  }
});

async function logout() {
  goOffline();
  myUid = null;
  myName = '';
  isOnline = false;
  try { await auth.signOut(); } catch (e) {}
  lobbyEl.classList.remove('hidden');
  badge.style.display = 'none';
  playerX = 6; playerZ = 6;
  playerGroup.position.set(playerX, 0, playerZ);
  showStatus('', false);
}

function firebaseError(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'Cet email est deja utilise';
    case 'auth/invalid-email': return 'Email invalide';
    case 'auth/wrong-password': return 'Mot de passe incorrect';
    case 'auth/user-not-found': return 'Aucun compte avec cet email';
    case 'auth/weak-password': return 'Mot de passe trop faible (6+ caracteres)';
    case 'auth/too-many-requests': return 'Trop de tentatives, reessaie plus tard';
    case 'auth/invalid-credential': return 'Email ou mot de passe incorrect';
    default: return 'Erreur: ' + code;
  }
}

// ===================== PRESENCE & SYNC =====================
function goOnline() {
  if (isOnline || !myUid) return;
  isOnline = true;

  presenceRef = db.ref('presence/' + myUid);
  presenceRef.set({
    x: Math.round(playerX * 100) / 100,
    z: Math.round(playerZ * 100) / 100,
    ry: Math.round(playerGroup.rotation.y * 100) / 100,
    m: false,
    c: myColor,
    name: myName,
    lastSeen: fb.database.ServerValue.TIMESTAMP
  });
  presenceRef.onDisconnect().remove();

  // Re-setup presence on reconnect
  db.ref('.info/connected').on('value', function(snap) {
    if (snap.val() === true && myUid && presenceRef) {
      presenceRef.onDisconnect().remove();
    }
  });

  // Listen for other players
  var allPresence = db.ref('presence');

  allPresence.on('child_added', function(snap) {
    if (snap.key === myUid) return;
    var d = snap.val();
    var rp = getOrCreateRemote(snap.key, d.c);
    rp.state.x = d.x; rp.state.z = d.z; rp.state.ry = d.ry; rp.state.m = d.m;
    rp.name = d.name || '???';
    if (rp.tag) rp.tag.textContent = rp.name;
    updateBadge();
  });

  allPresence.on('child_changed', function(snap) {
    if (snap.key === myUid) return;
    var d = snap.val();
    if (remotePlayers[snap.key]) {
      var s = remotePlayers[snap.key].state;
      s.x = d.x; s.z = d.z; s.ry = d.ry; s.m = d.m;
      if (d.name && remotePlayers[snap.key].tag) {
        remotePlayers[snap.key].name = d.name;
        remotePlayers[snap.key].tag.textContent = d.name;
      }
    }
  });

  allPresence.on('child_removed', function(snap) {
    if (snap.key === myUid) return;
    removeRemote(snap.key);
    updateBadge();
  });

  updateBadge();
}

function goOffline() {
  if (!isOnline || !myUid) return;
  isOnline = false;
  saveGame();
  if (presenceRef) { try { presenceRef.remove(); } catch (e) {} }
  db.ref('presence').off();
  db.ref('.info/connected').off();
  for (var pid in remotePlayers) removeRemote(pid);
}

// Sync position (10Hz with delta check)
var lastSync = { x: 0, z: 0, ry: 0, m: false };
var lastSyncTime = 0;

function syncPosition(time) {
  if (!myUid || !isOnline || !presenceRef) return;
  if (time - lastSyncTime < 0.1) return;

  var ry = playerGroup.rotation.y;
  var m = localMoving;
  var sx = Math.round(playerX * 100) / 100;
  var sz = Math.round(playerZ * 100) / 100;
  var sry = Math.round(ry * 100) / 100;

  if (sx === lastSync.x && sz === lastSync.z && sry === lastSync.ry && m === lastSync.m) return;

  lastSyncTime = time;
  lastSync = { x: sx, z: sz, ry: sry, m: m };

  presenceRef.update({
    x: sx, z: sz, ry: sry, m: m,
    lastSeen: fb.database.ServerValue.TIMESTAMP
  });
}

// ===================== SAVE / LOAD =====================
function saveGame() {
  if (!myUid) return;
  db.ref('users/' + myUid + '/gameState').set({
    position: {
      x: Math.round(playerX * 100) / 100,
      z: Math.round(playerZ * 100) / 100,
      ry: Math.round(playerGroup.rotation.y * 100) / 100
    },
    lastSaved: fb.database.ServerValue.TIMESTAMP
  });
}

// Auto-save every 60s
setInterval(function() { if (isOnline) saveGame(); }, 60000);
window.addEventListener('beforeunload', function() { if (isOnline) { saveGame(); goOffline(); } });

// ===================== UI HANDLERS =====================
// Tab switching
document.querySelectorAll('.tab').forEach(function(tab) {
  tab.onclick = function() {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    tab.classList.add('active');
    document.getElementById('tab-login').style.display = tab.dataset.tab === 'login' ? '' : 'none';
    document.getElementById('tab-register').style.display = tab.dataset.tab === 'register' ? '' : 'none';
    statusEl.textContent = '';
  };
});

// Login
document.getElementById('btnLogin').onclick = async function() {
  var email = document.getElementById('loginEmail').value.trim();
  var pass = document.getElementById('loginPass').value;
  if (!email || !pass) { showStatus('Remplis tous les champs', true); return; }
  showStatus('Connexion...', false);
  enteringWorld = true;
  try {
    var cred = await auth.signInWithEmailAndPassword(email, pass);
    var snap = await db.ref('users/' + cred.user.uid + '/profile').once('value');
    var profile = snap.val();
    if (profile) {
      await enterWorld(cred.user.uid, profile.displayName, profile.color);
    } else {
      showStatus('Profil introuvable', true);
    }
  } catch (e) {
    showStatus(firebaseError(e.code), true);
  } finally {
    enteringWorld = false;
  }
};

// Register
document.getElementById('btnRegister').onclick = async function() {
  var email = document.getElementById('regEmail').value.trim();
  var name = document.getElementById('regName').value.trim();
  var pass = document.getElementById('regPass').value;
  var pass2 = document.getElementById('regPass2').value;
  if (!email || !name || !pass) { showStatus('Remplis tous les champs', true); return; }
  if (pass !== pass2) { showStatus('Les mots de passe ne correspondent pas', true); return; }
  if (pass.length < 6) { showStatus('Mot de passe trop court (6 min)', true); return; }
  if (name.length < 2 || name.length > 16) { showStatus('Nom: 2-16 caracteres', true); return; }
  showStatus('Creation du compte...', false);
  enteringWorld = true;
  try {
    var cred = await auth.createUserWithEmailAndPassword(email, pass);
    var colorIndex = Math.floor(Math.random() * PLAYER_COLORS.length);
    await db.ref('users/' + cred.user.uid + '/profile').set({
      displayName: name,
      color: colorIndex,
      createdAt: fb.database.ServerValue.TIMESTAMP
    });
    await enterWorld(cred.user.uid, name, colorIndex);
  } catch (e) {
    showStatus(firebaseError(e.code), true);
  } finally {
    enteringWorld = false;
  }
};

// Enter key submits forms
document.getElementById('loginPass').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') document.getElementById('btnLogin').click();
});
document.getElementById('regPass2').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') document.getElementById('btnRegister').click();
});

// Solo (offline)
document.getElementById('btnSolo').onclick = function() { hideLobby(); };

// ===================== RESIZE =====================
window.addEventListener('resize', function() {
  aspect = window.innerWidth / window.innerHeight;
  camera.left = -VIEW_SIZE * aspect;
  camera.right = VIEW_SIZE * aspect;
  camera.top = VIEW_SIZE;
  camera.bottom = -VIEW_SIZE;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===================== LOOP =====================
var targetAngle = 0;
var clock = new THREE.Clock();
var camPosV = new THREE.Vector3();
var projV = new THREE.Vector3();

camera.position.set(playerX + CAM_DX, CAM_DY, playerZ + CAM_DZ);
camera.lookAt(playerX, 0, playerZ);
var camQuat = camera.quaternion.clone();

function animate() {
  requestAnimationFrame(animate);
  var dt = Math.min(clock.getDelta(), 0.05);
  var time = clock.elapsedTime;

  // --- Local movement ---
  var dx = 0, dz = 0;
  if (keys['ArrowLeft'] || keys['KeyA']) dx = -1;
  if (keys['ArrowRight'] || keys['KeyD']) dx = 1;
  if (keys['ArrowUp'] || keys['KeyW']) dz = -1;
  if (keys['ArrowDown'] || keys['KeyS']) dz = 1;

  var moving = dx !== 0 || dz !== 0;
  localMoving = moving;
  if (moving) {
    var len = Math.sqrt(dx * dx + dz * dz);
    dx /= len; dz /= len;

    var newX = playerX + dx * MOVE_SPEED * dt;
    var newZ = playerZ + dz * MOVE_SPEED * dt;
    var r = 0.22;

    var cx1 = Math.floor(newX - r + 0.5), cx2 = Math.floor(newX + r + 0.5);
    var cz1 = Math.floor(playerZ - r + 0.5), cz2 = Math.floor(playerZ + r + 0.5);
    if (!isBlocked(cx1, cz1) && !isBlocked(cx2, cz1) && !isBlocked(cx1, cz2) && !isBlocked(cx2, cz2)) {
      playerX = newX;
    }

    cx1 = Math.floor(playerX - r + 0.5); cx2 = Math.floor(playerX + r + 0.5);
    cz1 = Math.floor(newZ - r + 0.5); cz2 = Math.floor(newZ + r + 0.5);
    if (!isBlocked(cx1, cz1) && !isBlocked(cx2, cz1) && !isBlocked(cx1, cz2) && !isBlocked(cx2, cz2)) {
      playerZ = newZ;
    }

    targetAngle = Math.atan2(dx, dz);

    for (var i = 0; i < local.parts.length; i++) {
      local.parts[i].position.y = local.baseYs[i] + Math.sin(time * 12) * 0.018;
    }
  } else {
    for (var i = 0; i < local.parts.length; i++) {
      local.parts[i].position.y += (local.baseYs[i] - local.parts[i].position.y) * 8 * dt;
    }
  }

  playerGroup.position.x += (playerX - playerGroup.position.x) * 10 * dt;
  playerGroup.position.z += (playerZ - playerGroup.position.z) * 10 * dt;

  var angleDiff = targetAngle - playerGroup.rotation.y;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  playerGroup.rotation.y += angleDiff * 10 * dt;

  // --- Remote players interpolation + nametags ---
  for (var pid in remotePlayers) {
    var rp = remotePlayers[pid];
    var rg = rp.player.group;
    var rs = rp.state;

    rg.position.x += (rs.x - rg.position.x) * 8 * dt;
    rg.position.z += (rs.z - rg.position.z) * 8 * dt;

    var rDiff = rs.ry - rg.rotation.y;
    while (rDiff > Math.PI) rDiff -= Math.PI * 2;
    while (rDiff < -Math.PI) rDiff += Math.PI * 2;
    rg.rotation.y += rDiff * 8 * dt;

    if (rs.m) {
      for (var j = 0; j < rp.player.parts.length; j++) {
        rp.player.parts[j].position.y = rp.player.baseYs[j] + Math.sin(time * 12 + 1) * 0.018;
      }
    } else {
      for (var j = 0; j < rp.player.parts.length; j++) {
        rp.player.parts[j].position.y += (rp.player.baseYs[j] - rp.player.parts[j].position.y) * 8 * dt;
      }
    }

    // Nametag projection
    if (rp.tag) {
      projV.set(rg.position.x, 1.0, rg.position.z);
      projV.project(camera);
      if (projV.z < 1) {
        rp.tag.style.display = '';
        rp.tag.style.left = ((projV.x * 0.5 + 0.5) * window.innerWidth) + 'px';
        rp.tag.style.top = ((-projV.y * 0.5 + 0.5) * window.innerHeight) + 'px';
      } else {
        rp.tag.style.display = 'none';
      }
    }
  }

  // --- Sync position (Firebase 10Hz) ---
  syncPosition(time);

  // --- Water ---
  for (var i = 0; i < waterTiles.length; i++) {
    waterTiles[i].position.y = -0.03 + Math.sin(time * 1.5 + i * 0.7) * 0.015;
  }

  // --- Camera ---
  camPosV.set(playerGroup.position.x + CAM_DX, CAM_DY, playerGroup.position.z + CAM_DZ);
  camera.position.lerp(camPosV, 5 * dt);
  camera.quaternion.copy(camQuat);

  renderer.render(scene, camera);
}

animate();
