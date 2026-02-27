import { MAP, MAP_W, MAP_H, G, P, W, T, H, R, D, F, S, B, L, N, TG, SD, RK, LV, BIOME_MAP } from '../data/map.js';

// ========== COLOR PALETTE ==========
var TILE_COLORS = {};
TILE_COLORS[G]  = '#58C060';
TILE_COLORS[P]  = '#E0CFA0';
TILE_COLORS[W]  = '#4098E0';
TILE_COLORS[T]  = '#1E6B30';
TILE_COLORS[H]  = '#D04040';
TILE_COLORS[R]  = '#B03030';
TILE_COLORS[D]  = '#C08040';
TILE_COLORS[F]  = '#E8A0D0';
TILE_COLORS[S]  = '#A08060';
TILE_COLORS[B]  = '#8B6B50';
TILE_COLORS[L]  = '#FFD040';
TILE_COLORS[N]  = '#6B5040';
TILE_COLORS[TG] = '#48A850';
TILE_COLORS[SD] = '#E8D8A8';
TILE_COLORS[RK] = '#7A7A7A';
TILE_COLORS[LV] = '#E04010';

// ========== ZONE LABELS (for full map) ==========
var ZONE_LABELS = [
  { name: 'Bourg-Aurore', x: 80, z: 60, color: '#8BC4FF', size: 14 },
  { name: 'Port-Ciel', x: 130, z: 130, color: '#8BC4FF', size: 14 },
  { name: 'Route 1', x: 90, z: 105, color: '#FFD040', size: 11 },
  { name: 'Foret Nord', x: 80, z: 15, color: '#60D070', size: 11 },
  { name: 'Foret Sud', x: 25, z: 170, color: '#60D070', size: 11 },
  { name: 'Lac Paisible', x: 80, z: 110, color: '#70C0FF', size: 11 },
  { name: 'Mont Rocheux', x: 15, z: 15, color: '#C0C0C0', size: 11 },
  { name: 'Volcan', x: 30, z: 30, color: '#FF6030', size: 11 },
  { name: 'Desert Ardent', x: 178, z: 90, color: '#E0C060', size: 11 },
  { name: 'Cote Doree', x: 175, z: 170, color: '#F0D090', size: 11 },
  { name: 'Marecage', x: 40, z: 100, color: '#80A080', size: 10 },
  { name: 'Grotte', x: 130, z: 30, color: '#A0A0A0', size: 10 },
];

var LEGEND_ITEMS = [
  { label: 'Herbe', color: '#58C060' },
  { label: 'Chemin', color: '#E0CFA0' },
  { label: 'Eau', color: '#4098E0' },
  { label: 'Foret', color: '#1E6B30' },
  { label: 'Maison', color: '#D04040' },
  { label: 'Sable', color: '#E8D8A8' },
  { label: 'Roche', color: '#7A7A7A' },
  { label: 'Lave', color: '#E04010' },
];

// ========== STATE ==========
var miniCanvas = null;
var miniCtx = null;
var mapTexture = null; // OffscreenCanvas with full map rendered once
var fullOverlay = null;
var fullCanvas = null;
var fullCtx = null;
var isFullOpen = false;
var teleportMode = false;
var teleportCallback = null;

// Full map pan/zoom state
var fullZoom = 1.0;
var panX = 0, panZ = 0;
var isDragging = false;
var dragStartX = 0, dragStartZ = 0;
var dragPanStartX = 0, dragPanStartZ = 0;

var MINI_SIZE = 160; // pixels for small minimap
var MINI_SCALE = MINI_SIZE / Math.max(MAP_W, MAP_H); // pixels per tile

// ========== GENERATE STATIC MAP TEXTURE ==========
function generateMapTexture() {
  var canvas = document.createElement('canvas');
  canvas.width = MAP_W;
  canvas.height = MAP_H;
  var ctx = canvas.getContext('2d');

  for (var y = 0; y < MAP_H; y++) {
    for (var x = 0; x < MAP_W; x++) {
      ctx.fillStyle = TILE_COLORS[MAP[y][x]] || '#000';
      ctx.fillRect(x, y, 1, 1);
    }
  }

  return canvas;
}

// ========== INIT MINIMAP ==========
export function initMinimap(onTeleport) {
  teleportCallback = onTeleport;

  // Generate the static map texture once
  mapTexture = generateMapTexture();

  // --- Small minimap (bottom-right corner) ---
  var container = document.createElement('div');
  container.id = 'minimap-container';
  container.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:20;cursor:pointer;border:2px solid rgba(255,255,255,0.3);border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.5);';

  miniCanvas = document.createElement('canvas');
  miniCanvas.width = MINI_SIZE;
  miniCanvas.height = MINI_SIZE;
  miniCanvas.style.cssText = 'display:block;width:' + MINI_SIZE + 'px;height:' + MINI_SIZE + 'px;';
  miniCtx = miniCanvas.getContext('2d');

  container.appendChild(miniCanvas);
  document.body.appendChild(container);

  container.addEventListener('click', function(e) {
    e.stopPropagation();
    openFullMap();
  });

  // --- Full map overlay ---
  fullOverlay = document.createElement('div');
  fullOverlay.id = 'fullmap-overlay';
  fullOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:200;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);display:none;';

  // Header bar
  var header = document.createElement('div');
  header.style.cssText = 'position:absolute;top:0;left:0;right:0;height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;color:#fff;font-family:system-ui;z-index:2;';

  var title = document.createElement('span');
  title.textContent = 'Carte du Monde';
  title.style.cssText = 'font-size:16px;font-weight:600;';

  var teleportLabel = document.createElement('span');
  teleportLabel.id = 'teleport-label';
  teleportLabel.textContent = '';
  teleportLabel.style.cssText = 'font-size:13px;color:#FF4040;font-weight:600;display:none;';

  var closeBtn = document.createElement('button');
  closeBtn.textContent = 'X';
  closeBtn.style.cssText = 'background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:16px;width:32px;height:32px;border-radius:6px;cursor:pointer;font-family:system-ui;';
  closeBtn.addEventListener('click', closeFullMap);

  header.appendChild(title);
  header.appendChild(teleportLabel);
  header.appendChild(closeBtn);

  // Canvas for full map
  fullCanvas = document.createElement('canvas');
  fullCanvas.style.cssText = 'position:absolute;top:40px;left:0;width:100%;height:calc(100% - 40px);cursor:grab;';
  fullCtx = null; // set on open

  // Zoom info
  var zoomInfo = document.createElement('div');
  zoomInfo.id = 'zoom-info';
  zoomInfo.style.cssText = 'position:absolute;bottom:12px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.5);font-size:12px;font-family:system-ui;pointer-events:none;';
  zoomInfo.textContent = 'Molette: zoom | Glisser: deplacer | T: teleportation';

  fullOverlay.appendChild(header);
  fullOverlay.appendChild(fullCanvas);
  fullOverlay.appendChild(zoomInfo);
  document.body.appendChild(fullOverlay);

  // --- Full map event handlers ---
  fullCanvas.addEventListener('mousedown', function(e) {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartZ = e.clientY;
    dragPanStartX = panX;
    dragPanStartZ = panZ;
    fullCanvas.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', function(e) {
    if (!isDragging || !isFullOpen) return;
    panX = dragPanStartX + (e.clientX - dragStartX);
    panZ = dragPanStartZ + (e.clientY - dragStartZ);
  });

  window.addEventListener('mouseup', function() {
    if (isDragging) {
      isDragging = false;
      if (fullCanvas) fullCanvas.style.cursor = teleportMode ? 'crosshair' : 'grab';
    }
  });

  fullCanvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    var oldZoom = fullZoom;
    fullZoom *= e.deltaY < 0 ? 1.15 : 0.87;
    fullZoom = Math.max(0.5, Math.min(5, fullZoom));

    // Zoom towards mouse position
    var rect = fullCanvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    panX = mx - (mx - panX) * (fullZoom / oldZoom);
    panZ = my - (my - panZ) * (fullZoom / oldZoom);
  }, { passive: false });

  fullCanvas.addEventListener('click', function(e) {
    // Only teleport if drag was minimal
    var dragDist = Math.abs(e.clientX - dragStartX) + Math.abs(e.clientY - dragStartZ);
    if (dragDist > 5) return;
    if (!teleportMode || !teleportCallback) return;

    var rect = fullCanvas.getBoundingClientRect();
    var cx = e.clientX - rect.left;
    var cy = e.clientY - rect.top;

    // Convert canvas pixel to map tile
    var cw = rect.width;
    var ch = rect.height;
    var mapPixelSize = fullZoom * Math.min(cw, ch) / Math.max(MAP_W, MAP_H) * Math.max(MAP_W, MAP_H);
    var tileSize = fullZoom * Math.min(cw, ch) / Math.max(MAP_W, MAP_H);

    var tileX = Math.floor((cx - panX) / tileSize);
    var tileZ = Math.floor((cy - panZ) / tileSize);

    if (tileX >= 0 && tileX < MAP_W && tileZ >= 0 && tileZ < MAP_H) {
      teleportCallback(tileX, tileZ);
      closeFullMap();
    }
  });

  // Keyboard handlers
  window.addEventListener('keydown', function(e) {
    if (!isFullOpen) return;
    if (e.key === 'Escape') {
      closeFullMap();
      e.preventDefault();
    }
    if (e.key === 't' || e.key === 'T') {
      teleportMode = !teleportMode;
      var label = document.getElementById('teleport-label');
      if (label) {
        label.style.display = teleportMode ? '' : 'none';
        label.textContent = teleportMode ? 'MODE TELEPORT (cliquer pour TP)' : '';
      }
      fullCanvas.style.cursor = teleportMode ? 'crosshair' : 'grab';
    }
  });

  // Touch support for full map
  var touchId = null;
  var touchStartX = 0, touchStartZ = 0;

  fullCanvas.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
      touchId = e.touches[0].identifier;
      dragStartX = e.touches[0].clientX;
      dragStartZ = e.touches[0].clientY;
      dragPanStartX = panX;
      dragPanStartZ = panZ;
      isDragging = true;
      touchStartX = e.touches[0].clientX;
      touchStartZ = e.touches[0].clientY;
    }
  }, { passive: true });

  fullCanvas.addEventListener('touchmove', function(e) {
    if (!isDragging || e.touches.length !== 1) return;
    var t = e.touches[0];
    panX = dragPanStartX + (t.clientX - dragStartX);
    panZ = dragPanStartZ + (t.clientY - dragStartZ);
  }, { passive: true });

  fullCanvas.addEventListener('touchend', function(e) {
    if (!isDragging) return;
    isDragging = false;
    var ct = e.changedTouches[0];
    var dist = Math.abs(ct.clientX - touchStartX) + Math.abs(ct.clientY - touchStartZ);
    if (dist < 10 && teleportMode && teleportCallback) {
      var rect = fullCanvas.getBoundingClientRect();
      var cx = ct.clientX - rect.left;
      var cy = ct.clientY - rect.top;
      var tileSize = fullZoom * Math.min(rect.width, rect.height) / Math.max(MAP_W, MAP_H);
      var tileX = Math.floor((cx - panX) / tileSize);
      var tileZ = Math.floor((cy - panZ) / tileSize);
      if (tileX >= 0 && tileX < MAP_W && tileZ >= 0 && tileZ < MAP_H) {
        teleportCallback(tileX, tileZ);
        closeFullMap();
      }
    }
  }, { passive: true });
}

// ========== OPEN / CLOSE FULL MAP ==========
function openFullMap() {
  if (!fullOverlay) return;
  isFullOpen = true;
  teleportMode = false;
  fullOverlay.style.display = '';

  var label = document.getElementById('teleport-label');
  if (label) { label.style.display = 'none'; label.textContent = ''; }

  // Size the canvas
  var w = window.innerWidth;
  var h = window.innerHeight - 40;
  fullCanvas.width = w;
  fullCanvas.height = h;
  fullCtx = fullCanvas.getContext('2d');

  // Center the map
  var scale = Math.min(w, h) / Math.max(MAP_W, MAP_H) * 0.9;
  fullZoom = scale * Math.max(MAP_W, MAP_H) / Math.min(w, h);
  panX = (w - MAP_W * scale) / 2;
  panZ = (h - MAP_H * scale) / 2;
}

function closeFullMap() {
  if (!fullOverlay) return;
  isFullOpen = false;
  teleportMode = false;
  fullOverlay.style.display = 'none';
  if (fullCanvas) fullCanvas.style.cursor = 'grab';
}

// ========== UPDATE (called each frame) ==========
var lastPlayerTileX = -1, lastPlayerTileZ = -1;

export function updateMinimap(px, pz, remotes) {
  if (!miniCtx || !mapTexture) return;

  // --- Small minimap ---
  miniCtx.imageSmoothingEnabled = false;

  // Draw the static map texture scaled to minimap size
  miniCtx.drawImage(mapTexture, 0, 0, MINI_SIZE, MINI_SIZE);

  // Draw remote players (blue dots)
  miniCtx.fillStyle = '#4090FF';
  if (remotes) {
    for (var pid in remotes) {
      var rs = remotes[pid].state;
      var rx = rs.x * MINI_SCALE;
      var rz = rs.z * MINI_SCALE;
      miniCtx.fillRect(rx - 1, rz - 1, 3, 3);
    }
  }

  // Draw local player (red dot, slightly larger)
  var ppx = px * MINI_SCALE;
  var ppz = pz * MINI_SCALE;
  miniCtx.fillStyle = '#FF3030';
  miniCtx.fillRect(ppx - 2, ppz - 2, 4, 4);
  // White border for visibility
  miniCtx.strokeStyle = '#fff';
  miniCtx.lineWidth = 0.5;
  miniCtx.strokeRect(ppx - 2, ppz - 2, 4, 4);

  // --- Full map (if open) ---
  if (isFullOpen && fullCtx) {
    var cw = fullCanvas.width;
    var ch = fullCanvas.height;

    fullCtx.fillStyle = '#111';
    fullCtx.fillRect(0, 0, cw, ch);

    // Calculate tile size based on zoom
    var tileSize = fullZoom * Math.min(cw, ch) / Math.max(MAP_W, MAP_H);

    // Draw map
    fullCtx.imageSmoothingEnabled = tileSize < 3;
    fullCtx.drawImage(mapTexture, panX, panZ, MAP_W * tileSize, MAP_H * tileSize);

    // Grid lines at high zoom
    if (tileSize >= 8) {
      fullCtx.strokeStyle = 'rgba(255,255,255,0.08)';
      fullCtx.lineWidth = 0.5;
      var startX = Math.max(0, Math.floor(-panX / tileSize));
      var endX = Math.min(MAP_W, Math.ceil((cw - panX) / tileSize));
      var startZ = Math.max(0, Math.floor(-panZ / tileSize));
      var endZ = Math.min(MAP_H, Math.ceil((ch - panZ) / tileSize));
      for (var gx = startX; gx <= endX; gx++) {
        var sx = panX + gx * tileSize;
        fullCtx.beginPath(); fullCtx.moveTo(sx, 0); fullCtx.lineTo(sx, ch); fullCtx.stroke();
      }
      for (var gz = startZ; gz <= endZ; gz++) {
        var sy = panZ + gz * tileSize;
        fullCtx.beginPath(); fullCtx.moveTo(0, sy); fullCtx.lineTo(cw, sy); fullCtx.stroke();
      }
    }

    // Draw remote players
    if (remotes) {
      fullCtx.fillStyle = '#4090FF';
      for (var pid2 in remotes) {
        var rs2 = remotes[pid2].state;
        var frx = panX + rs2.x * tileSize;
        var frz = panZ + rs2.z * tileSize;
        var dotSize = Math.max(4, tileSize * 0.6);
        fullCtx.beginPath();
        fullCtx.arc(frx + tileSize * 0.5, frz + tileSize * 0.5, dotSize / 2, 0, Math.PI * 2);
        fullCtx.fill();
      }
    }

    // Draw local player
    var fpx = panX + px * tileSize;
    var fpz = panZ + pz * tileSize;
    var playerDotSize = Math.max(6, tileSize * 0.8);
    fullCtx.fillStyle = '#FF3030';
    fullCtx.beginPath();
    fullCtx.arc(fpx + tileSize * 0.5, fpz + tileSize * 0.5, playerDotSize / 2, 0, Math.PI * 2);
    fullCtx.fill();
    fullCtx.strokeStyle = '#fff';
    fullCtx.lineWidth = 1.5;
    fullCtx.stroke();

    // Zone labels
    fullCtx.textAlign = 'center';
    fullCtx.textBaseline = 'middle';
    for (var li = 0; li < ZONE_LABELS.length; li++) {
      var zl = ZONE_LABELS[li];
      var lx = panX + zl.x * tileSize + tileSize * 0.5;
      var lz = panZ + zl.z * tileSize + tileSize * 0.5;
      // Only draw if visible on screen
      if (lx > -100 && lx < cw + 100 && lz > -50 && lz < ch + 50) {
        var fontSize = Math.max(zl.size, Math.round(tileSize * zl.size / 8));
        fontSize = Math.min(fontSize, 28);
        fullCtx.font = 'bold ' + fontSize + 'px system-ui';
        fullCtx.fillStyle = 'rgba(0,0,0,0.5)';
        fullCtx.fillText(zl.name, lx + 1, lz + 1);
        fullCtx.fillStyle = zl.color;
        fullCtx.fillText(zl.name, lx, lz);
      }
    }

    // Legend (bottom-left)
    var lgX = 16, lgY = ch - LEGEND_ITEMS.length * 20 - 12;
    fullCtx.fillStyle = 'rgba(0,0,0,0.55)';
    fullCtx.beginPath();
    fullCtx.roundRect(lgX - 8, lgY - 8, 100, LEGEND_ITEMS.length * 20 + 16, 6);
    fullCtx.fill();
    fullCtx.font = '11px system-ui';
    fullCtx.textAlign = 'left';
    fullCtx.textBaseline = 'middle';
    for (var gi = 0; gi < LEGEND_ITEMS.length; gi++) {
      var item = LEGEND_ITEMS[gi];
      var iy = lgY + gi * 20 + 4;
      fullCtx.fillStyle = item.color;
      fullCtx.fillRect(lgX, iy - 5, 12, 12);
      fullCtx.strokeStyle = 'rgba(255,255,255,0.3)';
      fullCtx.lineWidth = 0.5;
      fullCtx.strokeRect(lgX, iy - 5, 12, 12);
      fullCtx.fillStyle = '#ddd';
      fullCtx.fillText(item.label, lgX + 18, iy + 1);
    }

    // Coordinate display at cursor (if teleport mode)
    if (teleportMode) {
      fullCtx.fillStyle = 'rgba(255,0,0,0.15)';
      fullCtx.fillRect(0, 0, cw, ch);
    }
  }
}

export function isFullMapOpen() {
  return isFullOpen;
}
