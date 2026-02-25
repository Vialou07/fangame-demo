var lastSync = { x: 0, z: 0, ry: 0, m: false };
var lastSyncTime = 0;

export function syncPosition(time, state) {
  if (!state.myUid || !state.isOnline || !state.presenceRef) return;
  if (time - lastSyncTime < 0.1) return;

  var ry = state.playerGroup.rotation.y;
  var m = state.localMoving;
  var sx = Math.round(state.playerX * 100) / 100;
  var sz = Math.round(state.playerZ * 100) / 100;
  var sry = Math.round(ry * 100) / 100;

  if (sx === lastSync.x && sz === lastSync.z && sry === lastSync.ry && m === lastSync.m) return;

  lastSyncTime = time;
  lastSync = { x: sx, z: sz, ry: sry, m: m };

  state.presenceRef.update({
    x: sx, z: sz, ry: sry, m: m,
    lastSeen: state.fb.database.ServerValue.TIMESTAMP
  });
}
