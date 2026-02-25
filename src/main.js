import * as THREE from 'three';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';

import { createRenderer } from './engine/renderer.js';
import { createScene } from './engine/scene.js';
import { createCamera, VIEW_SIZE, CAM_DX, CAM_DY, CAM_DZ } from './engine/camera.js';
import { setupLighting } from './engine/lighting.js';
import { createInput } from './engine/input.js';
import { MAP_W, MAP_H, MOVE_SPEED, isBlocked } from './data/map.js';
import { buildWorld } from './world/builder.js';
import { createPlayer, PLAYER_COLORS } from './players/factory.js';
import { remotePlayers, getOrCreateRemote, removeRemote } from './players/remote.js';

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
    var rp = getOrCreateRemote(scene, snap.key, d.c);
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
    removeRemote(scene, snap.key);
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
  for (var pid in remotePlayers) removeRemote(scene, pid);
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
