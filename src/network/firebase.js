import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';

export function initFirebase() {
  firebase.initializeApp({
    apiKey: "AIzaSyDCpaLs-HjZFEUqnaLPYvtiug1-6wvO0m0",
    authDomain: "fangame-demo.firebaseapp.com",
    databaseURL: "https://fangame-demo-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "fangame-demo",
    storageBucket: "fangame-demo.firebasestorage.app",
    messagingSenderId: "824308900575",
    appId: "1:824308900575:web:28eb2ab2afd2b18ec8ff6a"
  });

  return {
    fb: firebase,
    auth: firebase.auth(),
    db: firebase.database()
  };
}

export function firebaseError(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'Cet email est deja utilise';
    case 'auth/invalid-email': return 'Email invalide';
    case 'auth/wrong-password': return 'Mot de passe incorrect';
    case 'auth/user-not-found': return 'Aucun compte avec cet email';
    case 'auth/weak-password': return 'Mot de passe trop faible (6+ caracteres)';
    case 'auth/too-many-requests': return 'Trop de tentatives, reessaie plus tard';
    case 'auth/invalid-credential': return 'Email ou mot de passe incorrect';
    default: return 'Erreur: ' + code;
  }
}
