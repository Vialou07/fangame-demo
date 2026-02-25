import * as THREE from 'three';
import { TILE } from '../data/map.js';

// ===================== MATERIALS (Pokemon Gen 3/4 palette) =====================
export var mGrass = new THREE.MeshStandardMaterial({ color: 0x58C060, roughness: 0.85 });
export var mGrassD = new THREE.MeshStandardMaterial({ color: 0x48A850, roughness: 0.85 });
export var mPath = new THREE.MeshStandardMaterial({ color: 0xE0CFA0, roughness: 0.9 });
export var mWater = new THREE.MeshStandardMaterial({ color: 0x4098E0, roughness: 0.03, metalness: 0.25, transparent: true, opacity: 0.85 });
export var mTrunk = new THREE.MeshStandardMaterial({ color: 0x7A5235, roughness: 0.85 });
export var mLeaf = new THREE.MeshStandardMaterial({ color: 0x30A048, roughness: 0.6 });
export var mLeafL = new THREE.MeshStandardMaterial({ color: 0x50C858, roughness: 0.6 });
export var mWall = new THREE.MeshStandardMaterial({ color: 0xF5F0E0, roughness: 0.65 });
export var mRoof = new THREE.MeshStandardMaterial({ color: 0xD04040, roughness: 0.5 });
export var mDoor = new THREE.MeshStandardMaterial({ color: 0x9B7040, roughness: 0.7 });
export var mDoorF = new THREE.MeshStandardMaterial({ color: 0x603818, roughness: 0.75 });
export var mGlass = new THREE.MeshStandardMaterial({ color: 0x90D8FF, roughness: 0.03, metalness: 0.35, transparent: true, opacity: 0.6 });
export var mKnob = new THREE.MeshStandardMaterial({ color: 0xF8D830, roughness: 0.12, metalness: 0.9 });
export var mStem = new THREE.MeshStandardMaterial({ color: 0x3D8838, roughness: 0.8 });
export var mFCenter = new THREE.MeshStandardMaterial({ color: 0xFFF8D0, roughness: 0.4, emissive: 0xFFF8D0, emissiveIntensity: 0.12 });
export var mFlowers = [
  new THREE.MeshStandardMaterial({ color: 0xF06878, roughness: 0.5 }),
  new THREE.MeshStandardMaterial({ color: 0xF8E040, roughness: 0.5 }),
  new THREE.MeshStandardMaterial({ color: 0x78A8F0, roughness: 0.5 }),
  new THREE.MeshStandardMaterial({ color: 0xFF88BB, roughness: 0.5 }),
];
export var mStone = new THREE.MeshStandardMaterial({ color: 0x999, roughness: 0.85 });

// Tree variants
export var mLeafDark = new THREE.MeshStandardMaterial({ color: 0x1E6B30, roughness: 0.7 });
export var mPine = new THREE.MeshStandardMaterial({ color: 0x2A7A3A, roughness: 0.7 });
export var mPineD = new THREE.MeshStandardMaterial({ color: 0x1C5A28, roughness: 0.75 });
export var mBush = new THREE.MeshStandardMaterial({ color: 0x3A9848, roughness: 0.6 });
export var mBushD = new THREE.MeshStandardMaterial({ color: 0x2D7838, roughness: 0.65 });

// Building details
export var mFoundation = new THREE.MeshStandardMaterial({ color: 0x6B6B6B, roughness: 0.9 });
export var mShutter = new THREE.MeshStandardMaterial({ color: 0x3A6B8A, roughness: 0.7 });
export var mChimney = new THREE.MeshStandardMaterial({ color: 0x8B4444, roughness: 0.8 });
export var mAwning = new THREE.MeshStandardMaterial({ color: 0x7B3B2A, roughness: 0.65 });
export var mStep = new THREE.MeshStandardMaterial({ color: 0xC8B898, roughness: 0.85 });

// Props
export var mSign = new THREE.MeshStandardMaterial({ color: 0xC8A868, roughness: 0.8 });
export var mSignPost = new THREE.MeshStandardMaterial({ color: 0x6B4830, roughness: 0.85 });
export var mBench = new THREE.MeshStandardMaterial({ color: 0x8B6840, roughness: 0.75 });
export var mBenchLeg = new THREE.MeshStandardMaterial({ color: 0x4A4A4A, roughness: 0.7, metalness: 0.3 });
export var mLamp = new THREE.MeshStandardMaterial({ color: 0x3A3A3A, roughness: 0.5, metalness: 0.5 });
export var mLampLight = new THREE.MeshStandardMaterial({ color: 0xFFF8D0, roughness: 0.2, emissive: 0xFFF0A0, emissiveIntensity: 0.5 });
export var mFenceWood = new THREE.MeshStandardMaterial({ color: 0x9B7848, roughness: 0.8 });

// Water details
export var mSand = new THREE.MeshStandardMaterial({ color: 0xD8C898, roughness: 0.9 });
export var mReed = new THREE.MeshStandardMaterial({ color: 0x4A8838, roughness: 0.75 });
export var mLilyPad = new THREE.MeshStandardMaterial({ color: 0x2E7830, roughness: 0.6, side: THREE.DoubleSide });
export var mLilyFlower = new THREE.MeshStandardMaterial({ color: 0xF0A0B8, roughness: 0.4 });

// ===================== SHARED GEOS =====================
export var tileGeo = new THREE.BoxGeometry(TILE, 0.12, TILE);
export var waterGeo = new THREE.BoxGeometry(TILE, 0.05, TILE);

// Instanced geometries (shared across all chunks)
export var bladeGeo = new THREE.ConeGeometry(0.018, 0.15, 4);
export var tallBladeGeo = new THREE.ConeGeometry(0.03, 0.35, 4);
export var pebbleGeo = new THREE.SphereGeometry(0.05, 6, 4);
export var petalGeo = new THREE.SphereGeometry(0.03, 5, 3);
export var stemGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.12, 4);
export var centerGeo = new THREE.SphereGeometry(0.02, 5, 3);
