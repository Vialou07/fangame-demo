import { describe, it, expect } from 'vitest';
import { MAP, MAP_W, MAP_H, TILE, MOVE_SPEED, G, P, W, T, H, R, D, F } from '../data/map.js';

describe('map constants', () => {
  it('MAP dimensions match declared size', () => {
    expect(MAP.length).toBe(MAP_H);
    for (var i = 0; i < MAP.length; i++) {
      expect(MAP[i].length).toBe(MAP_W);
    }
  });

  it('TILE size is 1', () => {
    expect(TILE).toBe(1);
  });

  it('MOVE_SPEED is positive', () => {
    expect(MOVE_SPEED).toBeGreaterThan(0);
  });

  it('tile type constants are distinct integers', () => {
    var types = [G, P, W, T, H, R, D, F];
    var unique = new Set(types);
    expect(unique.size).toBe(types.length);
  });
});

describe('MAP content', () => {
  it('all tiles are valid types', () => {
    var valid = new Set([G, P, W, T, H, R, D, F]);
    for (var y = 0; y < MAP_H; y++) {
      for (var x = 0; x < MAP_W; x++) {
        expect(valid.has(MAP[y][x])).toBe(true);
      }
    }
  });

  it('row 6 is the main path (all P)', () => {
    for (var x = 0; x < MAP_W; x++) {
      expect(MAP[6][x]).toBe(P);
    }
  });

  it('every door (D) has a house wall (H) on both sides', () => {
    for (var y = 0; y < MAP_H; y++) {
      for (var x = 0; x < MAP_W; x++) {
        if (MAP[y][x] === D) {
          expect(x > 0 && MAP[y][x - 1] === H).toBe(true);
          expect(x < MAP_W - 1 && MAP[y][x + 1] === H).toBe(true);
        }
      }
    }
  });
});
