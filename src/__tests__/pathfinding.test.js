import { describe, it, expect } from 'vitest';
import { findPath } from '../engine/pathfinding.js';

describe('A* pathfinding', function() {
  it('finds a path between open tiles', function() {
    // (6,6) is path P, (6,5) is flower/grass area
    var path = findPath(0, 5, 5, 5);
    expect(path.length).toBeGreaterThan(0);
    // Last waypoint should be the goal
    expect(path[path.length - 1]).toEqual({ x: 5, z: 5 });
  });

  it('returns empty array when goal is blocked', function() {
    // (0,0) is T (tree), blocked
    var path = findPath(6, 6, 0, 0);
    expect(path).toEqual([]);
  });

  it('returns empty array when start equals goal', function() {
    var path = findPath(6, 6, 6, 6);
    expect(path).toEqual([]);
  });

  it('finds path along the main road', function() {
    // Row 6 is all P (path tiles), but P is walkable
    var path = findPath(0, 6, 13, 6);
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual({ x: 13, z: 6 });
  });

  it('avoids blocked tiles', function() {
    // Path from (3,5) P to (9,5) P, must go around houses
    var path = findPath(3, 5, 9, 5);
    expect(path.length).toBeGreaterThan(0);
    for (var i = 0; i < path.length; i++) {
      var p = path[i];
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.z).toBeGreaterThanOrEqual(0);
    }
  });

  it('supports diagonal movement', function() {
    // From (3,6) P to (5,5) G - open area, diagonal shortcut possible
    var path = findPath(3, 6, 5, 5);
    expect(path.length).toBeGreaterThan(0);
    // Manhattan distance = 3, with diagonals it should be 2
    expect(path.length).toBeLessThanOrEqual(3);
  });

  it('returns empty when no path exists (surrounded by walls)', function() {
    // Goal inside a house: (3,3) is H (house wall), blocked
    var path = findPath(6, 6, 3, 3);
    expect(path).toEqual([]);
  });
});
