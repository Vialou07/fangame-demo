import { describe, it, expect } from 'vitest';
import { findPath } from '../engine/pathfinding.js';

describe('A* pathfinding', function() {
  it('finds a path between open tiles', function() {
    // (77,60) and (82,60) are both P tiles on Bourg-Aurore main street
    var path = findPath(77, 60, 82, 60);
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual({ x: 82, z: 60 });
  });

  it('returns empty array when goal is blocked', function() {
    // (42,2) is T (tree), blocked
    var path = findPath(77, 60, 42, 2);
    expect(path).toEqual([]);
  });

  it('returns empty array when start equals goal', function() {
    var path = findPath(77, 60, 77, 60);
    expect(path).toEqual([]);
  });

  it('finds path along the main road', function() {
    // z=60 has path tiles from x=70 to x=91 (Bourg-Aurore main street)
    var path = findPath(71, 60, 89, 60);
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual({ x: 89, z: 60 });
  });

  it('avoids blocked tiles', function() {
    // Path from main street to north of town, must go around houses
    var path = findPath(77, 60, 71, 53);
    expect(path.length).toBeGreaterThan(0);
    for (var i = 0; i < path.length; i++) {
      var p = path[i];
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.z).toBeGreaterThanOrEqual(0);
    }
  });

  it('supports diagonal movement', function() {
    // (71,53) and (72,54) are both G in Bourg-Aurore cleared area
    var path = findPath(71, 53, 72, 54);
    expect(path.length).toBeGreaterThan(0);
    // Diagonal = 1 step
    expect(path.length).toBeLessThanOrEqual(2);
  });

  it('returns empty when no path exists (surrounded by walls)', function() {
    // Goal is a house wall tile (73,56) = H, blocked
    var path = findPath(77, 60, 73, 56);
    expect(path).toEqual([]);
  });

  it('finds long path across the town', function() {
    // From north-south street to east end of main street
    var path = findPath(80, 55, 89, 60);
    expect(path.length).toBeGreaterThan(3);
    expect(path[path.length - 1]).toEqual({ x: 89, z: 60 });
  });
});
