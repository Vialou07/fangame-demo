export function createInput() {
  var keys = {};

  window.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT') return;
    keys[e.code] = true;
    e.preventDefault();
  });

  window.addEventListener('keyup', function(e) {
    if (e.target.tagName === 'INPUT') return;
    keys[e.code] = false;
  });

  return keys;
}
