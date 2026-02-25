import { describe, it, expect, beforeEach } from 'vitest';
import { CHUNK_SIZE, LOAD_RADIUS, getLoadedCount, clearAllChunks, updateChunks, initChunks, allWaterTiles, allLilyPads } from '../engine/chunks.js';
import * as THREE from 'three';

// Create a real THREE.Group as worldGroup
var worldGroup;

beforeEach(function() {
  worldGroup = new THREE.Group();
  // Clear any previously loaded chunks
  clearAllChunks(worldGroup);
});

describe('chunk system constants', function() {
  it('CHUNK_SIZE is 16', function() {
    expect(CHUNK_SIZE).toBe(16);
  });

  it('LOAD_RADIUS is at least 1', function() {
    expect(LOAD_RADIUS).toBeGreaterThanOrEqual(1);
  });
});

describe('initChunks', function() {
  it('adds ground plane to worldGroup', function() {
    var before = worldGroup.children.length;
    initChunks(worldGroup);
    expect(worldGroup.children.length).toBe(before + 1);
  });
});

describe('updateChunks - loading', function() {
  it('loads chunks around the player', function() {
    initChunks(worldGroup);
    updateChunks(20, 15, worldGroup);
    expect(getLoadedCount()).toBeGreaterThan(0);
  });

  it('loads chunks within LOAD_RADIUS', function() {
    initChunks(worldGroup);
    updateChunks(20, 15, worldGroup);
    // Player is in chunk (1, 0) since 20/16=1.25, 15/16=0.93
    // With LOAD_RADIUS=2, should load up to (2*LOAD_RADIUS+1)^2 = 25 chunks
    // But many are outside the map, so count should be less
    var count = getLoadedCount();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual((2 * LOAD_RADIUS + 1) * (2 * LOAD_RADIUS + 1));
  });

  it('does not reload when player stays in same chunk', function() {
    initChunks(worldGroup);
    updateChunks(20, 15, worldGroup);
    var count1 = getLoadedCount();
    var children1 = worldGroup.children.length;
    // Move slightly within same chunk
    updateChunks(21, 15, worldGroup);
    expect(getLoadedCount()).toBe(count1);
    expect(worldGroup.children.length).toBe(children1);
  });
});

describe('updateChunks - unloading', function() {
  it('unloads chunks when player moves far away', function() {
    initChunks(worldGroup);
    // Load at one position
    updateChunks(5, 5, worldGroup);
    var count1 = getLoadedCount();
    expect(count1).toBeGreaterThan(0);

    // Move to a very different position (far enough that old chunks are out of range)
    // With CHUNK_SIZE=16, LOAD_RADIUS=2, moving 5+ chunks away should unload old ones
    updateChunks(5, 5 + CHUNK_SIZE * (LOAD_RADIUS * 2 + 1), worldGroup);
    // Some old chunks should be unloaded (new chunks loaded for new position)
    // Total count shouldn't keep growing unbounded
    var count2 = getLoadedCount();
    expect(count2).toBeLessThanOrEqual((2 * LOAD_RADIUS + 1) * (2 * LOAD_RADIUS + 1));
  });
});

describe('clearAllChunks', function() {
  it('removes all loaded chunks', function() {
    initChunks(worldGroup);
    updateChunks(20, 15, worldGroup);
    expect(getLoadedCount()).toBeGreaterThan(0);
    clearAllChunks(worldGroup);
    expect(getLoadedCount()).toBe(0);
  });
});

describe('animation arrays', function() {
  it('allWaterTiles is an array', function() {
    expect(Array.isArray(allWaterTiles)).toBe(true);
  });

  it('allLilyPads is an array', function() {
    expect(Array.isArray(allLilyPads)).toBe(true);
  });
});
