import { createPlayer, PLAYER_COLORS } from './factory.js';

export var remotePlayers = {};
var nametagContainer = document.getElementById('nametags');

export function getOrCreateRemote(scene, pid, colorIndex) {
  if (!remotePlayers[pid]) {
    var c = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
    var p = createPlayer(c, c);
    p.group.position.set(6, 0, 6);
    scene.add(p.group);
    var tag = document.createElement('div');
    tag.className = 'nametag';
    nametagContainer.appendChild(tag);
    remotePlayers[pid] = { player: p, state: { x: 6, z: 6, ry: 0, m: false }, name: '', tag: tag };
  }
  return remotePlayers[pid];
}

export function removeRemote(scene, pid) {
  if (remotePlayers[pid]) {
    scene.remove(remotePlayers[pid].player.group);
    if (remotePlayers[pid].tag) remotePlayers[pid].tag.remove();
    delete remotePlayers[pid];
  }
}
