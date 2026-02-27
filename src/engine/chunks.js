import * as THREE from 'three';
import { MAP_W, MAP_H } from '../data/map.js';
import { buildChunk } from '../world/builder.js';
import {
  tileGeo, waterGeo, waterPlaneGeo, bladeGeo,
  mGrass, mGrassD, mPath, mWater, mTrunk, mLeaf, mLeafL, mLeafDark,
  mPine, mPineD, mBush, mBushD, mWall, mRoof, mDoor, mDoorF,
  mGlass, mKnob, mStem, mFCenter, mStone, mFoundation, mShutter,
  mChimney, mAwning, mStep, mSign, mSignPost, mBench, mBenchLeg,
  mLamp, mLampLight, mFenceWood, mSand, mReed, mLilyPad, mLilyFlower,
  mFlowers, mSandTile, mRock, mRockD, mLava,
  grassMats, pathMats
} from '../world/materials.js';
import { waterShaderMat, lavaShaderMat } from '../world/shaders.js';

export var CHUNK_SIZE = 16;
export var LOAD_RADIUS = 2; // Load chunks within this radius of the player's chunk

// Loaded chunks: key "cx,cz" → { group, waterTiles, lilyPads }
var loaded = {};

// Ground plane that follows the player
var ground = null;

// All water/lily arrays for animation (collected from loaded chunks)
export var allWaterTiles = [];
export var allLilyPads = [];

export function initChunks(worldGroup) {
  // Large ground plane (follows player, see updateChunks)
  ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: 0x48A850, roughness: 0.9 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.08;
  ground.receiveShadow = true;
  worldGroup.add(ground);
}

var lastChunkX = -999;
var lastChunkZ = -999;

export function updateChunks(playerX, playerZ, worldGroup) {
  // Move ground plane to follow player
  if (ground) {
    ground.position.x = playerX;
    ground.position.z = playerZ;
  }

  var pcx = Math.floor(playerX / CHUNK_SIZE);
  var pcz = Math.floor(playerZ / CHUNK_SIZE);

  // Only reload when player changes chunk
  if (pcx === lastChunkX && pcz === lastChunkZ) return;
  lastChunkX = pcx;
  lastChunkZ = pcz;

  // Determine which chunks should be loaded
  var needed = {};
  for (var dz = -LOAD_RADIUS; dz <= LOAD_RADIUS; dz++) {
    for (var dx = -LOAD_RADIUS; dx <= LOAD_RADIUS; dx++) {
      var cx = pcx + dx;
      var cz = pcz + dz;
      // Skip chunks entirely outside the map
      if (cx * CHUNK_SIZE >= MAP_W || cz * CHUNK_SIZE >= MAP_H) continue;
      if ((cx + 1) * CHUNK_SIZE <= 0 || (cz + 1) * CHUNK_SIZE <= 0) continue;
      needed[cx + ',' + cz] = true;
    }
  }

  // Unload chunks no longer needed
  for (var key in loaded) {
    if (!needed[key]) {
      unloadChunk(key, worldGroup);
    }
  }

  // Load new chunks
  for (var key in needed) {
    if (!loaded[key]) {
      loadChunk(key, worldGroup);
    }
  }
}

function loadChunk(key, worldGroup) {
  var parts = key.split(',');
  var cx = parseInt(parts[0]);
  var cz = parseInt(parts[1]);

  var startX = cx * CHUNK_SIZE;
  var startZ = cz * CHUNK_SIZE;

  // Clamp to map bounds
  var sx = Math.max(0, startX);
  var sz = Math.max(0, startZ);
  var w = Math.min(startX + CHUNK_SIZE, MAP_W) - sx;
  var h = Math.min(startZ + CHUNK_SIZE, MAP_H) - sz;

  if (w <= 0 || h <= 0) return;

  var chunk = buildChunk(sx, sz, w, h);
  worldGroup.add(chunk.group);

  loaded[key] = {
    group: chunk.group,
    waterTiles: chunk.waterTiles,
    lilyPads: chunk.lilyPads
  };

  // Rebuild animation arrays
  rebuildAnimArrays();
}

// Set of shared geometries/materials that must NOT be disposed
var sharedGeos = null;
var sharedMats = null;

function getSharedSets() {
  if (!sharedGeos) {
    sharedGeos = new Set([tileGeo, waterGeo, waterPlaneGeo, bladeGeo]);
    var matArr = [
      mGrass, mGrassD, mPath, mWater, mTrunk, mLeaf, mLeafL, mLeafDark,
      mPine, mPineD, mBush, mBushD, mWall, mRoof, mDoor, mDoorF,
      mGlass, mKnob, mStem, mFCenter, mStone, mFoundation, mShutter,
      mChimney, mAwning, mStep, mSign, mSignPost, mBench, mBenchLeg,
      mLamp, mLampLight, mFenceWood, mSand, mReed, mLilyPad, mLilyFlower,
      mSandTile, mRock, mRockD, mLava
    ];
    // Add grass/path variants and flower materials
    for (var i = 0; i < grassMats.length; i++) matArr.push(grassMats[i]);
    for (var j = 0; j < pathMats.length; j++) matArr.push(pathMats[j]);
    for (var k = 0; k < mFlowers.length; k++) matArr.push(mFlowers[k]);
    // Add shader materials
    if (waterShaderMat) matArr.push(waterShaderMat);
    if (lavaShaderMat) matArr.push(lavaShaderMat);
    sharedMats = new Set(matArr);
  }
  return { geos: sharedGeos, mats: sharedMats };
}

function unloadChunk(key, worldGroup) {
  var chunk = loaded[key];
  if (!chunk) return;

  worldGroup.remove(chunk.group);

  // Dispose only non-shared geometries and materials
  var shared = getSharedSets();
  chunk.group.traverse(function(child) {
    if (child.isMesh || child.isInstancedMesh) {
      if (child.geometry && !shared.geos.has(child.geometry)) {
        child.geometry.dispose();
      }
      if (child.material && !shared.mats.has(child.material)) {
        // Dispose textures on GLTF materials
        if (child.material.map) child.material.map.dispose();
        if (child.material.normalMap) child.material.normalMap.dispose();
        if (child.material.roughnessMap) child.material.roughnessMap.dispose();
        if (child.material.metalnessMap) child.material.metalnessMap.dispose();
        child.material.dispose();
      }
    }
  });

  delete loaded[key];
  rebuildAnimArrays();
}

function rebuildAnimArrays() {
  allWaterTiles = [];
  allLilyPads = [];
  for (var key in loaded) {
    var c = loaded[key];
    for (var i = 0; i < c.waterTiles.length; i++) allWaterTiles.push(c.waterTiles[i]);
    for (var j = 0; j < c.lilyPads.length; j++) allLilyPads.push(c.lilyPads[j]);
  }
}

// Get the number of loaded chunks (for debugging/tests)
export function getLoadedCount() {
  var count = 0;
  for (var key in loaded) count++;
  return count;
}

// Force unload all chunks and reset state
export function clearAllChunks(worldGroup) {
  for (var key in loaded) {
    unloadChunk(key, worldGroup);
  }
  lastChunkX = -999;
  lastChunkZ = -999;
}
