import * as THREE from 'three';

import { createRenderer } from './engine/renderer.js';
import { createScene } from './engine/scene.js';
import { createCamera, VIEW_SIZE, CAM_DX, CAM_DY, CAM_DZ } from './engine/camera.js';
import { setupLighting } from './engine/lighting.js';
import { createInput } from './engine/input.js';
import { MAP_W, MAP_H, MOVE_SPEED, isBlocked } from './data/map.js';
import { buildWorld } from './world/builder.js';
import { createPlayer, PLAYER_COLORS } from './players/factory.js';
import { remotePlayers, getOrCreateRemote, removeRemote } from './players/remote.js';
import { initFirebase } from './network/firebase.js';
import { syncPosition } from './network/sync.js';
import { saveGame, setupAutoSave } from './network/save.js';
import { showStatus, hideLobby, showLobby, hideBadge, updateBadge, setupLobbyHandlers } from './ui/lobby.js';

document.getElementById('info').style.display = '';

// ===================== ENGINE SETUP =====================
var renderer = createRenderer();
var { scene, worldGroup } = createScene();
var camera = createCamera();
var aspect = window.innerWidth / window.innerHeight;
setupLighting(scene, MAP_W, MAP_H);
var keys = createInput();

// ===================== BUILD WORLD =====================
var { waterTiles } = buildWorld(worldGroup);

// ===================== LOCAL PLAYER =====================
var local = createPlayer(0xE04040, 0xE04040);
var playerGroup = local.group;
var playerX = 6, playerZ = 6;
playerGroup.position.set(playerX, 0, playerZ);
scene.add(playerGroup);

// ===================== FIREBASE =====================
var { fb, auth, db } = initFirebase();

// ===================== SHARED STATE =====================
var state = {
  myUid: null,
  myName: '',
  myColor: 0,
  isOnline: false,
  presenceRef: null,
  enteringWorld: false,
  localMoving: false,
  playerX: playerX,
  playerZ: playerZ,
  playerGroup: playerGroup,
  fb: fb,
  db: db,
  PLAYER_COLORS: PLAYER_COLORS
};

// ===================== AUTH =====================
var targetAngle = 0;

async function enterWorld(uid, displayName, colorIndex) {
  state.myUid = uid;
  state.myName = displayName;
  state.myColor = colorIndex;

  var c = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  local.parts[0].material.color.setHex(c);
  local.parts[3].material.color.setHex(c);
  local.parts[4].material.color.setHex(c);

  try {
    var snap = await db.ref('users/' + uid + '/gameState').once('value');
    var gameState = snap.val();
    if (gameState && gameState.position) {
      playerX = gameState.position.x;
      playerZ = gameState.position.z;
      state.playerX = playerX;
      state.playerZ = playerZ;
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

async function logout() {
  goOffline();
  state.myUid = null;
  state.myName = '';
  state.isOnline = false;
  try { await auth.signOut(); } catch (e) {}
  showLobby();
  hideBadge();
  playerX = 6; playerZ = 6;
  state.playerX = playerX;
  state.playerZ = playerZ;
  playerGroup.position.set(playerX, 0, playerZ);
  showStatus('', false);
}

// ===================== PRESENCE =====================
function goOnline() {
  if (state.isOnline || !state.myUid) return;
  state.isOnline = true;

  state.presenceRef = db.ref('presence/' + state.myUid);
  state.presenceRef.set({
    x: Math.round(playerX * 100) / 100,
    z: Math.round(playerZ * 100) / 100,
    ry: Math.round(playerGroup.rotation.y * 100) / 100,
    m: false,
    c: state.myColor,
    name: state.myName,
    lastSeen: fb.database.ServerValue.TIMESTAMP
  });
  state.presenceRef.onDisconnect().remove();

  db.ref('.info/connected').on('value', function(snap) {
    if (snap.val() === true && state.myUid && state.presenceRef) {
      state.presenceRef.onDisconnect().remove();
    }
  });

  var allPresence = db.ref('presence');

  allPresence.on('child_added', function(snap) {
    if (snap.key === state.myUid) return;
    var d = snap.val();
    var rp = getOrCreateRemote(scene, snap.key, d.c);
    rp.state.x = d.x; rp.state.z = d.z; rp.state.ry = d.ry; rp.state.m = d.m;
    rp.name = d.name || '???';
    if (rp.tag) rp.tag.textContent = rp.name;
    updateBadge(state, remotePlayers, logout);
  });

  allPresence.on('child_changed', function(snap) {
    if (snap.key === state.myUid) return;
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
    if (snap.key === state.myUid) return;
    removeRemote(scene, snap.key);
    updateBadge(state, remotePlayers, logout);
  });

  updateBadge(state, remotePlayers, logout);
}

function goOffline() {
  if (!state.isOnline || !state.myUid) return;
  state.isOnline = false;
  saveGame(state);
  if (state.presenceRef) { try { state.presenceRef.remove(); } catch (e) {} }
  db.ref('presence').off();
  db.ref('.info/connected').off();
  for (var pid in remotePlayers) removeRemote(scene, pid);
}

// ===================== UI + AUTO-SAVE =====================
setupLobbyHandlers(auth, db, state, enterWorld);
setupAutoSave(state, goOffline);

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
  state.localMoving = moving;
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

  state.playerX = playerX;
  state.playerZ = playerZ;

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

  syncPosition(time, state);

  for (var i = 0; i < waterTiles.length; i++) {
    waterTiles[i].position.y = -0.03 + Math.sin(time * 1.5 + i * 0.7) * 0.015;
  }

  camPosV.set(playerGroup.position.x + CAM_DX, CAM_DY, playerGroup.position.z + CAM_DZ);
  camera.position.lerp(camPosV, 5 * dt);
  camera.quaternion.copy(camQuat);

  renderer.render(scene, camera);
}

animate();
