export var TILE = 1;
export var MAP_W = 14;
export var MAP_H = 12;
export var MOVE_SPEED = 3.2;

export var G = 0, P = 1, W = 2, T = 3, H = 4, R = 5, D = 6, F = 7;
export var S = 8, B = 9, L = 10, N = 11; // Sign, Bench, Lamp, Fence

export var MAP = [
  [T,T,T,G,G,G,G,G,G,G,G,T,T,T],
  [T,G,G,G,F,G,G,G,G,F,G,G,G,T],
  [G,G,R,R,R,G,G,G,R,R,R,R,G,G],
  [G,G,H,H,H,G,G,G,H,H,H,H,G,G],
  [G,G,H,D,H,G,G,G,H,D,H,H,G,G],
  [G,S,G,P,G,G,F,G,G,P,G,G,L,G],
  [P,P,P,P,P,P,P,P,P,P,P,P,P,P],
  [G,G,G,L,G,W,W,W,G,B,G,F,G,G],
  [G,F,G,G,W,W,W,W,W,G,G,G,G,G],
  [G,G,G,G,G,W,W,W,G,G,G,G,F,G],
  [N,N,F,G,G,G,G,G,G,G,F,G,N,N],
  [T,T,G,G,G,G,G,G,G,G,G,G,T,T],
];

export function isBlocked(x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true;
  var t = MAP[y][x];
  return t === T || t === H || t === R || t === W || t === S || t === B || t === L || t === N;
}
