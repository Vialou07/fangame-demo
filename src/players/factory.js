import * as THREE from 'three';

export var PLAYER_COLORS = [0xE04040, 0x4080E0, 0x40C040, 0xA040E0, 0xE08040, 0xE040A0, 0x40C0C0, 0xC0C040];

export function createPlayer(bodyColor, hatColor) {
  var group = new THREE.Group();
  var parts = [];
  var baseYs = [];

  var bMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.55 });
  var skinMat = new THREE.MeshStandardMaterial({ color: 0xF8C8A8, roughness: 0.65 });
  var pantsMat = new THREE.MeshStandardMaterial({ color: 0x2A4A7A, roughness: 0.7 });
  var shoeMat = new THREE.MeshStandardMaterial({ color: 0x3A3A3A, roughness: 0.8 });

  // --- Legs (separate groups for walk animation) ---
  var legL = new THREE.Group();
  var legMeshL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.14, 6), pantsMat);
  legMeshL.position.y = -0.07;
  legMeshL.castShadow = true;
  legL.add(legMeshL);
  var footL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.09), shoeMat);
  footL.position.set(0, -0.16, 0.015);
  footL.castShadow = true;
  legL.add(footL);
  legL.position.set(-0.055, 0.18, 0);
  group.add(legL);

  var legR = new THREE.Group();
  var legMeshR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.14, 6), pantsMat);
  legMeshR.position.y = -0.07;
  legMeshR.castShadow = true;
  legR.add(legMeshR);
  var footR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.09), shoeMat);
  footR.position.set(0, -0.16, 0.015);
  footR.castShadow = true;
  legR.add(footR);
  legR.position.set(0.055, 0.18, 0);
  group.add(legR);

  // --- Torso (parts[0] — colored by player color) ---
  var torso = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.13), bMat);
  torso.position.y = 0.33;
  torso.castShadow = true;
  group.add(torso);
  parts.push(torso); baseYs.push(0.33);

  // --- Arms (separate groups for swing animation) ---
  var armL = new THREE.Group();
  var armMeshL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.16, 6), skinMat);
  armMeshL.position.y = -0.08;
  armMeshL.castShadow = true;
  armL.add(armMeshL);
  armL.position.set(-0.135, 0.37, 0);
  group.add(armL);

  var armR = new THREE.Group();
  var armMeshR = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.16, 6), skinMat);
  armMeshR.position.y = -0.08;
  armMeshR.castShadow = true;
  armR.add(armMeshR);
  armR.position.set(0.135, 0.37, 0);
  group.add(armR);

  // --- Head (parts[1]) ---
  var hMat = new THREE.MeshStandardMaterial({ color: 0xF8C8A8, roughness: 0.65 });
  var h = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), hMat);
  h.position.y = 0.55;
  h.castShadow = true;
  group.add(h);
  parts.push(h); baseYs.push(0.55);

  // --- Hair (parts[2]) ---
  var hrMat = new THREE.MeshStandardMaterial({ color: 0x383838, roughness: 0.8 });
  var hr = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hrMat);
  hr.position.y = 0.58;
  hr.castShadow = true;
  group.add(hr);
  parts.push(hr); baseYs.push(0.58);

  // --- Hat (parts[3] — colored by player color) ---
  var htMat = new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.45 });
  var ht = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.08, 12), htMat);
  ht.position.y = 0.67;
  ht.castShadow = true;
  group.add(ht);
  parts.push(ht); baseYs.push(0.67);

  // --- Brim (parts[4] — colored by player color) ---
  var brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 12), htMat);
  brim.position.y = 0.64;
  group.add(brim);
  parts.push(brim); baseYs.push(0.64);

  // --- Eyes ---
  var eMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 });
  var eL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), eMat);
  eL.position.set(-0.05, 0.56, 0.11);
  group.add(eL);
  var eR = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), eMat);
  eR.position.set(0.05, 0.56, 0.11);
  group.add(eR);

  // --- Shadow ---
  var shad = new THREE.Mesh(
    new THREE.CircleGeometry(0.2, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })
  );
  shad.rotation.x = -Math.PI / 2;
  shad.position.y = 0.03;
  group.add(shad);

  return { group: group, parts: parts, baseYs: baseYs, limbs: { armL: armL, armR: armR, legL: legL, legR: legR } };
}
