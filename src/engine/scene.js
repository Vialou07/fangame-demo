import * as THREE from 'three';

export function createScene() {
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ED8F8);
  scene.fog = new THREE.FogExp2(0x8ED8F8, 0.014);

  var worldGroup = new THREE.Group();
  scene.add(worldGroup);

  return { scene: scene, worldGroup: worldGroup };
}
