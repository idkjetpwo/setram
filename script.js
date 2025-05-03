// Firebase-Konfiguration (ersetze das mit deinen Daten aus der Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyDcpRUmUWiQoS_UBt71fLVCiVX7AgADofQ",
  authDomain: "setram-abe73.firebaseapp.com",
  databaseURL: "https://setram-abe73-default-rtdb.firebaseio.com",
  projectId: "setram-abe73",
  storageBucket: "setram-abe73.firebasestorage.app",
  messagingSenderId: "612633884731",
  appId: "1:612633884731:web:dda5b787caa1a8e74cc41e",
  measurementId: "G-VC7FK0FSGV"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Globale Variablen
let aktuellerBenutzer = null;
let ausgewaehlterFreund = null;

// Prüfen, ob ein Benutzer angemeldet ist
auth.onAuthStateChanged(benutzer => {
    if (benutzer) {
        aktuellerBenutzer = benutzer.uid;
        document.getElementById('login-bereich').style.display = 'none';
        document.getElementById('haupt-bereich').style.display = 'flex';
        freundeLaden();
    } else {
        aktuellerBenutzer = null;
        document.getElementById('login-bereich').style.display = 'block';
        document.getElementById('haupt-bereich').style.display = 'none';
    }
});

// Anmelden
function anmelden() {
    const benutzername = document.getElementById('username').value;
    const passwort = document.getElementById('password').value;
    const email = `${benutzername}@setram.com`;
    auth.signInWithEmailAndPassword(email, passwort).catch(fehler => alert(fehler.message));
}

// Registrieren
function registrieren() {
    const benutzername = document.getElementById('username').value;
    const passwort = document.getElementById('password').value;
    const email = `${benutzername}@setram.com`;
    auth.createUserWithEmailAndPassword(email, passwort)
        .then(benutzerDaten => {
            const benutzer = benutzerDaten.user;
            db.collection('users').doc(benutzer.uid).set({
                username: benutzername,
                friends: [],
                blocked: []
            });
        })
        .catch(fehler => alert(fehler.message));
}

// Abmelden
function abmelden() {
    auth.signOut();
}

// Freund hinzufügen
function freundHinzufuegen() {
    const freundBenutzername = document.getElementById('freund-username').value;
    db.collection('users')
        .where('username', '==', freundBenutzername)
        .get()
        .then(abfrage => {
            if (!abfrage.empty) {
                const freundId = abfrage.docs[0].id;
                db.collection('users').doc(aktuellerBenutzer).update({
                    friends: firebase.firestore.FieldValue.arrayUnion(freundId)
                });
            } else {
                alert('Benutzer nicht gefunden!');
            }
        });
}

// Freunde laden und anzeigen
function freundeLaden() {
    db.collection('users').doc(aktuellerBenutzer).onSnapshot(dokument => {
        const freunde = dokument.data().friends || [];
        const freundeListe = document.getElementById('freunde-liste');
        freundeListe.innerHTML = '';
        freunde.forEach(freundId => {
            db.collection('users').doc(freundId).get().then(freundDokument => {
                const freundBenutzername = freundDokument.data().username;
                const freundDiv = document.createElement('div');
                freundDiv.innerHTML = `
                    ${freundBenutzername}
                    <button onclick="freundAuswaehlen('${freundId}')">Chat</button>
                    <button onclick="freundEntfernen('${freundId}')">Entfernen</button>
                    <button onclick="freundBlockieren('${freundId}')">Blockieren</button>
                `;
                freundeListe.appendChild(freundDiv);
            });
        });
    });
}

// Freund auswählen, um zu chatten
function freundAuswaehlen(freundId) {
    ausgewaehlterFreund = freundId;
    nachrichtenLaden();
}

// Freund entfernen
function freundEntfernen(freundId) {
    db.collection('users').doc(aktuellerBenutzer).update({
        friends: firebase.firestore.FieldValue.arrayRemove(freundId)
    });
}

// Freund blockieren
function freundBlockieren(freundId) {
    db.collection('users').doc(aktuellerBenutzer).update({
        friends: firebase.firestore.FieldValue.arrayRemove(freundId),
        blocked: firebase.firestore.FieldValue.arrayUnion(freundId)
    });
}

// Nachricht senden
function nachrichtSenden() {
    if (!ausgewaehlterFreund) {
        alert('Wähle einen Freund zum Chatten aus!');
        return;
    }
    const nachricht = document.getElementById('chat-eingabe').value;
    if (nachricht.trim() === '') return;
    const zeitstempel = new Date().toLocaleTimeString();
    db.collection('messages').add({
        senderId: aktuellerBenutzer,
        receiverId: ausgewaehlterFreund,
        message: nachricht,
        timestamp: zeitstempel
    });
    document.getElementById('chat-eingabe').value = '';
}

// Nachrichten in Echtzeit laden
function nachrichtenLaden() {
    if (!ausgewaehlterFreund) return;
    const chatNachrichten = document.getElementById('chat-nachrichten');
    chatNachrichten.innerHTML = '';
    db.collection('messages')
        .where('senderId', 'in', [aktuellerBenutzer, ausgewaehlterFreund])
        .where('receiverId', 'in', [aktuellerBenutzer, ausgewaehlterFreund])
        .orderBy('timestamp')
        .onSnapshot(abfrage => {
            chatNachrichten.innerHTML = '';
            abfrage.forEach(dokument => {
                const daten = dokument.data();
                const nachrichtDiv = document.createElement('div');
                nachrichtDiv.textContent = `${daten.senderId === aktuellerBenutzer ? 'Du' : 'Freund'} (${daten.timestamp}): ${daten.message}`;
                chatNachrichten.appendChild(nachrichtDiv);
                chatNachrichten.scrollTop = chatNachrichten.scrollHeight;
            });
        });
}