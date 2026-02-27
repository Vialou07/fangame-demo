import * as THREE from 'three';

// ===================== LEAF PARTICLES =====================
var particles = null;
var positions = null;
var velocities = [];
var COUNT = 60;

export function initParticles(scene) {
  var geo = new THREE.BufferGeometry();
  positions = new Float32Array(COUNT * 3);

  for (var i = 0; i < COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = 0.5 + Math.random() * 3;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    velocities.push({
      x: (Math.random() - 0.3) * 0.5,
      y: Math.sin(Math.random() * Math.PI) * 0.2 - 0.05,
      z: (Math.random() - 0.5) * 0.3
    });
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  var mat = new THREE.PointsMaterial({
    color: 0x80C060,
    size: 0.08,
    transparent: true,
    opacity: 0.6,
    depthWrite: false
  });

  particles = new THREE.Points(geo, mat);
  scene.add(particles);

  // Also initialize fireflies
  initFireflies(scene);

  return particles;
}

export function updateParticles(dt, playerX, playerZ) {
  if (!particles) return;

  for (var i = 0; i < COUNT; i++) {
    var ix = i * 3;
    positions[ix]     += velocities[i].x * dt;
    positions[ix + 1] += velocities[i].y * dt;
    positions[ix + 2] += velocities[i].z * dt;

    // Re-center around player when particle drifts too far
    var dx = positions[ix] - playerX;
    var dz = positions[ix + 2] - playerZ;
    if (dx * dx + dz * dz > 200) {
      positions[ix]     = playerX + (Math.random() - 0.5) * 16;
      positions[ix + 1] = 0.5 + Math.random() * 3;
      positions[ix + 2] = playerZ + (Math.random() - 0.5) * 16;
    }

    // Keep above ground
    if (positions[ix + 1] < 0.2) {
      positions[ix + 1] = 0.5 + Math.random() * 2;
      velocities[i].y = Math.abs(velocities[i].y);
    }
    if (positions[ix + 1] > 4) {
      velocities[i].y = -Math.abs(velocities[i].y);
    }
  }

  particles.geometry.attributes.position.needsUpdate = true;
}

// ===================== FIREFLIES =====================
var fireflies = null;
var ffPositions = null;
var ffPhases = [];   // per-firefly phase offset for glow pulsing
var ffVels = [];     // velocity vectors
var FF_COUNT = 80;
var ffMat = null;

function initFireflies(scene) {
  var geo = new THREE.BufferGeometry();
  ffPositions = new Float32Array(FF_COUNT * 3);

  for (var i = 0; i < FF_COUNT; i++) {
    ffPositions[i * 3]     = (Math.random() - 0.5) * 18;
    ffPositions[i * 3 + 1] = 0.3 + Math.random() * 1.5;
    ffPositions[i * 3 + 2] = (Math.random() - 0.5) * 18;
    ffPhases.push(Math.random() * Math.PI * 2);
    ffVels.push({
      x: (Math.random() - 0.5) * 0.4,
      y: (Math.random() - 0.5) * 0.15,
      z: (Math.random() - 0.5) * 0.4
    });
  }

  geo.setAttribute('position', new THREE.BufferAttribute(ffPositions, 3));

  ffMat = new THREE.PointsMaterial({
    color: 0xFFEE60,
    size: 0.12,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });

  fireflies = new THREE.Points(geo, ffMat);
  scene.add(fireflies);
}

export function updateFireflies(dt, playerX, playerZ, nightFactor, elapsedTime) {
  if (!fireflies) return;

  // Fireflies only visible at night
  var targetOpacity = nightFactor * 0.85;
  ffMat.opacity += (targetOpacity - ffMat.opacity) * 3 * dt;
  fireflies.visible = ffMat.opacity > 0.01;
  if (!fireflies.visible) return;

  for (var i = 0; i < FF_COUNT; i++) {
    var ix = i * 3;
    var phase = ffPhases[i];

    // Gentle sinusoidal drift (fireflies wander lazily)
    var wobbleX = Math.sin(elapsedTime * 0.8 + phase) * 0.3;
    var wobbleZ = Math.cos(elapsedTime * 0.6 + phase * 1.3) * 0.3;

    ffPositions[ix]     += (ffVels[i].x + wobbleX) * dt;
    ffPositions[ix + 1] += ffVels[i].y * dt;
    ffPositions[ix + 2] += (ffVels[i].z + wobbleZ) * dt;

    // Gentle bobbing height
    ffPositions[ix + 1] += Math.sin(elapsedTime * 1.2 + phase * 2) * 0.15 * dt;

    // Re-center around player when too far
    var dx = ffPositions[ix] - playerX;
    var dz = ffPositions[ix + 2] - playerZ;
    if (dx * dx + dz * dz > 150) {
      ffPositions[ix]     = playerX + (Math.random() - 0.5) * 14;
      ffPositions[ix + 1] = 0.3 + Math.random() * 1.5;
      ffPositions[ix + 2] = playerZ + (Math.random() - 0.5) * 14;
      // Randomize velocity on respawn
      ffVels[i].x = (Math.random() - 0.5) * 0.4;
      ffVels[i].z = (Math.random() - 0.5) * 0.4;
    }

    // Keep in reasonable height range
    if (ffPositions[ix + 1] < 0.2) {
      ffPositions[ix + 1] = 0.3;
      ffVels[i].y = Math.abs(ffVels[i].y) + 0.05;
    }
    if (ffPositions[ix + 1] > 2.5) {
      ffVels[i].y = -Math.abs(ffVels[i].y) - 0.05;
    }
  }

  // Pulsing glow effect — size oscillates per frame
  ffMat.size = 0.1 + Math.sin(elapsedTime * 2.5) * 0.04;

  fireflies.geometry.attributes.position.needsUpdate = true;
}
