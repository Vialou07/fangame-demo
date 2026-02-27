import * as THREE from 'three';

import { createRenderer } from './engine/renderer.js';
import { createScene } from './engine/scene.js';
import { createCamera, zoom, updateCameraZoom, setupPinchZoom, CAM_DX, CAM_DY, CAM_DZ } from './engine/camera.js';
import { setupLighting, updateShadow } from './engine/lighting.js';
import { createInput } from './engine/input.js';
import { MAP_W, MAP_H, MAP, BLDG_TYPE, MOVE_SPEED, SPRINT_MULT, isBlocked, BIOME_MAP, D as DOOR_TILE } from './data/map.js';
import { initChunks, updateChunks, allWaterTiles, allLilyPads, allLampLights } from './engine/chunks.js';
import { createPlayer, PLAYER_COLORS } from './players/factory.js';
import { remotePlayers, getOrCreateRemote, removeRemote } from './players/remote.js';
import { initFirebase } from './network/firebase.js';
import { syncPosition } from './network/sync.js';
import { saveGame, setupAutoSave } from './network/save.js';
import { showStatus, hideLobby, showLobby, hideBadge, updateBadge, setupLobbyHandlers } from './ui/lobby.js';
import { findPath } from './engine/pathfinding.js';
import { initMinimap, updateMinimap, isFullMapOpen } from './ui/minimap.js';
import { initZoneHUD, updateZoneHUD } from './ui/zonehud.js';
import { preloadAllModels } from './world/modelRegistry.js';
import { initHeightMap, getHeightSmooth } from './world/heightMap.js';
import { initParticles, updateParticles, updateFireflies } from './world/particles.js';
import { BIOME } from './data/biomes.js';
import { initShaderMaterials, shaderTime } from './world/shaders.js';
import { zoneTheme } from './ui/zonehud.js';
import { INTERIORS, isBlockedInterior, DX } from './data/interiors.js';
import { buildInterior } from './world/interiorBuilder.js';
import { initDayNight, updateDayNight, dayState, getTimeLabel, isNight, getNightFactor } from './engine/daynight.js';
import { mLampLight } from './world/materials.js';

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

// ===================== DAY/NIGHT + SHADERS + HEIGHT MAP + CHUNKS =====================
initDayNight(scene, sun);
initShaderMaterials();
initHeightMap();
initChunks(worldGroup);
updateChunks(80, 62, worldGroup); // Initial load around Bourg-Aurore spawn

// ===================== PARTICLES =====================
initParticles(scene);

// ===================== SHINY RAYQUAZA (Bourg-Aurore landmark) =====================
var rayquazaGroup = new THREE.Group();
var raySegments = []; // { mesh, baseY, phase } for animation

(function buildRayquaza() {
  var BODY_COL = 0x1A1A2A;  // Shiny = black body
  var GOLD = 0xFFD700;       // Gold markings
  var RED = 0xFF2020;        // Red eyes
  var DARK = 0x111118;       // Darker accents

  var mBody = new THREE.MeshStandardMaterial({ color: BODY_COL, roughness: 0.35, metalness: 0.4 });
  var mGold = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.25, metalness: 0.7, emissive: GOLD, emissiveIntensity: 0.3 });
  var mEye = new THREE.MeshStandardMaterial({ color: RED, emissive: RED, emissiveIntensity: 0.8, roughness: 0.1 });
  var mDark = new THREE.MeshStandardMaterial({ color: DARK, roughness: 0.3, metalness: 0.5 });
  var mGoldBright = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.15, metalness: 0.8, emissive: GOLD, emissiveIntensity: 0.5 });

  // Body: serpentine S-curve (20 segments)
  var SEG = 20;
  var bodyRadius = [];
  for (var i = 0; i < SEG; i++) {
    var t = i / (SEG - 1);
    // Thicker in middle, tapers at head and tail
    var r = 0.22 + Math.sin(t * Math.PI) * 0.18;
    if (i < 3) r *= 0.7 + i * 0.1; // tail taper
    if (i > SEG - 3) r *= 0.8;     // head slightly narrower
    bodyRadius.push(r);
  }

  for (var i = 0; i < SEG; i++) {
    var t = i / (SEG - 1);
    // S-curve path
    var sx = Math.sin(t * Math.PI * 2.5) * 1.2;
    var sz = (t - 0.5) * 6;
    var sy = Math.sin(t * Math.PI) * 0.8 + 3.5; // Arc upward

    var segGeo = new THREE.SphereGeometry(bodyRadius[i], 10, 8);
    var seg = new THREE.Mesh(segGeo, i % 4 === 0 ? mGold : mBody);
    seg.position.set(sx, sy, sz);
    seg.castShadow = true;
    rayquazaGroup.add(seg);
    raySegments.push({ mesh: seg, baseX: sx, baseY: sy, baseZ: sz, phase: t * Math.PI * 4 });

    // Gold ring every 4 segments
    if (i % 4 === 0 && i > 0 && i < SEG - 1) {
      var ringGeo = new THREE.TorusGeometry(bodyRadius[i] + 0.06, 0.04, 6, 12);
      var ring = new THREE.Mesh(ringGeo, mGoldBright);
      ring.position.set(sx, sy, sz);
      ring.rotation.x = Math.PI / 2;
      rayquazaGroup.add(ring);
    }

    // Side fins every 5 segments
    if (i % 5 === 2 && i < SEG - 2) {
      for (var side = -1; side <= 1; side += 2) {
        var finGeo = new THREE.ConeGeometry(0.15, 0.5, 4);
        var fin = new THREE.Mesh(finGeo, mGold);
        fin.position.set(sx + side * 0.4, sy, sz);
        fin.rotation.z = side * 0.8;
        fin.castShadow = true;
        rayquazaGroup.add(fin);
      }
    }
  }

  // === HEAD (last segment area) ===
  var headZ = ((SEG - 1) / (SEG - 1) - 0.5) * 6;
  var headX = Math.sin(((SEG - 1) / (SEG - 1)) * Math.PI * 2.5) * 1.2;
  var headY = 3.5 + Math.sin(Math.PI) * 0.8;

  // Snout (elongated)
  var snout = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.6), mBody);
  snout.position.set(headX, headY - 0.05, headZ + 0.5);
  snout.castShadow = true;
  rayquazaGroup.add(snout);

  // Upper jaw ridge
  var jaw = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.5), mDark);
  jaw.position.set(headX, headY + 0.1, headZ + 0.45);
  rayquazaGroup.add(jaw);

  // Eyes
  for (var side = -1; side <= 1; side += 2) {
    var eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mEye);
    eye.position.set(headX + side * 0.18, headY + 0.08, headZ + 0.25);
    rayquazaGroup.add(eye);
    // Eye glow
    var eyeGlow = new THREE.PointLight(RED, 0.5, 2, 2);
    eyeGlow.position.copy(eye.position);
    rayquazaGroup.add(eyeGlow);
  }

  // Head crest / horn (3 prongs — iconic Rayquaza)
  var hornMid = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.8, 5), mGoldBright);
  hornMid.position.set(headX, headY + 0.55, headZ + 0.1);
  hornMid.rotation.x = -0.3;
  hornMid.castShadow = true;
  rayquazaGroup.add(hornMid);

  var hornL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.6, 5), mGold);
  hornL.position.set(headX - 0.15, headY + 0.45, headZ + 0.05);
  hornL.rotation.x = -0.2; hornL.rotation.z = 0.3;
  rayquazaGroup.add(hornL);

  var hornR = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.6, 5), mGold);
  hornR.position.set(headX + 0.15, headY + 0.45, headZ + 0.05);
  hornR.rotation.x = -0.2; hornR.rotation.z = -0.3;
  rayquazaGroup.add(hornR);

  // === TAIL (first segment area) ===
  var tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 6), mGold);
  var tailZ = -0.5 * 6;
  var tailX = Math.sin(0) * 1.2;
  tailTip.position.set(tailX, 3.5, tailZ - 0.3);
  tailTip.rotation.x = Math.PI / 2;
  tailTip.castShadow = true;
  rayquazaGroup.add(tailTip);

  // Tail fins
  for (var side = -1; side <= 1; side += 2) {
    var tf = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.4), mGold);
    tf.position.set(tailX + side * 0.15, 3.5, tailZ - 0.15);
    tf.rotation.z = side * 0.4;
    rayquazaGroup.add(tf);
  }

  // Belly line (gold stripe along underside)
  for (var i = 2; i < SEG - 2; i += 2) {
    var t = i / (SEG - 1);
    var bx = Math.sin(t * Math.PI * 2.5) * 1.2;
    var bz = (t - 0.5) * 6;
    var by = Math.sin(t * Math.PI) * 0.8 + 3.5 - bodyRadius[i] * 0.7;
    var belly = new THREE.Mesh(new THREE.SphereGeometry(bodyRadius[i] * 0.5, 6, 4), mGold);
    belly.position.set(bx, by, bz);
    belly.scale.set(0.6, 0.4, 1);
    rayquazaGroup.add(belly);
  }

  // Position at Bourg-Aurore center (80, 60)
  rayquazaGroup.position.set(80, 0, 60);
  scene.add(rayquazaGroup);

  // Ambient glow light for drama
  var glow = new THREE.PointLight(GOLD, 1.5, 12, 1.5);
  glow.position.set(0, 4, 0);
  rayquazaGroup.add(glow);
})();

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
  // Disable click-to-move inside interiors (pathfinding uses exterior map)
  if (interiorState.active) return;
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
  if (isFullMapOpen()) return;
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
var playerX = 80, playerZ = 62;
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

// ===================== TELEPORT + MINIMAP =====================
var SAFE_SPAWN = { x: 80, z: 62 }; // Bourg-Aurore center

// Check if a position is safe for the player (all 4 hitbox corners unblocked)
function isSafeSpot(tx, tz) {
  var cx = tx + 0.5;
  var cz = tz + 0.5;
  var r = 0.25; // slightly larger than player radius (0.22) for safety
  var x1 = Math.floor(cx - r + 0.5), x2 = Math.floor(cx + r + 0.5);
  var z1 = Math.floor(cz - r + 0.5), z2 = Math.floor(cz + r + 0.5);
  return !isBlocked(x1, z1) && !isBlocked(x2, z1) && !isBlocked(x1, z2) && !isBlocked(x2, z2);
}

function teleportTo(x, z) {
  // Find nearest safe tile (checks all hitbox corners, not just center)
  if (!isSafeSpot(x, z)) {
    var found = false;
    for (var r = 1; r < 15 && !found; r++) {
      for (var dz = -r; dz <= r && !found; dz++) {
        for (var dx = -r; dx <= r && !found; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          if (isSafeSpot(x + dx, z + dz)) {
            x = x + dx;
            z = z + dz;
            found = true;
          }
        }
      }
    }
  }
  playerX = x + 0.5;
  playerZ = z + 0.5;
  state.playerX = playerX;
  state.playerZ = playerZ;
  var py = getHeightSmooth(playerX, playerZ);
  playerGroup.position.set(playerX, py, playerZ);
  pathQueue = [];
  pathMarker.visible = false;
  updateChunks(playerX, playerZ, worldGroup);
}

// SOS button
document.getElementById('sos-btn').addEventListener('click', function() {
  if (interiorState.active) {
    exitBuilding();
    return;
  }
  teleportTo(SAFE_SPAWN.x, SAFE_SPAWN.z);
});

// Init minimap with teleport callback
initMinimap(function(tileX, tileZ) {
  teleportTo(tileX, tileZ);
});

// Init zone name HUD
initZoneHUD();

// ===================== INTERIOR STATE =====================
var interiorState = {
  active: false,
  buildingType: 0,
  interiorGroup: null,
  interiorDef: null,
  savedX: 0,
  savedZ: 0,
  savedAngle: 0,
  nearDoor: false
};

var enterPrompt = document.getElementById('enter-prompt');
var interiorNameEl = document.getElementById('interior-name');

// Check if player is near a door tile (exterior)
function isNearDoor(px, pz) {
  var tx = Math.floor(px);
  var tz = Math.floor(pz);
  // Check current tile and surrounding tiles
  for (var dz = -1; dz <= 1; dz++) {
    for (var dx = -1; dx <= 1; dx++) {
      var cx = tx + dx;
      var cz = tz + dz;
      if (cx < 0 || cz < 0 || cx >= MAP_W || cz >= MAP_H) continue;
      if (MAP[cz][cx] === DOOR_TILE) {
        // Must be close enough
        var dist = Math.sqrt((px - cx) * (px - cx) + (pz - cz) * (pz - cz));
        if (dist < 1.2) {
          var bt = BLDG_TYPE[cz] ? BLDG_TYPE[cz][cx] : 0;
          if (bt > 0 && INTERIORS[bt]) return bt;
        }
      }
    }
  }
  return 0;
}

function enterBuilding(buildingType) {
  var def = INTERIORS[buildingType];
  if (!def || interiorState.active) return;

  interiorState.active = true;
  interiorState.buildingType = buildingType;
  interiorState.interiorDef = def;
  interiorState.savedX = playerX;
  interiorState.savedZ = playerZ;
  interiorState.savedAngle = targetAngle;

  // Screen fade to black
  var fadeEl = document.getElementById('zone-fade');
  if (fadeEl) fadeEl.classList.add('active');

  setTimeout(function() {
    // Hide exterior world
    worldGroup.visible = false;

    // Build interior
    var intGroup = buildInterior(def);
    interiorState.interiorGroup = intGroup;
    scene.add(intGroup);

    // Place player at interior spawn
    playerX = def.spawnX + 0.5;
    playerZ = def.spawnZ + 0.5;
    state.playerX = playerX;
    state.playerZ = playerZ;
    playerGroup.position.set(playerX, 0, playerZ);
    targetAngle = 0; // Face north

    // Update camera instantly
    camera.position.set(playerX + CAM_DX, CAM_DY, playerZ + CAM_DZ);

    // Clear path
    pathQueue = [];
    pathMarker.visible = false;

    // Show interior name
    if (interiorNameEl) {
      interiorNameEl.textContent = def.name;
      interiorNameEl.classList.add('visible');
    }

    // Hide enter prompt
    if (enterPrompt) enterPrompt.classList.remove('visible');

    // Fade back in
    setTimeout(function() {
      if (fadeEl) fadeEl.classList.remove('active');
    }, 100);
  }, 200);
}

function exitBuilding() {
  if (!interiorState.active) return;

  var fadeEl = document.getElementById('zone-fade');
  if (fadeEl) fadeEl.classList.add('active');

  setTimeout(function() {
    // Remove interior
    if (interiorState.interiorGroup) {
      scene.remove(interiorState.interiorGroup);
      // Dispose interior meshes
      interiorState.interiorGroup.traverse(function(child) {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material && child.material.dispose) child.material.dispose();
        }
      });
      interiorState.interiorGroup = null;
    }

    // Show exterior world
    worldGroup.visible = true;

    // Restore player position (slightly south of door)
    playerX = interiorState.savedX;
    playerZ = interiorState.savedZ + 1.0; // Step south from door
    state.playerX = playerX;
    state.playerZ = playerZ;
    targetAngle = Math.PI; // Face south

    var py = getHeightSmooth(playerX, playerZ);
    playerGroup.position.set(playerX, py, playerZ);

    // Update camera instantly
    camera.position.set(playerX + CAM_DX, CAM_DY + py, playerZ + CAM_DZ);

    // Force chunk reload
    updateChunks(playerX, playerZ, worldGroup);

    // Hide interior name
    if (interiorNameEl) interiorNameEl.classList.remove('visible');

    interiorState.active = false;
    interiorState.interiorDef = null;
    interiorState.buildingType = 0;

    // Fade back in
    setTimeout(function() {
      if (fadeEl) fadeEl.classList.remove('active');
    }, 100);
  }, 200);
}

// Check if standing on exit tile inside an interior
function isOnExitTile(px, pz) {
  if (!interiorState.interiorDef) return false;
  var def = interiorState.interiorDef;
  var tx = Math.floor(px);
  var tz = Math.floor(pz);
  if (tx < 0 || tz < 0 || tx >= def.width || tz >= def.height) return false;
  return def.layout[tz][tx] === DX;
}

// Collision check wrapper: uses interior or exterior depending on state
function checkBlocked(nx, nz) {
  if (interiorState.active && interiorState.interiorDef) {
    return isBlockedInterior(interiorState.interiorDef, nx, nz);
  }
  return isBlocked(nx, nz);
}

// E key listener for entering buildings
window.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT') return;
  if ((e.key === 'e' || e.key === 'E') && !interiorState.active && interiorState.nearDoor) {
    enterBuilding(interiorState.nearDoor);
  }
});

// N key: cycle day/night speed (1x → 10x → 50x → pause → 1x)
window.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'n' || e.key === 'N') {
    if (dayState.paused) {
      dayState.paused = false;
      dayState.speed = 1;
    } else if (dayState.speed === 1) {
      dayState.speed = 10;
    } else if (dayState.speed === 10) {
      dayState.speed = 50;
    } else {
      dayState.paused = true;
    }
  }
});

// Open full map with M key
window.addEventListener('keydown', function(e) {
  if (e.key === 'm' || e.key === 'M') {
    // Don't trigger while typing in inputs
    if (e.target.tagName === 'INPUT') return;
  }
});

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
      // Verify saved position is safe; teleport to nearest safe spot if stuck
      var tx = Math.floor(playerX);
      var tz = Math.floor(playerZ);
      if (!isSafeSpot(tx, tz)) {
        teleportTo(tx, tz);
      } else {
        state.playerX = playerX;
        state.playerZ = playerZ;
      }
      playerGroup.position.set(playerX, getHeightSmooth(playerX, playerZ), playerZ);
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
  playerX = 80; playerZ = 62;
  state.playerX = playerX;
  state.playerZ = playerZ;
  playerGroup.position.set(playerX, getHeightSmooth(playerX, playerZ), playerZ);
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
var _blendCol1 = new THREE.Color();
var _blendCol2 = new THREE.Color();

// Time display element
var _timeEl = document.getElementById('time-display');

camera.position.set(playerX + CAM_DX, CAM_DY, playerZ + CAM_DZ);
camera.lookAt(playerX, 0, playerZ);
var camQuat = camera.quaternion.clone();

function animate() {
  requestAnimationFrame(animate);
  var dt = Math.min(clock.getDelta(), 0.05);
  var time = clock.elapsedTime;

  // --- Local movement ---
  var dx = 0, dz = 0;
  if (!isFullMapOpen()) {
    if (keys['ArrowLeft'] || keys['KeyA']) dx = -1;
    if (keys['ArrowRight'] || keys['KeyD']) dx = 1;
    if (keys['ArrowUp'] || keys['KeyW']) dz = -1;
    if (keys['ArrowDown'] || keys['KeyS']) dz = 1;
  }

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
  var sprinting = moving && (keys['ShiftLeft'] || keys['ShiftRight']);
  state.localMoving = moving;
  if (moving) {
    var len = Math.sqrt(dx * dx + dz * dz);
    dx /= len; dz /= len;

    var speed = sprinting ? MOVE_SPEED * SPRINT_MULT : MOVE_SPEED;
    var newX = playerX + dx * speed * dt;
    var newZ = playerZ + dz * speed * dt;
    var r = 0.22;

    var cx1 = Math.floor(newX - r + 0.5), cx2 = Math.floor(newX + r + 0.5);
    var cz1 = Math.floor(playerZ - r + 0.5), cz2 = Math.floor(playerZ + r + 0.5);
    if (!checkBlocked(cx1, cz1) && !checkBlocked(cx2, cz1) && !checkBlocked(cx1, cz2) && !checkBlocked(cx2, cz2)) {
      playerX = newX;
    }

    cx1 = Math.floor(playerX - r + 0.5); cx2 = Math.floor(playerX + r + 0.5);
    cz1 = Math.floor(newZ - r + 0.5); cz2 = Math.floor(newZ + r + 0.5);
    if (!checkBlocked(cx1, cz1) && !checkBlocked(cx2, cz1) && !checkBlocked(cx1, cz2) && !checkBlocked(cx2, cz2)) {
      playerZ = newZ;
    }

    targetAngle = Math.atan2(dx, dz);

    var bobFreq = sprinting ? 18 : 12;
    var bobAmp = sprinting ? 0.024 : 0.018;
    for (var i = 0; i < local.parts.length; i++) {
      local.parts[i].position.y = local.baseYs[i] + Math.sin(time * bobFreq) * bobAmp;
    }

    // Limb walk/run animation
    if (local.limbs) {
      var walkFreq = sprinting ? 16 : 10;
      var walkAmp = sprinting ? 0.7 : 0.5;
      var phase = time * walkFreq;
      local.limbs.legL.rotation.x = Math.sin(phase) * walkAmp;
      local.limbs.legR.rotation.x = -Math.sin(phase) * walkAmp;
      local.limbs.armL.rotation.x = -Math.sin(phase) * walkAmp * 0.7;
      local.limbs.armR.rotation.x = Math.sin(phase) * walkAmp * 0.7;
    }
  } else {
    for (var i = 0; i < local.parts.length; i++) {
      local.parts[i].position.y += (local.baseYs[i] - local.parts[i].position.y) * 8 * dt;
    }

    // Return limbs to neutral
    if (local.limbs) {
      local.limbs.legL.rotation.x += (0 - local.limbs.legL.rotation.x) * 8 * dt;
      local.limbs.legR.rotation.x += (0 - local.limbs.legR.rotation.x) * 8 * dt;
      local.limbs.armL.rotation.x += (0 - local.limbs.armL.rotation.x) * 8 * dt;
      local.limbs.armR.rotation.x += (0 - local.limbs.armR.rotation.x) * 8 * dt;
    }
  }

  // Pulse the path marker
  if (pathMarker.visible) {
    pathMarker.material.opacity = 0.4 + Math.sin(time * 4) * 0.3;
    pathMarker.scale.setScalar(0.9 + Math.sin(time * 4) * 0.15);
  }

  state.playerX = playerX;
  state.playerZ = playerZ;

  // --- Rayquaza serpentine animation ---
  if (rayquazaGroup.visible) {
    // Slow rotation
    rayquazaGroup.rotation.y += dt * 0.15;
    // Floating bob
    rayquazaGroup.position.y = Math.sin(time * 0.5) * 0.3;
    // Undulate body segments
    for (var ri = 0; ri < raySegments.length; ri++) {
      var rs = raySegments[ri];
      rs.mesh.position.y = rs.baseY + Math.sin(time * 1.8 + rs.phase) * 0.15;
      rs.mesh.position.x = rs.baseX + Math.sin(time * 1.2 + rs.phase * 0.7) * 0.08;
    }
  }

  // Interior: flat floor Y=0; Exterior: height map
  var targetY = interiorState.active ? 0 : getHeightSmooth(playerX, playerZ);
  playerGroup.position.x += (playerX - playerGroup.position.x) * 10 * dt;
  playerGroup.position.y += (targetY - playerGroup.position.y) * 8 * dt;
  playerGroup.position.z += (playerZ - playerGroup.position.z) * 10 * dt;

  var angleDiff = targetAngle - playerGroup.rotation.y;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  playerGroup.rotation.y += angleDiff * 10 * dt;

  // --- Door proximity / exit detection ---
  if (interiorState.active) {
    // Check if player is on exit tile
    if (isOnExitTile(playerX, playerZ) && moving && dz > 0) {
      exitBuilding();
    }
  } else {
    // Check if near a door in the exterior
    var nearBt = isNearDoor(playerX, playerZ);
    interiorState.nearDoor = nearBt;
    if (enterPrompt) {
      if (nearBt > 0) {
        enterPrompt.classList.add('visible');
      } else {
        enterPrompt.classList.remove('visible');
      }
    }
  }

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
      // Remote limb animation
      if (rp.player.limbs) {
        var rPhase = time * 10 + 1;
        rp.player.limbs.legL.rotation.x = Math.sin(rPhase) * 0.5;
        rp.player.limbs.legR.rotation.x = -Math.sin(rPhase) * 0.5;
        rp.player.limbs.armL.rotation.x = -Math.sin(rPhase) * 0.35;
        rp.player.limbs.armR.rotation.x = Math.sin(rPhase) * 0.35;
      }
    } else {
      for (var j = 0; j < rp.player.parts.length; j++) {
        rp.player.parts[j].position.y += (rp.player.baseYs[j] - rp.player.parts[j].position.y) * 8 * dt;
      }
      // Return remote limbs to neutral
      if (rp.player.limbs) {
        rp.player.limbs.legL.rotation.x += (0 - rp.player.limbs.legL.rotation.x) * 8 * dt;
        rp.player.limbs.legR.rotation.x += (0 - rp.player.limbs.legR.rotation.x) * 8 * dt;
        rp.player.limbs.armL.rotation.x += (0 - rp.player.limbs.armL.rotation.x) * 8 * dt;
        rp.player.limbs.armR.rotation.x += (0 - rp.player.limbs.armR.rotation.x) * 8 * dt;
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

  // Exterior-only updates (skip when inside a building)
  if (!interiorState.active) {
    // Update chunks around player
    updateChunks(playerX, playerZ, worldGroup);

    for (var i = 0; i < allWaterTiles.length; i++) {
      allWaterTiles[i].position.y = -0.03 + Math.sin(time * 1.5 + i * 0.7) * 0.015;
    }
    for (var j = 0; j < allLilyPads.length; j++) {
      allLilyPads[j].position.y += Math.sin(time * 1.2 + j * 1.3) * 0.0003;
    }

    // Day/night cycle (updates sun position, light colors, intensities)
    updateDayNight(dt, playerX, playerZ);

    // Lamppost night glow — only nearest 6 PointLights active for performance
    var nf = getNightFactor();
    var MAX_ACTIVE_LIGHTS = 6;
    if (nf > 0.01) {
      // Calculate distances, disable all first, then enable closest
      for (var li = 0; li < allLampLights.length; li++) {
        var ll = allLampLights[li];
        ll._dist = (ll._worldX - playerX) * (ll._worldX - playerX) + (ll._worldZ - playerZ) * (ll._worldZ - playerZ);
        ll.intensity = 0;
        // Light pool always shows on all lamps (cheap visual)
        if (ll._poolMat) ll._poolMat.opacity = nf * 0.12;
      }
      // Find nearest N and activate them
      var sorted = allLampLights.slice().sort(function(a, b) { return a._dist - b._dist; });
      var count = Math.min(MAX_ACTIVE_LIGHTS, sorted.length);
      for (var si = 0; si < count; si++) {
        sorted[si].intensity = nf * 2.5;
      }
    } else {
      // Daytime: all lights off
      for (var li = 0; li < allLampLights.length; li++) {
        allLampLights[li].intensity = 0;
        if (allLampLights[li]._poolMat) allLampLights[li]._poolMat.opacity = 0;
      }
    }
    // Globe emissive glow: brighter at night (applies to ALL lamp globes, no GPU cost)
    mLampLight.emissiveIntensity = 0.3 + nf * 1.5;

    // Fireflies at night
    updateFireflies(dt, playerX, playerZ, nf, time);

    // Update minimap + zone HUD
    updateMinimap(playerX, playerZ, remotePlayers);
    updateZoneHUD(playerX, playerZ);

    // Leaf/dust particles
    updateParticles(dt, playerX, playerZ);

    // Update shader time uniform (drives water + lava animation)
    shaderTime.value = time;

    // Blend zone theme with day/night sky/fog colors
    if (scene.fog) {
      scene.fog.density += (zoneTheme.fogDensity - scene.fog.density) * 2 * dt;
      // Blend zone fog color with day/night tint
      var dayFogHex = dayState._fogColor || 0x8ED8F8;
      var zoneFogHex = zoneTheme.fogColor;
      _blendCol1.setHex(zoneFogHex);
      _blendCol2.setHex(dayFogHex);
      _blendCol1.multiply(_blendCol2).multiplyScalar(1.3); // Blend = zone * daynight, brightened
      _blendCol1.r = Math.min(_blendCol1.r, 1);
      _blendCol1.g = Math.min(_blendCol1.g, 1);
      _blendCol1.b = Math.min(_blendCol1.b, 1);
      scene.fog.color.lerp(_blendCol1, 2 * dt);

      var daySkyHex = dayState._skyColor || 0x8ED8F8;
      var zoneSkyHex = zoneTheme.skyColor;
      _blendCol1.setHex(zoneSkyHex);
      _blendCol2.setHex(daySkyHex);
      _blendCol1.multiply(_blendCol2).multiplyScalar(1.3);
      _blendCol1.r = Math.min(_blendCol1.r, 1);
      _blendCol1.g = Math.min(_blendCol1.g, 1);
      _blendCol1.b = Math.min(_blendCol1.b, 1);
      scene.background.lerp(_blendCol1, 2 * dt);
    }

    // Update time display
    if (_timeEl) _timeEl.textContent = getTimeLabel();
  } else {
    // Interior: disable fog for clean indoor look
    if (scene.fog) {
      scene.fog.density += (0 - scene.fog.density) * 4 * dt;
    }
  }

  // Update camera zoom (for pinch/wheel changes)
  updateCameraZoom(camera);

  camPosV.set(playerGroup.position.x + CAM_DX, CAM_DY + playerGroup.position.y, playerGroup.position.z + CAM_DZ);
  camera.position.lerp(camPosV, 5 * dt);
  camera.quaternion.copy(camQuat);

  renderer.render(scene, camera);
}

// Preload 3D models, then start the game loop
preloadAllModels().then(function() {
  console.log('Models preloaded');
  animate();
}).catch(function() {
  console.warn('Model preload failed, starting with fallback geometry');
  animate();
});
