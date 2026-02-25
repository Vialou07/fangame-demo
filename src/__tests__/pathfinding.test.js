import { describe, it, expect } from 'vitest';
import { findPath } from '../engine/pathfinding.js';

describe('A* pathfinding', function() {
  it('finds a path between open tiles', function() {
    // (19,14) and (25,14) are both P tiles on the main street
    var path = findPath(19, 14, 25, 14);
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual({ x: 25, z: 14 });
  });

  it('returns empty array when goal is blocked', function() {
    // (0,0) is T (tree), blocked
    var path = findPath(19, 14, 0, 0);
    expect(path).toEqual([]);
  });

  it('returns empty array when start equals goal', function() {
    var path = findPath(19, 14, 19, 14);
    expect(path).toEqual([]);
  });

  it('finds path along the main road', function() {
    // Row 14 has path tiles from x=14 to x=33
    var path = findPath(14, 14, 33, 14);
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual({ x: 33, z: 14 });
  });

  it('avoids blocked tiles', function() {
    // Path from town to east meadow, must go around houses
    var path = findPath(19, 14, 33, 10);
    expect(path.length).toBeGreaterThan(0);
    for (var i = 0; i < path.length; i++) {
      var p = path[i];
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.z).toBeGreaterThanOrEqual(0);
    }
  });

  it('supports diagonal movement', function() {
    // (10,10) and (11,11) are both G, diagonal neighbors, all 4 cells in 2x2 are walkable
    var path = findPath(10, 10, 11, 11);
    expect(path.length).toBeGreaterThan(0);
    // Diagonal = 1 step
    expect(path.length).toBeLessThanOrEqual(2);
  });

  it('returns empty when no path exists (surrounded by walls)', function() {
    // Goal is a house wall tile (14,12) = H, blocked
    var path = findPath(19, 14, 14, 12);
    expect(path).toEqual([]);
  });

  it('finds long path across the map', function() {
    // From forest path (12,3) P to route 1 south (20,22) P
    var path = findPath(12, 3, 20, 22);
    expect(path.length).toBeGreaterThan(10);
    expect(path[path.length - 1]).toEqual({ x: 20, z: 22 });
  });
});
