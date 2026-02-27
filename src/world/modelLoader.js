import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

var loader = new GLTFLoader();

// Cache the raw ArrayBuffer so we don't re-download,
// but parse a fresh GLTF each time (SkinnedMesh can't be cloned reliably)
var bufferCache = {};

export function loadModel(path) {
  var promise;

  if (bufferCache[path]) {
    promise = Promise.resolve(bufferCache[path]);
  } else {
    promise = fetch(path)
      .then(function(res) { return res.arrayBuffer(); })
      .then(function(buf) { bufferCache[path] = buf; return buf; });
  }

  return promise.then(function(buffer) {
    // Resolve base path for external resources (textures, etc.)
    var basePath = path.substring(0, path.lastIndexOf('/') + 1);
    return new Promise(function(resolve, reject) {
      loader.parse(buffer, basePath, function(gltf) {
        gltf.scene.traverse(function(child) {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        resolve(gltf.scene);
      }, reject);
    });
  });
}
