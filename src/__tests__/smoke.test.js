import { describe, it, expect } from 'vitest';

describe('smoke tests - modules s importent sans erreur', () => {
  it('data/map.js exporte les constantes attendues', async () => {
    var mod = await import('../data/map.js');
    expect(mod.MAP).toBeDefined();
    expect(mod.MAP_W).toBeTypeOf('number');
    expect(mod.MAP_H).toBeTypeOf('number');
    expect(mod.MOVE_SPEED).toBeTypeOf('number');
    expect(mod.isBlocked).toBeTypeOf('function');
  });

  it('network/sync.js exporte syncPosition', async () => {
    var mod = await import('../network/sync.js');
    expect(mod.syncPosition).toBeTypeOf('function');
  });

  it('network/save.js exporte saveGame et setupAutoSave', async () => {
    var mod = await import('../network/save.js');
    expect(mod.saveGame).toBeTypeOf('function');
    expect(mod.setupAutoSave).toBeTypeOf('function');
  });

  it('network/firebase.js exporte initFirebase et firebaseError', async () => {
    var mod = await import('../network/firebase.js');
    expect(mod.initFirebase).toBeTypeOf('function');
    expect(mod.firebaseError).toBeTypeOf('function');
  });

  it('firebaseError retourne des messages en francais', async () => {
    var { firebaseError } = await import('../network/firebase.js');
    expect(firebaseError('auth/email-already-in-use')).toContain('email');
    expect(firebaseError('auth/wrong-password')).toContain('incorrect');
    expect(firebaseError('auth/user-not-found')).toContain('compte');
    expect(firebaseError('unknown-code')).toContain('Erreur');
  });
});
