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

  // Mobile touch controls
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    setupTouchControls(keys);
  }

  return keys;
}

function setupTouchControls(keys) {
  // Create joystick container
  var pad = document.createElement('div');
  pad.id = 'touch-pad';
  pad.style.cssText = 'position:fixed;bottom:30px;left:30px;width:120px;height:120px;' +
    'border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);' +
    'touch-action:none;z-index:1000;display:flex;align-items:center;justify-content:center;';

  // Inner knob
  var knob = document.createElement('div');
  knob.style.cssText = 'width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.4);' +
    'pointer-events:none;transition:transform 0.08s;';
  pad.appendChild(knob);
  document.body.appendChild(pad);

  var padRect = null;
  var centerX = 0;
  var centerY = 0;
  var radius = 60;
  var deadZone = 15;
  var activeTouch = null;

  function updateRect() {
    padRect = pad.getBoundingClientRect();
    centerX = padRect.left + padRect.width / 2;
    centerY = padRect.top + padRect.height / 2;
  }

  function clearKeys() {
    keys['ArrowUp'] = false;
    keys['ArrowDown'] = false;
    keys['ArrowLeft'] = false;
    keys['ArrowRight'] = false;
  }

  function handleMove(tx, ty) {
    var dx = tx - centerX;
    var dy = ty - centerY;
    var dist = Math.sqrt(dx * dx + dy * dy);

    // Clamp knob visual
    var clamp = Math.min(dist, radius * 0.6);
    var angle = Math.atan2(dy, dx);
    knob.style.transform = 'translate(' + (Math.cos(angle) * clamp) + 'px,' + (Math.sin(angle) * clamp) + 'px)';

    clearKeys();
    if (dist > deadZone) {
      // 4-directional: pick dominant axis
      if (Math.abs(dx) > Math.abs(dy)) {
        keys[dx < 0 ? 'ArrowLeft' : 'ArrowRight'] = true;
      } else {
        keys[dy < 0 ? 'ArrowUp' : 'ArrowDown'] = true;
      }
    }
  }

  pad.addEventListener('touchstart', function(e) {
    e.preventDefault();
    updateRect();
    activeTouch = e.changedTouches[0].identifier;
    handleMove(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  }, { passive: false });

  window.addEventListener('touchmove', function(e) {
    if (activeTouch === null) return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouch) {
        handleMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  }, { passive: true });

  window.addEventListener('touchend', function(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouch) {
        activeTouch = null;
        clearKeys();
        knob.style.transform = 'translate(0,0)';
        break;
      }
    }
  });
}
