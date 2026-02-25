import { describe, it, expect, vi, beforeEach } from 'vitest';

// syncPosition uses module-level variables (lastSync, lastSyncTime),
// so we re-import fresh for each test via dynamic import + vi.resetModules
describe('syncPosition', () => {
  var syncPosition;
  var mockUpdate;
  var state;

  beforeEach(async () => {
    vi.resetModules();
    var mod = await import('../network/sync.js');
    syncPosition = mod.syncPosition;

    mockUpdate = vi.fn();
    state = {
      myUid: 'user1',
      isOnline: true,
      presenceRef: { update: mockUpdate },
      playerGroup: { rotation: { y: 1.5 } },
      playerX: 5.123,
      playerZ: 8.789,
      localMoving: true,
      fb: { database: { ServerValue: { TIMESTAMP: 'TIMESTAMP' } } }
    };
  });

  it('envoie la position quand les conditions sont remplies', () => {
    syncPosition(1.0, state);
    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdate).toHaveBeenCalledWith({
      x: 5.12, z: 8.79, ry: 1.5, m: true,
      lastSeen: 'TIMESTAMP'
    });
  });

  it('n envoie rien si le joueur n est pas connecte', () => {
    state.myUid = null;
    syncPosition(1.0, state);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('n envoie rien si offline', () => {
    state.isOnline = false;
    syncPosition(1.0, state);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('n envoie rien si pas de presenceRef', () => {
    state.presenceRef = null;
    syncPosition(1.0, state);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('respecte le throttle de 100ms', () => {
    syncPosition(1.0, state);
    expect(mockUpdate).toHaveBeenCalledOnce();

    // Change position but call too soon
    state.playerX = 6.0;
    syncPosition(1.05, state);
    expect(mockUpdate).toHaveBeenCalledOnce(); // still 1

    // After 100ms
    syncPosition(1.11, state);
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it('n envoie rien si la position n a pas change', () => {
    syncPosition(1.0, state);
    expect(mockUpdate).toHaveBeenCalledOnce();

    // Same position, enough time passed
    syncPosition(2.0, state);
    expect(mockUpdate).toHaveBeenCalledOnce(); // no change = no send
  });

  it('arrondit les valeurs a 2 decimales', () => {
    state.playerX = 3.456789;
    state.playerZ = 7.891234;
    state.playerGroup.rotation.y = 2.345678;
    syncPosition(1.0, state);
    expect(mockUpdate).toHaveBeenCalledWith({
      x: 3.46, z: 7.89, ry: 2.35, m: true,
      lastSeen: 'TIMESTAMP'
    });
  });
});
