import * as THREE from 'three';

// Zoom settings
var isMobile = window.innerWidth <= 768;
var DEFAULT_ZOOM = isMobile ? 5.5 : 7;
var MIN_ZOOM = 3;
var MAX_ZOOM = 10;

export var zoom = { value: DEFAULT_ZOOM };
export var VIEW_SIZE = zoom.value; // kept for backward compat in resize handler
export var CAM_ANGLE = Math.PI * 0.28;
export var CAM_DIST = 14;
export var CAM_DX = 0;
export var CAM_DY = Math.sin(CAM_ANGLE) * CAM_DIST;
export var CAM_DZ = Math.cos(CAM_ANGLE) * CAM_DIST;

export function createCamera() {
  var aspect = window.innerWidth / window.innerHeight;
  var camera = new THREE.OrthographicCamera(
    -zoom.value * aspect, zoom.value * aspect,
    zoom.value, -zoom.value,
    0.1, 100
  );
  return camera;
}

export function updateCameraZoom(camera) {
  var aspect = window.innerWidth / window.innerHeight;
  camera.left = -zoom.value * aspect;
  camera.right = zoom.value * aspect;
  camera.top = zoom.value;
  camera.bottom = -zoom.value;
  camera.updateProjectionMatrix();
}

export function setZoom(val) {
  zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, val));
}

// Pinch-to-zoom setup (call once with the renderer's domElement)
export function setupPinchZoom(canvas) {
  var startDist = 0;
  var startZoom = 0;

  canvas.addEventListener('touchstart', function(e) {
    if (e.touches.length === 2) {
      var t1 = e.touches[0], t2 = e.touches[1];
      startDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      startZoom = zoom.value;
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', function(e) {
    if (e.touches.length === 2) {
      var t1 = e.touches[0], t2 = e.touches[1];
      var curDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      if (startDist > 0) {
        var scale = startDist / curDist; // pinch in = zoom out (larger VIEW_SIZE)
        setZoom(startZoom * scale);
      }
    }
  }, { passive: true });

  canvas.addEventListener('touchend', function(e) {
    if (e.touches.length < 2) {
      startDist = 0;
    }
  }, { passive: true });

  // Desktop: mouse wheel zoom
  canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    var delta = e.deltaY > 0 ? 0.5 : -0.5;
    setZoom(zoom.value + delta);
  }, { passive: false });
}
