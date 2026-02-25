import { describe, it, expect } from 'vitest';
import { isBlocked, MAP_W, MAP_H, G, P, T, W, H, R, S, B, L, N, TG } from '../data/map.js';

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
    // Row 14 has path tiles from x=14 to x=33
    expect(isBlocked(19, 14)).toBe(false);
    expect(isBlocked(20, 14)).toBe(false);
    expect(isBlocked(4, 3)).toBe(false);
  });

  it('l herbe (G) n est pas bloquee', () => {
    expect(isBlocked(8, 8)).toBe(false);
    expect(isBlocked(2, 1)).toBe(false);
  });

  it('les arbres (T) sont bloques', () => {
    expect(isBlocked(0, 0)).toBe(true);
    expect(isBlocked(39, 14)).toBe(true);
  });

  it('l eau (W) est bloquee', () => {
    expect(isBlocked(7, 24)).toBe(true);
    expect(isBlocked(6, 22)).toBe(true);
  });

  it('les murs de maison (H) sont bloques', () => {
    expect(isBlocked(14, 12)).toBe(true);
    expect(isBlocked(16, 12)).toBe(true);
  });

  it('les toits (R) sont bloques', () => {
    expect(isBlocked(14, 11)).toBe(true);
    expect(isBlocked(22, 11)).toBe(true);
  });

  it('les portes (D) ne sont pas bloquees', () => {
    expect(isBlocked(15, 12)).toBe(false);
    expect(isBlocked(24, 12)).toBe(false);
  });

  it('les fleurs (F) ne sont pas bloquees', () => {
    expect(isBlocked(15, 13)).toBe(false);
    expect(isBlocked(18, 16)).toBe(false);
  });

  it('les panneaux (S) sont bloques', () => {
    expect(isBlocked(20, 10)).toBe(true);
    expect(isBlocked(3, 9)).toBe(true);
  });

  it('les bancs (B) sont bloques', () => {
    expect(isBlocked(17, 15)).toBe(true);
    expect(isBlocked(21, 15)).toBe(true);
  });

  it('les lampadaires (L) sont bloques', () => {
    expect(isBlocked(13, 14)).toBe(true);
    expect(isBlocked(22, 25)).toBe(true);
  });

  it('les clotures (N) sont bloquees', () => {
    expect(isBlocked(6, 9)).toBe(true);
    expect(isBlocked(13, 20)).toBe(true);
  });

  it('les hautes herbes (TG) ne sont pas bloquees', () => {
    expect(isBlocked(6, 5)).toBe(false);
    expect(isBlocked(33, 10)).toBe(false);
    expect(isBlocked(15, 23)).toBe(false);
  });
});
