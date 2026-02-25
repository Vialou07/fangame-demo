import * as THREE from 'three';

export function setupLighting(scene, mapW, mapH) {
  scene.add(new THREE.AmbientLight(0xFFEEDD, 0.45));
  scene.add(new THREE.HemisphereLight(0x88BBFF, 0x445522, 0.35));

  var sun = new THREE.DirectionalLight(0xFFF5E0, 1.8);
  sun.position.set(mapW / 2 + 6, 14, mapH / 2 - 6);
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
  sun.shadow.radius = 4;
  sun.target.position.set(mapW / 2, 0, mapH / 2);
  scene.add(sun);
  scene.add(sun.target);

  scene.add(new THREE.DirectionalLight(0xAADDFF, 0.25).position.set(-4, 8, 6));
}
