import { describe, it, expect } from 'vitest';
import { isBlocked, MAP, MAP_W, MAP_H, G, P, W, T, H, R, D, F, S, B, L, N, TG, SD, RK, LV } from '../data/map.js';

describe('isBlocked', function() {
  it('positions hors limites sont bloquees', function() {
    expect(isBlocked(-1, 0)).toBe(true);
    expect(isBlocked(0, -1)).toBe(true);
    expect(isBlocked(MAP_W, 0)).toBe(true);
    expect(isBlocked(0, MAP_H)).toBe(true);
    expect(isBlocked(-5, -5)).toBe(true);
    expect(isBlocked(500, 500)).toBe(true);
  });

  it('les chemins (P) ne sont pas bloques', function() {
    // Main street Bourg-Aurore at z=60
    expect(MAP[60][77]).toBe(P);
    expect(isBlocked(77, 60)).toBe(false);
    expect(MAP[60][82]).toBe(P);
    expect(isBlocked(82, 60)).toBe(false);
  });

  it('l herbe (G) n est pas bloquee', function() {
    expect(MAP[53][71]).toBe(G);
    expect(isBlocked(71, 53)).toBe(false);
  });

  it('les arbres (T) sont bloques', function() {
    expect(MAP[2][42]).toBe(T);
    expect(isBlocked(42, 2)).toBe(true);
  });

  it('l eau (W) est bloquee', function() {
    expect(MAP[110][70]).toBe(W);
    expect(isBlocked(70, 110)).toBe(true);
  });

  it('les murs de maison (H) sont bloques', function() {
    expect(MAP[56][73]).toBe(H);
    expect(isBlocked(73, 56)).toBe(true);
  });

  it('les toits (R) sont bloques', function() {
    expect(MAP[55][73]).toBe(R);
    expect(isBlocked(73, 55)).toBe(true);
  });

  it('les portes (D) ne sont pas bloquees', function() {
    expect(MAP[56][74]).toBe(D);
    expect(isBlocked(74, 56)).toBe(false);
  });

  it('les fleurs (F) ne sont pas bloquees', function() {
    expect(MAP[58][76]).toBe(F);
    expect(isBlocked(76, 58)).toBe(false);
  });

  it('les panneaux (S) sont bloques', function() {
    expect(MAP[52][80]).toBe(S);
    expect(isBlocked(80, 52)).toBe(true);
  });

  it('les bancs (B) sont bloques', function() {
    expect(MAP[60][76]).toBe(B);
    expect(isBlocked(76, 60)).toBe(true);
  });

  it('les lampadaires (L) sont bloques', function() {
    expect(MAP[59][78]).toBe(L);
    expect(isBlocked(78, 59)).toBe(true);
  });

  it('les clotures (N) sont bloquees', function() {
    expect(MAP[52][75]).toBe(N);
    expect(isBlocked(75, 52)).toBe(true);
  });

  it('les hautes herbes (TG) ne sont pas bloquees', function() {
    expect(MAP[2][40]).toBe(TG);
    expect(isBlocked(40, 2)).toBe(false);
  });

  it('le sable (SD) n est pas bloque', function() {
    expect(MAP[60][182]).toBe(SD);
    expect(isBlocked(182, 60)).toBe(false);
  });

  it('les rochers (RK) sont bloques', function() {
    expect(MAP[5][5]).toBe(RK);
    expect(isBlocked(5, 5)).toBe(true);
  });

  it('la lave (LV) est bloquee', function() {
    expect(MAP[20][25]).toBe(LV);
    expect(isBlocked(25, 20)).toBe(true);
  });
});
