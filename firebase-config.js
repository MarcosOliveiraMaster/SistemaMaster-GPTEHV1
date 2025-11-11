// firebase-config.js - Configuração Corrigida e Otimizada

/**
 * CONFIGURAÇÃO FIREBASE & GROQ
 * Arquivo de configuração centralizado para inicialização segura
 */

// Verificar se Firebase já foi carregado para evitar conflitos
if (typeof firebase === 'undefined') {
    console.error('Firebase SDK não carregado. Verifique se os scripts do Firebase estão incluídos no HTML.');
} else {
    console.log('Firebase SDK detectado, procedendo com a configuração...');
}

// Configuração do Firebase - ÚNICA DECLARAÇÃO
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

// Sistema de inicialização segura do Firebase
let db = null;
let firebaseApp = null;

try {
    // Verificar se o Firebase já foi inicializado
    if (!firebase.apps.length) {
        // Inicializar Firebase se não houver apps
        firebaseApp = firebase.initializeApp(firebaseConfig);
        console.log('🔥 Firebase inicializado com sucesso!');
    } else {
        // Usar app existente
        firebaseApp = firebase.app();
        console.log('🔥 Firebase app existente recuperado:', firebaseApp.name);
    }
    
    // Inicializar Firestore
    db = firebase.firestore();
    
    // Configurações opcionais do Firestore para desenvolvimento
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🔧 Modo desenvolvimento: Firestore conectado localmente');
        // db.settings({
        //     host: 'localhost:8080',
        //     ssl: false
        // });
    }
    
    console.log('📡 Firestore inicializado e pronto para uso');
    
} catch (error) {
    console.error('❌ Erro crítico ao inicializar Firebase:', error);
    
    // Fornecer feedback mais detalhado sobre o erro
    if (error.code === 'app/duplicate-app') {
        console.warn('⚠️ Firebase já foi inicializado anteriormente');
    } else if (error.code === 'app/no-app') {
        console.error('⚠️ Nenhuma app Firebase foi inicializada');
    } else {
        console.error('⚠️ Erro desconhecido do Firebase:', error.message);
    }
}

// Configuração GROQ - ÚNICA DECLARAÇÃO
const GROQ_API_KEY = "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";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Validação das configurações
console.group('🔍 Validação de Configurações');
console.log('✅ Firebase Config:', firebaseConfig ? 'Presente' : 'Faltando');
console.log('✅ Firebase DB:', db ? 'Inicializado' : 'Não inicializado');
console.log('✅ GROQ API Key:', GROQ_API_KEY ? 'Presente' : 'Faltando');
console.log('✅ GROQ API URL:', GROQ_API_URL);
console.groupEnd();

// Exportar para uso global (se necessário)
if (typeof window !== 'undefined') {
    window.firebaseConfig = firebaseConfig;
    window.db = db;
    window.GROQ_API_KEY = GROQ_API_KEY;
    window.GROQ_API_URL = GROQ_API_URL;
}

// Funções auxiliares para verificação de estado
const FirebaseHelper = {
    // Verificar se Firebase está pronto
    isReady: function() {
        return db !== null && typeof db === 'object';
    },
    
    // Verificar se uma coleção existe (função auxiliar)
    checkCollection: async function(collectionName) {
        if (!this.isReady()) {
            console.error('Firebase não está inicializado');
            return false;
        }
        
        try {
            const snapshot = await db.collection(collectionName).limit(1).get();
            return !snapshot.empty;
        } catch (error) {
            console.error(`Erro ao verificar coleção ${collectionName}:`, error);
            return false;
        }
    },
    
    // Obter estatísticas das coleções
    getCollectionStats: async function() {
        if (!this.isReady()) return null;
        
        const collections = ['cadastroClientes', 'candidatos', 'dataBaseProfessores'];
        const stats = {};
        
        for (const collection of collections) {
            try {
                const snapshot = await db.collection(collection).get();
                stats[collection] = {
                    count: snapshot.size,
                    status: 'disponível'
                };
            } catch (error) {
                stats[collection] = {
                    count: 0,
                    status: 'erro: ' + error.message
                };
            }
        }
        
        return stats;
    }
};

// Adicionar helper ao escopo global para debugging
if (typeof window !== 'undefined') {
    window.FirebaseHelper = FirebaseHelper;
}

console.log('🎉 Configuração Firebase e GROQ carregada com sucesso!');

/**
 * INSTRUÇÕES DE USO:
 * 
 * 1. Este arquivo deve ser carregado APÓS os SDKs do Firebase no HTML
 * 2. Use `db` para acessar o Firestore em outros arquivos
 * 3. Use `GROQ_API_KEY` e `GROQ_API_URL` para chamadas à API GROQ
 * 4. Verifique o estado com `FirebaseHelper.isReady()` antes de operações críticas
 * 
 * Exemplo de uso:
 * 
 * if (FirebaseHelper.isReady()) {
 *     const snapshot = await db.collection('cadastroClientes').get();
 * } else {
 *     console.error('Firebase não está disponível');
 * }
 */