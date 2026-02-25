import { MAP_W, MAP_H, isBlocked } from '../data/map.js';

// Binary min-heap for A* open set — O(log n) insert/extract vs O(n) linear scan
function MinHeap() {
  this.data = [];
  this.index = {}; // key -> position in heap (for decrease-key)
}

MinHeap.prototype.push = function(node) {
  this.data.push(node);
  var i = this.data.length - 1;
  this.index[node.k] = i;
  this._bubbleUp(i);
};

MinHeap.prototype.pop = function() {
  var top = this.data[0];
  var last = this.data.pop();
  delete this.index[top.k];
  if (this.data.length > 0) {
    this.data[0] = last;
    this.index[last.k] = 0;
    this._sinkDown(0);
  }
  return top;
};

MinHeap.prototype.size = function() {
  return this.data.length;
};

MinHeap.prototype.has = function(k) {
  return this.index[k] !== undefined;
};

MinHeap.prototype.decreaseKey = function(k, newF) {
  var i = this.index[k];
  this.data[i].f = newF;
  this._bubbleUp(i);
};

MinHeap.prototype._bubbleUp = function(i) {
  while (i > 0) {
    var parent = (i - 1) >> 1;
    if (this.data[i].f < this.data[parent].f) {
      this._swap(i, parent);
      i = parent;
    } else break;
  }
};

MinHeap.prototype._sinkDown = function(i) {
  var len = this.data.length;
  while (true) {
    var left = 2 * i + 1;
    var right = 2 * i + 2;
    var smallest = i;
    if (left < len && this.data[left].f < this.data[smallest].f) smallest = left;
    if (right < len && this.data[right].f < this.data[smallest].f) smallest = right;
    if (smallest !== i) {
      this._swap(i, smallest);
      i = smallest;
    } else break;
  }
};

MinHeap.prototype._swap = function(a, b) {
  var tmp = this.data[a];
  this.data[a] = this.data[b];
  this.data[b] = tmp;
  this.index[this.data[a].k] = a;
  this.index[this.data[b].k] = b;
};

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

  var open = new MinHeap();
  var gScore = {};
  var cameFrom = {};
  var closed = {};

  var startKey = key(sx, sz);
  gScore[startKey] = 0;
  open.push({ x: sx, z: sz, f: heuristic(sx, sz, gx, gz), k: startKey });

  while (open.size() > 0) {
    var current = open.pop();
    var ck = current.k;

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

      var newF = tentG + heuristic(nx, nz, gx, gz);
      if (open.has(nk)) {
        open.decreaseKey(nk, newF);
      } else {
        open.push({ x: nx, z: nz, f: newF, k: nk });
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
