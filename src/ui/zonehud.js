import { BIOME_MAP, MAP_W, MAP_H } from '../data/map.js';
import { BIOME } from '../data/biomes.js';

// Named zones (higher priority than biome-based names)
var NAMED_ZONES = [
  { name: 'Bourg-Aurore', sub: 'Ville des Nouveaux Departs', x1: 63, z1: 46, x2: 99, z2: 78 },
  { name: 'Port-Ciel', sub: 'Ville Portuaire', x1: 114, z1: 117, x2: 148, z2: 147 },
  { name: 'Route 1', sub: 'Sentier des Premiers Pas', x1: 82, z1: 78, x2: 98, z2: 128 },
  { name: 'Route 1', sub: 'Sentier des Premiers Pas', x1: 90, z1: 128, x2: 130, z2: 134 },
];

// Biome-based zone names (fallback)
var BIOME_ZONE_NAMES = {};
BIOME_ZONE_NAMES[BIOME.FOREST] = 'Foret Dense';
BIOME_ZONE_NAMES[BIOME.PLAINS] = 'Plaine Sauvage';
BIOME_ZONE_NAMES[BIOME.LAKE] = 'Lac Paisible';
BIOME_ZONE_NAMES[BIOME.MOUNTAIN] = 'Mont Rocheux';
BIOME_ZONE_NAMES[BIOME.DESERT] = 'Desert Ardent';
BIOME_ZONE_NAMES[BIOME.BEACH] = 'Cote Doree';
BIOME_ZONE_NAMES[BIOME.SWAMP] = 'Marecage Sombre';
BIOME_ZONE_NAMES[BIOME.VOLCANO] = 'Volcan Embrase';
BIOME_ZONE_NAMES[BIOME.CAVE_ENTRANCE] = 'Entree de Grotte';
BIOME_ZONE_NAMES[BIOME.ROUTE] = 'Route Sauvage';

var hudEl = null;
var nameEl = null;
var subEl = null;
var currentZone = '';
var fadeTimer = null;

export function initZoneHUD() {
  hudEl = document.createElement('div');
  hudEl.id = 'zone-hud';

  nameEl = document.createElement('div');
  nameEl.id = 'zone-name';
  hudEl.appendChild(nameEl);

  subEl = document.createElement('div');
  subEl.id = 'zone-sub';
  hudEl.appendChild(subEl);

  document.body.appendChild(hudEl);
}

export function updateZoneHUD(px, pz) {
  if (!hudEl) return;
  var tx = Math.floor(px);
  var tz = Math.floor(pz);

  var zone = getZone(tx, tz);
  var name = zone ? zone.name : '';

  if (name === currentZone) return;
  currentZone = name;

  if (!name) {
    hudEl.classList.remove('zone-visible');
    return;
  }

  nameEl.textContent = name;
  if (zone.sub) {
    subEl.textContent = zone.sub;
    subEl.style.display = '';
  } else {
    subEl.style.display = 'none';
  }

  hudEl.classList.remove('zone-visible');
  void hudEl.offsetWidth; // force reflow for re-trigger
  hudEl.classList.add('zone-visible');

  clearTimeout(fadeTimer);
  fadeTimer = setTimeout(function() {
    hudEl.classList.remove('zone-visible');
  }, 3500);
}

function getZone(tx, tz) {
  // Check named zones first (towns, routes)
  for (var i = 0; i < NAMED_ZONES.length; i++) {
    var z = NAMED_ZONES[i];
    if (tx >= z.x1 && tx <= z.x2 && tz >= z.z1 && tz <= z.z2) {
      return z;
    }
  }

  // Fall back to biome name
  if (tx >= 0 && tx < MAP_W && tz >= 0 && tz < MAP_H) {
    var biome = BIOME_MAP[tz][tx];
    var bname = BIOME_ZONE_NAMES[biome];
    if (bname) return { name: bname };
  }

  return null;
}
