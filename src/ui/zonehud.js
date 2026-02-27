import { BIOME_MAP, MAP_W, MAP_H } from '../data/map.js';
import { BIOME } from '../data/biomes.js';

// Named zones with visual themes (higher priority than biome-based names)
var NAMED_ZONES = [
  { name: 'Bourg-Aurore', sub: 'Ville des Nouveaux Departs', x1: 63, z1: 46, x2: 99, z2: 78, fogColor: 0x8ED8F8, fogDensity: 0.012, skyColor: 0x8ED8F8 },
  { name: 'Port-Ciel', sub: 'Ville Portuaire', x1: 114, z1: 117, x2: 148, z2: 147, fogColor: 0x88C8F0, fogDensity: 0.013, skyColor: 0x88C8F0 },
  { name: 'Route 1', sub: 'Sentier des Premiers Pas', x1: 82, z1: 78, x2: 98, z2: 128, fogColor: 0x90D8A0, fogDensity: 0.016, skyColor: 0x90E0B0 },
  { name: 'Route 1', sub: 'Sentier des Premiers Pas', x1: 90, z1: 128, x2: 130, z2: 134, fogColor: 0x90D8A0, fogDensity: 0.016, skyColor: 0x90E0B0 },
];

// Biome-based zone names with visual themes (fallback)
var BIOME_ZONE_NAMES = {};
BIOME_ZONE_NAMES[BIOME.FOREST] = { name: 'Foret Dense', fogColor: 0x58905A, fogDensity: 0.022, skyColor: 0x6AB868 };
BIOME_ZONE_NAMES[BIOME.PLAINS] = { name: 'Plaine Sauvage', fogColor: 0x8ED8F8, fogDensity: 0.014, skyColor: 0x8ED8F8 };
BIOME_ZONE_NAMES[BIOME.LAKE] = { name: 'Lac Paisible', fogColor: 0x80C0E0, fogDensity: 0.018, skyColor: 0x80C8E8 };
BIOME_ZONE_NAMES[BIOME.MOUNTAIN] = { name: 'Mont Rocheux', fogColor: 0xA0A8B8, fogDensity: 0.018, skyColor: 0x98A8C0 };
BIOME_ZONE_NAMES[BIOME.DESERT] = { name: 'Desert Ardent', fogColor: 0xE0C890, fogDensity: 0.012, skyColor: 0xE8D8A8 };
BIOME_ZONE_NAMES[BIOME.BEACH] = { name: 'Cote Doree', fogColor: 0x90D8F8, fogDensity: 0.010, skyColor: 0x90E0F8 };
BIOME_ZONE_NAMES[BIOME.SWAMP] = { name: 'Marecage Sombre', fogColor: 0x486848, fogDensity: 0.028, skyColor: 0x506850 };
BIOME_ZONE_NAMES[BIOME.VOLCANO] = { name: 'Volcan Embrase', fogColor: 0xC06030, fogDensity: 0.024, skyColor: 0xB08060 };
BIOME_ZONE_NAMES[BIOME.CAVE_ENTRANCE] = { name: 'Entree de Grotte', fogColor: 0x404860, fogDensity: 0.030, skyColor: 0x506070 };
BIOME_ZONE_NAMES[BIOME.ROUTE] = { name: 'Route Sauvage', fogColor: 0x8ED8F8, fogDensity: 0.015, skyColor: 0x8ED8F8 };

var hudEl = null;
var nameEl = null;
var subEl = null;
var fadeEl = null;
var currentZone = '';
var fadeTimer = null;

// Current zone visual theme (exported for main.js to read for smooth transitions)
export var zoneTheme = {
  fogColor: 0x8ED8F8,
  fogDensity: 0.014,
  skyColor: 0x8ED8F8
};

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

  // Screen fade overlay for zone transitions
  fadeEl = document.createElement('div');
  fadeEl.id = 'zone-fade';
  document.body.appendChild(fadeEl);
}

export function updateZoneHUD(px, pz) {
  if (!hudEl) return;
  var tx = Math.floor(px);
  var tz = Math.floor(pz);

  var zone = getZone(tx, tz);
  var name = zone ? zone.name : '';

  // Always update theme for smooth biome transitions
  if (zone) {
    if (zone.fogColor !== undefined) zoneTheme.fogColor = zone.fogColor;
    if (zone.fogDensity !== undefined) zoneTheme.fogDensity = zone.fogDensity;
    if (zone.skyColor !== undefined) zoneTheme.skyColor = zone.skyColor;
  }

  if (name === currentZone) return;
  currentZone = name;

  if (!name) {
    hudEl.classList.remove('zone-visible');
    return;
  }

  // Trigger screen fade transition (simulates map loading)
  triggerFade();

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

function triggerFade() {
  if (!fadeEl) return;
  fadeEl.classList.add('active');
  setTimeout(function() {
    fadeEl.classList.remove('active');
  }, 350);
}

function getZone(tx, tz) {
  // Check named zones first (towns, routes)
  for (var i = 0; i < NAMED_ZONES.length; i++) {
    var z = NAMED_ZONES[i];
    if (tx >= z.x1 && tx <= z.x2 && tz >= z.z1 && tz <= z.z2) {
      return z;
    }
  }

  // Fall back to biome name + theme
  if (tx >= 0 && tx < MAP_W && tz >= 0 && tz < MAP_H) {
    var biome = BIOME_MAP[tz][tx];
    var bdata = BIOME_ZONE_NAMES[biome];
    if (bdata) return bdata;
  }

  return null;
}
