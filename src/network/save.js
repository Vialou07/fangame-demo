export function saveGame(state) {
  if (!state.myUid) return;
  state.db.ref('users/' + state.myUid + '/gameState').set({
    position: {
      x: Math.round(state.playerX * 100) / 100,
      z: Math.round(state.playerZ * 100) / 100,
      ry: Math.round(state.playerGroup.rotation.y * 100) / 100
    },
    lastSaved: state.fb.database.ServerValue.TIMESTAMP
  });
}

export function setupAutoSave(state, goOffline) {
  setInterval(function() { if (state.isOnline) saveGame(state); }, 60000);
  window.addEventListener('beforeunload', function() {
    if (state.isOnline) { saveGame(state); goOffline(); }
  });
}
