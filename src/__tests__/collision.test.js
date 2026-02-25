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
    expect(MAP[0][0]).toBe(T);
    expect(isBlocked(0, 0)).toBe(true);
  });

  it('l eau (W) est bloquee', function() {
    expect(MAP[80][48]).toBe(W);
    expect(isBlocked(48, 80)).toBe(true);
  });

  it('les murs de maison (H) sont bloques', function() {
    // Player house wall in new Bourg-Aurore layout
    expect(MAP[56][84]).toBe(H);
    expect(isBlocked(84, 56)).toBe(true);
  });

  it('les toits (R) sont bloques', function() {
    // Player house roof
    expect(MAP[55][84]).toBe(R);
    expect(isBlocked(84, 55)).toBe(true);
  });

  it('les portes (D) ne sont pas bloquees', function() {
    // Player house door
    expect(MAP[56][85]).toBe(D);
    expect(isBlocked(85, 56)).toBe(false);
  });

  it('les fleurs (F) ne sont pas bloquees', function() {
    // Park flower in Bourg-Aurore
    expect(MAP[48][85]).toBe(F);
    expect(isBlocked(85, 48)).toBe(false);
  });

  it('les panneaux (S) sont bloques', function() {
    // Welcome sign north of Bourg-Aurore
    expect(MAP[46][80]).toBe(S);
    expect(isBlocked(80, 46)).toBe(true);
  });

  it('les bancs (B) sont bloques', function() {
    // Bench on main street
    expect(MAP[60][75]).toBe(B);
    expect(isBlocked(75, 60)).toBe(true);
  });

  it('les lampadaires (L) sont bloques', function() {
    // Lamp post near main intersection
    expect(MAP[59][77]).toBe(L);
    expect(isBlocked(77, 59)).toBe(true);
  });

  it('les clotures (N) sont bloquees', function() {
    // Fence at north entrance of Bourg-Aurore
    expect(MAP[46][73]).toBe(N);
    expect(isBlocked(73, 46)).toBe(true);
  });

  it('les hautes herbes (TG) ne sont pas bloquees', function() {
    expect(MAP[0][48]).toBe(TG);
    expect(isBlocked(48, 0)).toBe(false);
  });

  it('le sable (SD) n est pas bloque', function() {
    expect(MAP[60][182]).toBe(SD);
    expect(isBlocked(182, 60)).toBe(false);
  });

  it('les rochers (RK) sont bloques', function() {
    expect(MAP[0][3]).toBe(RK);
    expect(isBlocked(3, 0)).toBe(true);
  });

  it('la lave (LV) est bloquee', function() {
    expect(MAP[20][23]).toBe(LV);
    expect(isBlocked(23, 20)).toBe(true);
  });
});
