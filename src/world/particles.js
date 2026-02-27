import * as THREE from 'three';

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
