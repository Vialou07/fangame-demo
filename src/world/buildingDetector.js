import { MAP, MAP_W, MAP_H, BLDG_TYPE, D } from '../data/map.js';

// Detect all building footprints within a chunk region
// Returns array of { type, anchorX, anchorZ, minX, minZ, maxX, maxZ }
// Anchor is the door tile position (used for model placement ownership)

export function detectBuildings(startX, startZ, width, height) {
  var endX = Math.min(startX + width, MAP_W);
  var endZ = Math.min(startZ + height, MAP_H);
  var seen = {};
  var buildings = [];

  for (var z = startZ; z < endZ; z++) {
    for (var x = startX; x < endX; x++) {
      var bt = BLDG_TYPE[z] ? BLDG_TYPE[z][x] : 0;
      if (bt === 0) continue;
      if (seen[x + ',' + z]) continue;

      // Flood-fill to find the full extent of this building
      var minX = x, maxX = x, minZ = z, maxZ = z;
      var stack = [[x, z]];
      var doorX = -1, doorZ = -1;

      while (stack.length > 0) {
        var p = stack.pop();
        var key = p[0] + ',' + p[1];
        if (seen[key]) continue;
        if (p[0] < 0 || p[0] >= MAP_W || p[1] < 0 || p[1] >= MAP_H) continue;
        if (!BLDG_TYPE[p[1]] || BLDG_TYPE[p[1]][p[0]] !== bt) continue;

        seen[key] = true;
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minZ) minZ = p[1];
        if (p[1] > maxZ) maxZ = p[1];

        // Track door position as anchor
        if (MAP[p[1]][p[0]] === D) {
          doorX = p[0];
          doorZ = p[1];
        }

        // Check 4 neighbors
        stack.push([p[0] + 1, p[1]]);
        stack.push([p[0] - 1, p[1]]);
        stack.push([p[0], p[1] + 1]);
        stack.push([p[0], p[1] - 1]);
      }

      // Use center of footprint if no door found
      if (doorX === -1) {
        doorX = Math.round((minX + maxX) / 2);
        doorZ = Math.round((minZ + maxZ) / 2);
      }

      buildings.push({
        type: bt,
        anchorX: doorX,
        anchorZ: doorZ,
        minX: minX,
        minZ: minZ,
        maxX: maxX,
        maxZ: maxZ
      });
    }
  }

  return buildings;
}
