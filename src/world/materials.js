import * as THREE from 'three';
import { TILE } from '../data/map.js';

// ===================== MATERIALS =====================
export var mGrass = new THREE.MeshStandardMaterial({ color: 0x5DB858, roughness: 0.9 });
export var mGrassD = new THREE.MeshStandardMaterial({ color: 0x4DA848, roughness: 0.9 });
export var mPath = new THREE.MeshStandardMaterial({ color: 0xD8C898, roughness: 0.95 });
export var mWater = new THREE.MeshStandardMaterial({ color: 0x3A8AD8, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.82 });
export var mTrunk = new THREE.MeshStandardMaterial({ color: 0x6B4830, roughness: 0.85 });
export var mLeaf = new THREE.MeshStandardMaterial({ color: 0x2E8B40, roughness: 0.65 });
export var mLeafL = new THREE.MeshStandardMaterial({ color: 0x48B848, roughness: 0.65 });
export var mWall = new THREE.MeshStandardMaterial({ color: 0xF0E8D8, roughness: 0.7 });
export var mRoof = new THREE.MeshStandardMaterial({ color: 0xC84848, roughness: 0.55 });
export var mDoor = new THREE.MeshStandardMaterial({ color: 0x8B6840, roughness: 0.75 });
export var mDoorF = new THREE.MeshStandardMaterial({ color: 0x5A3820, roughness: 0.8 });
export var mGlass = new THREE.MeshStandardMaterial({ color: 0x88CCFF, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.65 });
export var mKnob = new THREE.MeshStandardMaterial({ color: 0xF0D030, roughness: 0.15, metalness: 0.85 });
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

// ===================== SHARED GEOS =====================
export var tileGeo = new THREE.BoxGeometry(TILE, 0.12, TILE);
export var waterGeo = new THREE.BoxGeometry(TILE, 0.05, TILE);
