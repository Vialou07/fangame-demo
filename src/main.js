import * as THREE from 'three';

import { createRenderer } from './engine/renderer.js';
import { createScene } from './engine/scene.js';
import { createCamera, zoom, updateCameraZoom, setupPinchZoom, CAM_DX, CAM_DY, CAM_DZ } from './engine/camera.js';
import { setupLighting, updateShadow } from './engine/lighting.js';
import { createInput } from './engine/input.js';
import { MAP_W, MAP_H, MOVE_SPEED, isBlocked } from './data/map.js';
import { initChunks, updateChunks, allWaterTiles, allLilyPads } from './engine/chunks.js';
import { createPlayer, PLAYER_COLORS } from './players/factory.js';
import { remotePlayers, getOrCreateRemote, removeRemote } from './players/remote.js';
import { initFirebase } from './network/firebase.js';
import { syncPosition } from './network/sync.js';
import { saveGame, setupAutoSave } from './network/save.js';
import { showStatus, hideLobby, showLobby, hideBadge, updateBadge, setupLobbyHandlers } from './ui/lobby.js';
import { findPath } from './engine/pathfinding.js';

// Show info text only on desktop
var infoEl = document.getElementById('info');
if (window.innerWidth > 768) infoEl.style.display = '';
else infoEl.remove();

// ===================== ENGINE SETUP =====================
var renderer = createRenderer();
var { scene, worldGroup } = createScene();
var camera = createCamera();
var aspect = window.innerWidth / window.innerHeight;
var { sun } = setupLighting(scene);
var keys = createInput();
setupPinchZoom(renderer.domElement);

// ===================== CHUNK SYSTEM =====================
initChunks(worldGroup);
updateChunks(20, 15, worldGroup); // Initial load around spawn

// ===================== CLICK-TO-MOVE =====================
var raycaster = new THREE.Raycaster();
var mouseVec = new THREE.Vector2();
var groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
var clickTarget = new THREE.Vector3();
var pathQueue = []; // Array of {x, z} tile centers
var pathMarker = null;

// Destination marker (pulsing ring)
(function() {
  var ringGeo = new THREE.RingGeometry(0.15, 0.25, 16);
  ringGeo.rotateX(-Math.PI / 2);
  var ringMat = new THREE.MeshBasicMaterial({ color: 0xFFFF60, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  pathMarker = new THREE.Mesh(ringGeo, ringMat);
  pathMarker.visible = false;
  pathMarker.position.y = 0.08;
  scene.add(pathMarker);
})();

function handleClickToMove(clientX, clientY) {
  mouseVec.x = (clientX / window.innerWidth) * 2 - 1;
  mouseVec.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouseVec, camera);
  if (raycaster.ray.intersectPlane(groundPlane, clickTarget)) {
    var path = findPath(playerX, playerZ, clickTarget.x, clickTarget.z);
    if (path.length > 0) {
      pathQueue = path;
      var last = path[path.length - 1];
      pathMarker.position.x = last.x;
      pathMarker.position.z = last.z;
      pathMarker.visible = true;
    }
  }
}

// Mouse click (desktop)
renderer.domElement.addEventListener('click', function(e) {
  handleClickToMove(e.clientX, e.clientY);
});

// Tap (mobile) - track touch to distinguish tap from pinch/drag
var touchState = { startX: 0, startY: 0, startTime: 0, wasPinch: false };

renderer.domElement.addEventListener('touchstart', function(e) {
  if (e.touches.length >= 2) {
    touchState.wasPinch = true;
    return;
  }
  touchState.wasPinch = false;
  touchState.startX = e.touches[0].clientX;
  touchState.startY = e.touches[0].clientY;
  touchState.startTime = Date.now();
}, { passive: true });

renderer.domElement.addEventListener('touchend', function(e) {
  if (touchState.wasPinch || e.touches.length > 0) {
    // Was a pinch or fingers still down — don't trigger
    if (e.touches.length === 0) touchState.wasPinch = false;
    return;
  }
  var t = e.changedTouches[0];
  var dx = t.clientX - touchState.startX;
  var dy = t.clientY - touchState.startY;
  var dist = Math.sqrt(dx * dx + dy * dy);
  var elapsed = Date.now() - touchState.startTime;

  // Only trigger on quick, stationary tap (< 300ms, < 15px movement)
  if (elapsed > 300 || dist > 15) return;

  // Ignore taps on the joystick area (bottom-left)
  if (t.clientX < 180 && t.clientY > window.innerHeight - 180) return;

  handleClickToMove(t.clientX, t.clientY);
}, { passive: true });

// ===================== LOCAL PLAYER =====================
var local = createPlayer(0xE04040, 0xE04040);
var playerGroup = local.group;
var playerX = 20, playerZ = 15;
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
  playerX = 20; playerZ = 15;
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
  updateCameraZoom(camera);
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

  var manualInput = dx !== 0 || dz !== 0;

  // Cancel pathfinding on manual input
  if (manualInput && pathQueue.length > 0) {
    pathQueue = [];
    pathMarker.visible = false;
  }

  // Path following (when no manual input and path exists)
  if (!manualInput && pathQueue.length > 0) {
    var wp = pathQueue[0];
    var toDx = wp.x - playerX;
    var toDz = wp.z - playerZ;
    var toDist = Math.sqrt(toDx * toDx + toDz * toDz);

    if (toDist < 0.1) {
      pathQueue.shift();
      if (pathQueue.length === 0) {
        pathMarker.visible = false;
      }
    } else {
      dx = toDx / toDist;
      dz = toDz / toDist;
    }
  }

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

  // Pulse the path marker
  if (pathMarker.visible) {
    pathMarker.material.opacity = 0.4 + Math.sin(time * 4) * 0.3;
    pathMarker.scale.setScalar(0.9 + Math.sin(time * 4) * 0.15);
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

  // Update chunks around player
  updateChunks(playerX, playerZ, worldGroup);

  for (var i = 0; i < allWaterTiles.length; i++) {
    allWaterTiles[i].position.y = -0.03 + Math.sin(time * 1.5 + i * 0.7) * 0.015;
  }
  for (var j = 0; j < allLilyPads.length; j++) {
    allLilyPads[j].position.y += Math.sin(time * 1.2 + j * 1.3) * 0.0003;
  }

  // Update shadow camera to follow player
  updateShadow(sun, playerX, playerZ);

  // Update camera zoom (for pinch/wheel changes)
  updateCameraZoom(camera);

  camPosV.set(playerGroup.position.x + CAM_DX, CAM_DY, playerGroup.position.z + CAM_DZ);
  camera.position.lerp(camPosV, 5 * dt);
  camera.quaternion.copy(camQuat);

  renderer.render(scene, camera);
}

animate();
