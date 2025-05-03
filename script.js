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
let aktuellerBenutzername = null;

// Prüfen, ob ein Benutzer angemeldet ist
auth.onAuthStateChanged(benutzer => {
    if (benutzer) {
        aktuellerBenutzer = benutzer.uid;
        db.collection('users').doc(aktuellerBenutzer).get().then(dokument => {
            aktuellerBenutzername = dokument.data().username;
            document.getElementById('profil-username').textContent = aktuellerBenutzername;
            document.getElementById('login-bereich').style.display = 'none';
            document.getElementById('haupt-bereich').style.display = 'flex';
            freundeLaden();
        });
    } else {
        aktuellerBenutzer = null;
        aktuellerBenutzername = null;
        document.getElementById('login-bereich').style.display = 'block';
        document.getElementById('haupt-bereich').style.display = 'none';
        document.getElementById('profil-username').textContent = '';
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

    db.collection('users')
        .where('username', '==', benutzername)
        .get()
        .then(abfrage => {
            if (!abfrage.empty) {
                alert('Dieser Benutzername ist schon vergeben! Wähle einen anderen.');
                return;
            }

            auth.createUserWithEmailAndPassword(email, passwort)
                .then(benutzerDaten => {
                    const benutzer = benutzerDaten.user;
                    db.collection('users').doc(benutzer.uid).set({
                        username: benutzername,
                        friends: [],
                        blocked: []
                    }).then(() => {
                        document.getElementById('username').value = '';
                        document.getElementById('password').value = '';
                        alert('Registrierung erfolgreich! Bitte melde dich an.');
                    });
                })
                .catch(fehler => alert(fehler.message));
        });
}

// Abmelden
function abmelden() {
    auth.signOut();
}

// Freund hinzufügen
function freundHinzufuegen() {
    const freundBenutzername = document.getElementById('freund-username').value.trim();
    if (freundBenutzername === '') {
        alert('Bitte gib einen Benutzernamen ein!');
        return;
    }

    db.collection('users')
        .where('username', '==', freundBenutzername)
        .get()
        .then(abfrage => {
            if (abfrage.empty) {
                alert('Benutzer nicht gefunden! Überprüfe den Benutzernamen.');
                return;
            }

            const freundId = abfrage.docs[0].id;
            if (freundId === aktuellerBenutzer) {
                alert('Du kannst dich nicht selbst als Freund hinzufügen!');
                return;
            }

            db.collection('users').doc(aktuellerBenutzer).update({
                friends: firebase.firestore.FieldValue.arrayUnion(freundId)
            }).then(() => {
                document.getElementById('freund-username').value = '';
            });
        })
        .catch(fehler => {
            console.error('Fehler beim Hinzufügen des Freundes:', fehler);
            alert('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
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
                if (freundDokument.exists) {
                    const freundBenutzername = freundDokument.data().username;
                    const freundDiv = document.createElement('div');
                    freundDiv.innerHTML = `
                        <i class="fas fa-user"></i> ${freundBenutzername}
                        <button onclick="freundAuswaehlen('${freundId}')"><i class="fas fa-comment"></i> Chat</button>
                        <button onclick="freundEntfernen('${freundId}')"><i class="fas fa-trash"></i> Entfernen</button>
                        <button onclick="freundBlockieren('${freundId}')"><i class="fas fa-ban"></i> Blockieren</button>
                    `;
                    freundeListe.appendChild(freundDiv);
                }
            });
        });
        blockierteLaden();
    });
}

// Blockierte Benutzer laden
function blockierteLaden() {
    db.collection('users').doc(aktuellerBenutzer).onSnapshot(dokument => {
        const blockierte = dokument.data().blocked || [];
        const blockierteListe = document.getElementById('blockierte-liste');
        blockierteListe.innerHTML = '';
        blockierte.forEach(blockierterId => {
            db.collection('users').doc(blockierterId).get().then(blockierterDokument => {
                if (blockierterDokument.exists) {
                    const blockierterBenutzername = blockierterDokument.data().username;
                    const blockierterDiv = document.createElement('div');
                    blockierterDiv.innerHTML = `
                        <i class="fas fa-user-slash"></i> ${blockierterBenutzername}
                        <button onclick="freundEntblockieren('${blockierterId}')"><i class="fas fa-unlock"></i> Entblockieren</button>
                    `;
                    blockierteListe.appendChild(blockierterDiv);
                }
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

// Freund entblockieren
function freundEntblockieren(blockierterId) {
    db.collection('users').doc(aktuellerBenutzer).update({
        blocked: firebase.firestore.FieldValue.arrayRemove(blockierterId)
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
