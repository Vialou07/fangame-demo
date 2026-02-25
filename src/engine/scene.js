import * as THREE from 'three';

export function createScene() {
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);
  scene.fog = new THREE.FogExp2(0x87CEEB, 0.018);

  var worldGroup = new THREE.Group();
  scene.add(worldGroup);

  return { scene: scene, worldGroup: worldGroup };
}
