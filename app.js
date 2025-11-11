// Configurações globais
const GROQ_API_KEY = "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";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Firebase configuration
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDPPbSA8SB-L_giAhWIqGbPGSMRBDTPi40",
    authDomain: "master-ecossistemaprofessor.firebaseapp.com",
    databaseURL: "https://master-ecossistemaprofessor-default-rtdb.firebaseio.com",
    projectId: "master-ecossistemaprofessor",
    storageBucket: "master-ecossistemaprofessor.firebasestorage.app",
    messagingSenderId: "532224860209",
    appId: "1:532224860209:web:686657b6fae13b937cf510",
    measurementId: "G-B0KMX4E67D"
};

class ChatApp {
    constructor() {
        this.firebaseInitialized = false;
        this.db = null;
        
        this.initializeElements();
        this.currentChatId = this.generateChatId();
        this.chats = this.loadChats();
        
        // Contador de requests
        this.dailyRequests = this.loadDailyRequests();
        this.MAX_DAILY_REQUESTS = 5000;
        
        // Inicializar Firebase primeiro
        this.initializeFirebase().then(() => {
            console.log('Firebase inicializado, iniciando aplicação...');
            this.initEventListeners();
            this.autoResizeTextarea();
            this.renderChatHistory();
            this.updateRequestDisplay();
            
            // Inicialmente esconder a barra de requests
            if (this.requestContainer) {
                this.requestContainer.style.display = 'none';
            }
            
            // Inicializar o botão corretamente
            this.updateSendButton();
        }).catch(error => {
            console.error('Erro ao inicializar Firebase:', error);
            // Continuar mesmo sem Firebase, usando dados de exemplo
            this.initEventListeners();
            this.autoResizeTextarea();
            this.renderChatHistory();
            this.updateRequestDisplay();
            this.updateSendButton();
        });
    }

    async initializeFirebase() {
        return new Promise((resolve, reject) => {
            try {
                // Verificar se Firebase já foi inicializado
                if (this.firebaseInitialized && this.db) {
                    resolve();
                    return;
                }

                // Verificar se Firebase está disponível
                if (typeof firebase === 'undefined') {
                    reject(new Error('Firebase não carregado'));
                    return;
                }

                // Tentar obter app existente ou inicializar novo
                let app;
                try {
                    app = firebase.app();
                    console.log('Firebase App já inicializado:', app.name);
                } catch (e) {
                    console.log('Inicializando novo Firebase App...');
                    app = firebase.initializeApp(FIREBASE_CONFIG);
                }

                this.db = firebase.firestore();
                this.firebaseInitialized = true;
                
                console.log('Firebase inicializado com sucesso!');
                resolve();
                
            } catch (error) {
                console.error('Erro na inicialização do Firebase:', error);
                reject(error);
            }
        });
    }

    initializeElements() {
        // Elementos principais
        this.messagesContainer = document.getElementById('messages');
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.emptyState = document.getElementById('emptyState');
        this.chatContainer = document.getElementById('chatContainer');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.chatHistory = document.getElementById('chatHistory');
        
        // Elementos da barra de requests
        this.requestContainer = document.getElementById('requestContainer');
        this.requestCount = document.getElementById('requestCount');
        this.requestPercent = document.getElementById('requestPercent');
        this.requestProgress = document.getElementById('requestProgress');
        
        this.validateElements();
    }

    validateElements() {
        const elements = {
            messagesContainer: this.messagesContainer,
            userInput: this.userInput,
            sendBtn: this.sendBtn,
            emptyState: this.emptyState,
            chatContainer: this.chatContainer
        };

        for (const [name, element] of Object.entries(elements)) {
            if (!element) {
                console.warn(`Elemento não encontrado: ${name}`);
            }
        }
    }

    // Sistema de Gerenciamento de Requests
    loadDailyRequests() {
        const today = new Date().toDateString();
        const stored = localStorage.getItem('groq_daily_requests');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (data.date === today) {
                    return data.requests;
                }
            } catch (e) {
                console.error('Erro ao carregar requests:', e);
            }
        }
        return 0;
    }

    saveDailyRequests() {
        const today = new Date().toDateString();
        const data = {
            date: today,
            requests: this.dailyRequests
        };
        localStorage.setItem('groq_daily_requests', JSON.stringify(data));
    }

    addRequest() {
        this.dailyRequests++;
        this.saveDailyRequests();
        this.updateRequestDisplay();
    }

    updateRequestDisplay() {
        if (!this.requestCount || !this.requestPercent || !this.requestProgress) {
            return;
        }

        const percent = (this.dailyRequests / this.MAX_DAILY_REQUESTS) * 100;
        const formattedRequests = this.dailyRequests.toLocaleString();
        
        this.requestCount.textContent = `${formattedRequests}/${this.MAX_DAILY_REQUESTS.toLocaleString()}`;
        this.requestPercent.textContent = `(${Math.min(100, Math.round(percent))}%)`;
        this.requestProgress.style.width = `${Math.min(100, percent)}%`;
        
        if (this.requestContainer) {
            if (percent > 80) {
                this.requestContainer.classList.add('request-warning');
            } else {
                this.requestContainer.classList.remove('request-warning');
            }
        }
    }

    showRequestBar() {
        if (this.requestContainer) {
            this.requestContainer.style.display = 'flex';
            this.requestContainer.style.animation = 'slideInDown 0.5s ease-out';
        }
    }

    hideRequestBar() {
        if (this.requestContainer) {
            this.requestContainer.style.display = 'none';
        }
    }

    generateChatId() {
        return 'chat_' + Date.now();
    }

    loadChats() {
        const saved = localStorage.getItem('gpTEH_chats');
        try {
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Erro ao carregar chats:', e);
            return {};
        }
    }

    saveChats() {
        try {
            localStorage.setItem('gpTEH_chats', JSON.stringify(this.chats));
        } catch (e) {
            console.error('Erro ao salvar chats:', e);
        }
    }

    initEventListeners() {
        if (this.sendBtn) {
            this.sendBtn.addEventListener('click', () => this.sendMessage());
        }
        
        if (this.userInput) {
            this.userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            this.userInput.addEventListener('input', () => {
                this.autoResizeTextarea();
                this.updateSendButton();
            });

            this.updateSendButton();
        }

        if (this.newChatBtn) {
            this.newChatBtn.addEventListener('click', () => this.startNewChat());
        }

        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                if (this.userInput) {
                    this.userInput.value = chip.getAttribute('data-prompt');
                    this.autoResizeTextarea();
                    this.updateSendButton();
                    this.sendMessage();
                }
            });
        });
    }

    updateSendButton() {
        if (this.sendBtn && this.userInput) {
            const hasText = this.userInput.value.trim().length > 0;
            this.sendBtn.disabled = !hasText;
            
            if (hasText) {
                this.sendBtn.style.opacity = '1';
                this.sendBtn.style.cursor = 'pointer';
            } else {
                this.sendBtn.style.opacity = '0.6';
                this.sendBtn.style.cursor = 'not-allowed';
            }
        }
    }

    autoResizeTextarea() {
        if (this.userInput) {
            this.userInput.style.height = 'auto';
            this.userInput.style.height = Math.min(this.userInput.scrollHeight, 120) + 'px';
        }
    }

    startNewChat() {
        this.currentChatId = this.generateChatId();
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = '';
        }
        this.showEmptyState();
        this.hideRequestBar();
        
        if (this.userInput) {
            this.userInput.value = '';
            this.updateSendButton();
        }
    }

    showEmptyState() {
        if (this.emptyState && this.chatContainer) {
            this.emptyState.classList.remove('hidden');
            this.chatContainer.classList.add('hidden');
        }
    }

    hideEmptyState() {
        if (this.emptyState && this.chatContainer) {
            this.emptyState.classList.add('hidden');
            this.chatContainer.classList.remove('hidden');
        }
    }

    async sendMessage() {
        if (!this.userInput) return;
        
        const message = this.userInput.value.trim();
        if (!message) return;

        if (this.dailyRequests >= this.MAX_DAILY_REQUESTS) {
            this.addMessage('🚫 Limite diário de requests atingido! Volte amanhã para continuar usando o gpTEH.', 'bot');
            return;
        }

        if (this.messagesContainer && this.messagesContainer.children.length === 0) {
            this.showRequestBar();
        }

        this.addMessage(message, 'user');
        this.userInput.value = '';
        this.autoResizeTextarea();
        this.updateSendButton();
        
        this.hideEmptyState();
        this.showTypingIndicator();
        
        try {
            const response = await this.processWithGroq(message);
            this.addMessage(response, 'bot');
            this.saveChat(message, response);
            this.addRequest();
        } catch (error) {
            console.error('Erro:', error);
            this.addMessage(`😕 Oops! Encontrei um problema: ${error.message}`, 'bot');
        }
        
        this.hideTypingIndicator();
        this.scrollToBottom();
    }

    async processWithGroq(userMessage) {
        console.log('Buscando dados do Firebase...');
        
        // Garantir que Firebase está inicializado
        if (!this.firebaseInitialized || !this.db) {
            console.log('Firebase não inicializado, usando dados de exemplo...');
            // Usar dados de exemplo se Firebase não estiver disponível
            const clientes = this.getSampleData('cadastroClientes');
            const candidatos = this.getSampleData('candidatos');
            const professores = this.getSampleData('dataBaseProfessores');
            
            const contexto = this.prepareContext(clientes, candidatos, professores, userMessage);
            return await this.callGroqAPI(contexto);
        }
        
        try {
            // Buscar dados reais do Firebase
            const [clientes, candidatos, professores] = await Promise.all([
                this.fetchCollection('cadastroClientes'),
                this.fetchCollection('candidatos'),
                this.fetchCollection('dataBaseProfessores')
            ]);

            console.log('Dados obtidos do Firebase:', { 
                clientes: clientes.length, 
                candidatos: candidatos.length, 
                professores: professores.length 
            });

            const contexto = this.prepareContext(clientes, candidatos, professores, userMessage);
            return await this.callGroqAPI(contexto);
            
        } catch (firebaseError) {
            console.error('Erro ao buscar dados do Firebase:', firebaseError);
            // Fallback para dados de exemplo
            console.log('Usando dados de exemplo como fallback...');
            const clientes = this.getSampleData('cadastroClientes');
            const candidatos = this.getSampleData('candidatos');
            const professores = this.getSampleData('dataBaseProfessores');
            
            const contexto = this.prepareContext(clientes, candidatos, professores, userMessage);
            return await this.callGroqAPI(contexto);
        }
    }

    async callGroqAPI(contexto) {
        console.log('Enviando para GROQ...');
        
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "user",
                        content: contexto
                    }
                ],
                temperature: 0.3,
                max_tokens: 2048,
                top_p: 1,
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro GROQ:', errorText);
            let errorMessage = `GROQ Error: ${response.status}`;
            try {
                const errorData = JSON.parse(errorText);
                errorMessage += ` - ${errorData.error?.message || errorText}`;
            } catch (e) {
                errorMessage += ` - ${errorText}`;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('Resposta GROQ recebida');
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        } else {
            throw new Error('Resposta da GROQ em formato inesperado');
        }
    }

    async fetchCollection(collectionName) {
        if (!this.db) {
            throw new Error('Firebase DB não disponível');
        }
        
        try {
            const snapshot = await this.db.collection(collectionName).get();
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`Coleção ${collectionName}:`, data.length, 'registros');
            return data;
        } catch (error) {
            console.error(`Erro ao buscar ${collectionName}:`, error);
            throw error; // Re-lançar o erro para ser tratado no método chamador
        }
    }

    getSampleData(collectionName) {
        const samples = {
            cadastroClientes: [
                { 
                    nome: "Cliente Exemplo 1", 
                    email: "cliente1@exemplo.com", 
                    status: "ativo",
                    cidadeUF: "São Paulo/SP",
                    estudantes: [
                        { nome: "Estudante 1", escola: "Escola Municipal", serie: "5º ano" }
                    ]
                },
                { 
                    nome: "Cliente Exemplo 2", 
                    email: "cliente2@exemplo.com", 
                    status: "inativo",
                    cidadeUF: "Rio de Janeiro/RJ"
                }
            ],
            candidatos: [
                { 
                    nome: "Candidato Exemplo 1", 
                    area: "TI", 
                    disciplinas: ["Matemática", "Física"],
                    status: "em análise",
                    segManha: true,
                    segTarde: false
                },
                { 
                    nome: "Candidato Exemplo 2", 
                    area: "Educação", 
                    disciplinas: ["Português", "História"],
                    status: "aprovado",
                    terManha: true,
                    terTarde: true
                }
            ],
            dataBaseProfessores: [
                { 
                    nome: "Professor Exemplo 1", 
                    disciplina: "Matemática", 
                    nivel: "Superior",
                    area: "Exatas",
                    segManha: true,
                    quaTarde: true
                },
                { 
                    nome: "Professor Exemplo 2", 
                    disciplina: "Português", 
                    nivel: "Mestrado",
                    area: "Humanas",
                    terManha: true,
                    sexTarde: true
                }
            ]
        };
        return samples[collectionName] || [];
    }

    prepareContext(clientes, candidatos, professores, userMessage) {
        const sampleClientes = clientes.slice(0, 2).map(item => {
            const { id, ...data } = item;
            return data;
        });
        
        const sampleCandidatos = candidatos.slice(0, 2).map(item => {
            const { id, ...data } = item;
            return data;
        });
        
        const sampleProfessores = professores.slice(0, 2).map(item => {
            const { id, ...data } = item;
            return data;
        });

        return `Você é o gpTEH, um assistente especializado em analisar dados de professores, clientes e candidatos. Seja SEMPRE simpático, amigável e prestativo em todas as respostas.

🎯 DADOS DISPONÍVEIS:

🏠 CLIENTES (${clientes.length} registros):
${JSON.stringify(sampleClientes, null, 2)}

📝 CANDIDATOS (${candidatos.length} registros):
${JSON.stringify(sampleCandidatos, null, 2)}

👨‍🏫 PROFESSORES (${professores.length} registros):
${JSON.stringify(sampleProfessores, null, 2)}

PERGUNTA: "${userMessage}"

RESPONDA DE FORMA AMIGÁVEL E ÚTIL:`;
    }

    addMessage(content, sender) {
        if (!this.messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatarContent = sender === 'user' 
            ? '<div class="user-avatar">M</div>' 
            : '<img src="logo1.png" alt="gpTEH" class="bot-avatar-image">';
        
        messageDiv.innerHTML = `
            <div class="message-avatar ${sender === 'bot' ? 'bot-avatar' : 'user-avatar'}">
                ${avatarContent}
            </div>
            <div class="message-content">
                <div class="message-text">${this.formatMessage(content)}</div>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(content) {
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/(😊|🎯|🏠|📝|👨‍🏫|🔍|⚠️|✨|😕|🚫)/g, '<span class="emoji">$1</span>');
    }

    saveChat(userMessage, botResponse) {
        if (!this.chats[this.currentChatId]) {
            this.chats[this.currentChatId] = {
                id: this.currentChatId,
                title: userMessage.substring(0, 30) + (userMessage.length > 30 ? '...' : ''),
                messages: [],
                createdAt: new Date().toISOString()
            };
        }
        
        this.chats[this.currentChatId].messages.push(
            { role: 'user', content: userMessage },
            { role: 'bot', content: botResponse }
        );
        
        this.saveChats();
        this.renderChatHistory();
    }

    renderChatHistory() {
        if (!this.chatHistory) return;
        
        this.chatHistory.innerHTML = '';
        
        Object.values(this.chats)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .forEach(chat => {
                const item = document.createElement('div');
                item.className = 'chat-history-item';
                item.textContent = chat.title;
                item.addEventListener('click', () => this.loadChat(chat.id));
                this.chatHistory.appendChild(item);
            });
    }

    loadChat(chatId) {
        this.currentChatId = chatId;
        const chat = this.chats[chatId];
        
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = '';
            chat.messages.forEach(msg => {
                this.addMessage(msg.content, msg.role);
            });
        }
        
        this.hideEmptyState();
        this.showRequestBar();
        this.scrollToBottom();
    }

    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    showTypingIndicator() {
        if (this.typingIndicator) {
            this.typingIndicator.classList.remove('hidden');
            this.scrollToBottom();
        }
    }

    hideTypingIndicator() {
        if (this.typingIndicator) {
            this.typingIndicator.classList.add('hidden');
        }
    }
}

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', () => {
    try {
        new ChatApp();
        console.log('gpTEH inicializado com sucesso!');
    } catch (error) {
        console.error('Erro ao inicializar gpTEH:', error);
    }
});