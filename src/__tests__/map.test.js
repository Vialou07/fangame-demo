import { describe, it, expect } from 'vitest';
import { MAP, MAP_W, MAP_H, TILE, MOVE_SPEED, G, P, W, T, H, R, D, F, S, B, L, N, TG, SD, RK, LV } from '../data/map.js';

describe('map constants', function() {
  it('MAP dimensions match declared size', function() {
    expect(MAP.length).toBe(MAP_H);
    for (var i = 0; i < MAP.length; i++) {
      expect(MAP[i].length).toBe(MAP_W);
    }
  });

  it('TILE size is 1', function() {
    expect(TILE).toBe(1);
  });

  it('MOVE_SPEED is positive', function() {
    expect(MOVE_SPEED).toBeGreaterThan(0);
  });

  it('tile type constants are distinct integers', function() {
    var types = [G, P, W, T, H, R, D, F, S, B, L, N, TG, SD, RK, LV];
    var unique = new Set(types);
    expect(unique.size).toBe(types.length);
  });
});

describe('MAP content', function() {
  it('all tiles are valid types', function() {
    var valid = new Set([G, P, W, T, H, R, D, F, S, B, L, N, TG, SD, RK, LV]);
    for (var y = 0; y < MAP_H; y++) {
      for (var x = 0; x < MAP_W; x++) {
        expect(valid.has(MAP[y][x])).toBe(true);
      }
    }
  });

  it('main street of Bourg-Aurore has path tiles at z=60', function() {
    // x=70 to x=91 should be path tiles (east-west main street)
    for (var x = 70; x <= 91; x++) {
      var t = MAP[60][x];
      // Some tiles on the street are benches/lamps, skip those
      if (t !== B && t !== L) {
        expect(t).toBe(P);
      }
    }
  });

  it('every door (D) has a house wall (H) on both sides', function() {
    for (var y = 0; y < MAP_H; y++) {
      for (var x = 0; x < MAP_W; x++) {
        if (MAP[y][x] === D) {
          expect(x > 0 && MAP[y][x - 1] === H).toBe(true);
          expect(x < MAP_W - 1 && MAP[y][x + 1] === H).toBe(true);
        }
      }
    }
  });

  it('map has all biome types (forest, town, lake, desert, mountain, volcano)', function() {
    // Town: doors exist (Bourg-Aurore)
    expect(MAP[56][74]).toBe(D);
    // Lake: water
    expect(MAP[110][70]).toBe(W);
    // Desert: sand
    expect(MAP[60][182]).toBe(SD);
    // Mountain: rocks
    expect(MAP[5][5]).toBe(RK);
    // Volcano: lava
    expect(MAP[20][25]).toBe(LV);
    // Forest: trees
    expect(MAP[2][42]).toBe(T);
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
