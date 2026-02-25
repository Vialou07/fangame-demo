import * as THREE from 'three';

export var PLAYER_COLORS = [0xE04040, 0x4080E0, 0x40C040, 0xA040E0, 0xE08040, 0xE040A0, 0x40C0C0, 0xC0C040];

export function createPlayer(bodyColor, hatColor) {
  var group = new THREE.Group();
  var parts = [];
  var baseYs = [];

  var bMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.55 });
  var b = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.25, 8, 12), bMat);
  b.position.y = 0.32; b.castShadow = true; group.add(b);
  parts.push(b); baseYs.push(0.32);

  var hMat = new THREE.MeshStandardMaterial({ color: 0xF8C8A8, roughness: 0.65 });
  var h = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), hMat);
  h.position.y = 0.58; h.castShadow = true; group.add(h);
  parts.push(h); baseYs.push(0.58);

  var hrMat = new THREE.MeshStandardMaterial({ color: 0x383838, roughness: 0.8 });
  var hr = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hrMat);
  hr.position.y = 0.61; hr.castShadow = true; group.add(hr);
  parts.push(hr); baseYs.push(0.61);

  var htMat = new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.45 });
  var ht = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.08, 12), htMat);
  ht.position.y = 0.7; ht.castShadow = true; group.add(ht);
  parts.push(ht); baseYs.push(0.7);

  var brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 12), htMat);
  brim.position.y = 0.67; group.add(brim);
  parts.push(brim); baseYs.push(0.67);

  var eMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 });
  var eL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), eMat);
  eL.position.set(-0.05, 0.59, 0.11); group.add(eL);
  var eR = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), eMat);
  eR.position.set(0.05, 0.59, 0.11); group.add(eR);

  var shad = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }));
  shad.rotation.x = -Math.PI / 2; shad.position.y = 0.07; group.add(shad);

  return { group: group, parts: parts, baseYs: baseYs };
}
