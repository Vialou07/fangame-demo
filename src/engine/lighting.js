import * as THREE from 'three';

export function setupLighting(scene) {
  scene.add(new THREE.AmbientLight(0xFFF0D8, 0.5));
  scene.add(new THREE.HemisphereLight(0x90C8FF, 0x4A6828, 0.4));

  var sun = new THREE.DirectionalLight(0xFFF2D0, 1.6);
  sun.position.set(6, 14, -6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 35;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 5;
  scene.add(sun);
  scene.add(sun.target);

  var fill = new THREE.DirectionalLight(0xB0D8FF, 0.3);
  fill.position.set(-4, 8, 6);
  scene.add(fill);

  return { sun: sun };
}

// Update shadow camera to follow player position
export function updateShadow(sun, px, pz) {
  sun.position.set(px + 6, 14, pz - 6);
  sun.target.position.set(px, 0, pz);
}
