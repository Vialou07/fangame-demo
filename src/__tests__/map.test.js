import { describe, it, expect } from 'vitest';
import { MAP, MAP_W, MAP_H, TILE, MOVE_SPEED, G, P, W, T, H, R, D, F, S, B, L, N, TG } from '../data/map.js';

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
    var types = [G, P, W, T, H, R, D, F, S, B, L, N, TG];
    var unique = new Set(types);
    expect(unique.size).toBe(types.length);
  });
});

describe('MAP content', () => {
  it('all tiles are valid types', () => {
    var valid = new Set([G, P, W, T, H, R, D, F, S, B, L, N, TG]);
    for (var y = 0; y < MAP_H; y++) {
      for (var x = 0; x < MAP_W; x++) {
        expect(valid.has(MAP[y][x])).toBe(true);
      }
    }
  });

  it('row 14 has a long path stretch (town main street)', () => {
    // x=14 to x=33 should be path tiles
    for (var x = 14; x <= 33; x++) {
      expect(MAP[14][x]).toBe(P);
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

  it('map has all zone types (forest, town, lake, routes)', () => {
    // Forest: trees at top
    expect(MAP[0][0]).toBe(T);
    // Town: doors exist in center area
    expect(MAP[12][15]).toBe(D);
    // Lake: water in south-west
    expect(MAP[24][7]).toBe(W);
    // Tall grass encounter zones exist
    var hasTG = false;
    for (var y = 0; y < MAP_H && !hasTG; y++) {
      for (var x = 0; x < MAP_W && !hasTG; x++) {
        if (MAP[y][x] === TG) hasTG = true;
      }
    }
    expect(hasTG).toBe(true);
  });
});
