import { firebaseError } from '../network/firebase.js';

var lobbyEl = document.getElementById('lobby');
var statusEl = document.getElementById('status');
var badge = document.getElementById('connBadge');

export function showStatus(msg, isError) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#F06878' : '#6FE080';
}

export function hideLobby() {
  lobbyEl.classList.add('hidden');
}

export function showLobby() {
  lobbyEl.classList.remove('hidden');
}

export function updateBadge(state, remotePlayers, logout) {
  if (!state.myUid) { badge.style.display = 'none'; return; }
  var count = Object.keys(remotePlayers).length;
  var label = count > 0 ? (count + 1) + ' en ligne' : 'En ligne';
  badge.innerHTML = '<span class="badge-name">' + state.myName + '</span>' +
    '<span class="badge-info">' + label + '</span>' +
    '<span class="badge-logout" id="logoutBtn">Deconnexion</span>';
  badge.className = 'on';
  badge.style.display = 'block';
  document.getElementById('logoutBtn').onclick = logout;
}

export function hideBadge() {
  badge.style.display = 'none';
}

export function setupLobbyHandlers(auth, db, state, enterWorld) {
  // Tab switching
  document.querySelectorAll('.tab').forEach(function(tab) {
    tab.onclick = function() {
      document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('tab-login').style.display = tab.dataset.tab === 'login' ? '' : 'none';
      document.getElementById('tab-register').style.display = tab.dataset.tab === 'register' ? '' : 'none';
      statusEl.textContent = '';
    };
  });

  // Login
  document.getElementById('btnLogin').onclick = async function() {
    var email = document.getElementById('loginEmail').value.trim();
    var pass = document.getElementById('loginPass').value;
    if (!email || !pass) { showStatus('Remplis tous les champs', true); return; }
    showStatus('Connexion...', false);
    state.enteringWorld = true;
    try {
      var cred = await auth.signInWithEmailAndPassword(email, pass);
      var snap = await db.ref('users/' + cred.user.uid + '/profile').once('value');
      var profile = snap.val();
      if (profile) {
        await enterWorld(cred.user.uid, profile.displayName, profile.color);
      } else {
        showStatus('Profil introuvable', true);
      }
    } catch (e) {
      showStatus(firebaseError(e.code), true);
    } finally {
      state.enteringWorld = false;
    }
  };

  // Register
  document.getElementById('btnRegister').onclick = async function() {
    var email = document.getElementById('regEmail').value.trim();
    var name = document.getElementById('regName').value.trim();
    var pass = document.getElementById('regPass').value;
    var pass2 = document.getElementById('regPass2').value;
    if (!email || !name || !pass) { showStatus('Remplis tous les champs', true); return; }
    if (pass !== pass2) { showStatus('Les mots de passe ne correspondent pas', true); return; }
    if (pass.length < 6) { showStatus('Mot de passe trop court (6 min)', true); return; }
    if (name.length < 2 || name.length > 16) { showStatus('Nom: 2-16 caracteres', true); return; }
    showStatus('Creation du compte...', false);
    state.enteringWorld = true;
    try {
      var cred = await auth.createUserWithEmailAndPassword(email, pass);
      var colorIndex = Math.floor(Math.random() * state.PLAYER_COLORS.length);
      await db.ref('users/' + cred.user.uid + '/profile').set({
        displayName: name,
        color: colorIndex,
        createdAt: state.fb.database.ServerValue.TIMESTAMP
      });
      await enterWorld(cred.user.uid, name, colorIndex);
    } catch (e) {
      showStatus(firebaseError(e.code), true);
    } finally {
      state.enteringWorld = false;
    }
  };

  // Enter key submits forms
  document.getElementById('loginPass').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('btnLogin').click();
  });
  document.getElementById('regPass2').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('btnRegister').click();
  });

  // Solo (offline)
  document.getElementById('btnSolo').onclick = function() { hideLobby(); };

  // Auto-login
  auth.onAuthStateChanged(async function(user) {
    if (user && !state.myUid && !state.enteringWorld) {
      state.enteringWorld = true;
      showStatus('Connexion automatique...', false);
      try {
        var snap = await db.ref('users/' + user.uid + '/profile').once('value');
        var profile = snap.val();
        if (profile) {
          await enterWorld(user.uid, profile.displayName, profile.color);
        }
      } catch (e) {
        console.error('Auto-login failed:', e);
        showStatus('', false);
      }
      state.enteringWorld = false;
    }
  });
}
