import * as THREE from 'three';

export var VIEW_SIZE = 7;
export var CAM_ANGLE = Math.PI * 0.28;
export var CAM_DIST = 14;
export var CAM_DX = 0;
export var CAM_DY = Math.sin(CAM_ANGLE) * CAM_DIST;
export var CAM_DZ = Math.cos(CAM_ANGLE) * CAM_DIST;

export function createCamera() {
  var aspect = window.innerWidth / window.innerHeight;
  var camera = new THREE.OrthographicCamera(
    -VIEW_SIZE * aspect, VIEW_SIZE * aspect,
    VIEW_SIZE, -VIEW_SIZE,
    0.1, 100
  );
  return camera;
}
