import { MAP_W, MAP_H, isBlocked } from '../data/map.js';

// A* pathfinding on the tile grid
// Returns array of {x, z} tile centers, or empty array if no path found

export function findPath(startX, startZ, goalX, goalZ) {
  // Round to tile coords
  var sx = Math.round(startX);
  var sz = Math.round(startZ);
  var gx = Math.round(goalX);
  var gz = Math.round(goalZ);

  // Clamp to map
  gx = Math.max(0, Math.min(MAP_W - 1, gx));
  gz = Math.max(0, Math.min(MAP_H - 1, gz));

  if (isBlocked(gx, gz)) return [];
  if (sx === gx && sz === gz) return [];

  // 8 directions (cardinal + diagonal)
  var dirs = [
    { dx: 0, dz: -1, cost: 1 },
    { dx: 0, dz: 1, cost: 1 },
    { dx: -1, dz: 0, cost: 1 },
    { dx: 1, dz: 0, cost: 1 },
    { dx: -1, dz: -1, cost: 1.41 },
    { dx: 1, dz: -1, cost: 1.41 },
    { dx: -1, dz: 1, cost: 1.41 },
    { dx: 1, dz: 1, cost: 1.41 },
  ];

  var key = function(x, z) { return x + ',' + z; };

  // Open set as simple sorted array (map is small, 14x12)
  var open = [];
  var gScore = {};
  var cameFrom = {};
  var closed = {};

  var startKey = key(sx, sz);
  gScore[startKey] = 0;
  open.push({ x: sx, z: sz, f: heuristic(sx, sz, gx, gz) });

  while (open.length > 0) {
    // Pick lowest f
    var bestIdx = 0;
    for (var i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    var current = open.splice(bestIdx, 1)[0];
    var ck = key(current.x, current.z);

    if (current.x === gx && current.z === gz) {
      return reconstructPath(cameFrom, current.x, current.z, sx, sz);
    }

    closed[ck] = true;
    var currentG = gScore[ck];

    for (var d = 0; d < dirs.length; d++) {
      var nx = current.x + dirs[d].dx;
      var nz = current.z + dirs[d].dz;
      var nk = key(nx, nz);

      if (closed[nk]) continue;
      if (nx < 0 || nz < 0 || nx >= MAP_W || nz >= MAP_H) continue;
      if (isBlocked(nx, nz)) continue;

      // For diagonals, check that both cardinal neighbours are free (no corner cutting)
      if (dirs[d].dx !== 0 && dirs[d].dz !== 0) {
        if (isBlocked(current.x + dirs[d].dx, current.z) ||
            isBlocked(current.x, current.z + dirs[d].dz)) continue;
      }

      var tentG = currentG + dirs[d].cost;
      if (gScore[nk] !== undefined && tentG >= gScore[nk]) continue;

      gScore[nk] = tentG;
      cameFrom[nk] = ck;

      // Add or update in open
      var found = false;
      for (var j = 0; j < open.length; j++) {
        if (open[j].x === nx && open[j].z === nz) {
          open[j].f = tentG + heuristic(nx, nz, gx, gz);
          found = true;
          break;
        }
      }
      if (!found) {
        open.push({ x: nx, z: nz, f: tentG + heuristic(nx, nz, gx, gz) });
      }
    }
  }

  return []; // No path
}

function heuristic(ax, az, bx, bz) {
  // Octile distance
  var dx = Math.abs(ax - bx);
  var dz = Math.abs(az - bz);
  return Math.max(dx, dz) + 0.41 * Math.min(dx, dz);
}

function reconstructPath(cameFrom, gx, gz, sx, sz) {
  var path = [];
  var k = gx + ',' + gz;
  var startK = sx + ',' + sz;

  while (k !== startK) {
    var parts = k.split(',');
    path.push({ x: parseInt(parts[0]), z: parseInt(parts[1]) });
    k = cameFrom[k];
    if (!k) break;
  }

  path.reverse();
  return path;
}
