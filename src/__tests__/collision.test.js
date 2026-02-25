import { describe, it, expect } from 'vitest';
import { isBlocked, MAP_W, MAP_H, G, P, T, W, H, R } from '../data/map.js';

describe('isBlocked', () => {
  it('positions hors limites sont bloquees', () => {
    expect(isBlocked(-1, 0)).toBe(true);
    expect(isBlocked(0, -1)).toBe(true);
    expect(isBlocked(MAP_W, 0)).toBe(true);
    expect(isBlocked(0, MAP_H)).toBe(true);
    expect(isBlocked(-5, -5)).toBe(true);
    expect(isBlocked(100, 100)).toBe(true);
  });

  it('les chemins (P) ne sont pas bloques', () => {
    // Row 6 is all paths
    expect(isBlocked(0, 6)).toBe(false);
    expect(isBlocked(7, 6)).toBe(false);
    expect(isBlocked(13, 6)).toBe(false);
  });

  it('l herbe (G) n est pas bloquee', () => {
    // (3, 0) is G in row 0
    expect(isBlocked(3, 0)).toBe(false);
    expect(isBlocked(1, 1)).toBe(false);
  });

  it('les arbres (T) sont bloques', () => {
    expect(isBlocked(0, 0)).toBe(true);
    expect(isBlocked(1, 0)).toBe(true);
  });

  it('l eau (W) est bloquee', () => {
    expect(isBlocked(5, 7)).toBe(true);
    expect(isBlocked(6, 7)).toBe(true);
  });

  it('les murs de maison (H) sont bloques', () => {
    expect(isBlocked(2, 3)).toBe(true);
    expect(isBlocked(3, 3)).toBe(true);
  });

  it('les toits (R) sont bloques', () => {
    expect(isBlocked(2, 2)).toBe(true);
    expect(isBlocked(8, 2)).toBe(true);
  });

  it('les portes (D) ne sont pas bloquees', () => {
    expect(isBlocked(3, 4)).toBe(false);
    expect(isBlocked(9, 4)).toBe(false);
  });

  it('les fleurs (F) ne sont pas bloquees', () => {
    expect(isBlocked(4, 1)).toBe(false);
    expect(isBlocked(6, 5)).toBe(false);
  });
});
