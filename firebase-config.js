// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDPPbSA8SB-L_giAhWIqGbPGSMRBDTPi40",
    authDomain: "master-ecossistemaprofessor.firebaseapp.com",
    databaseURL: "https://master-ecossistemaprofessor-default-rtdb.firebaseio.com",
    projectId: "master-ecossistemaprofessor",
    storageBucket: "master-ecossistemaprofessor.firebasestorage.app",
    messagingSenderId: "532224860209",
    appId: "1:532224860209:web:686657b6fae13b937cf510",
    measurementId: "G-B0KMX4E67D"
};

// Inicializar Firebase e tornar db global
let db;
try {
    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log('Firebase inicializado com sucesso!');
} catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
}

// Configuração GROQ - Voltando para API tradicional
const GROQ_API_KEY = "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";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";