class ChatApp {
    constructor() {
        this.messagesContainer = document.getElementById('messages');
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.emptyState = document.getElementById('emptyState');
        this.chatContainer = document.getElementById('chatContainer');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.chatHistory = document.getElementById('chatHistory');
        
        this.currentChatId = this.generateChatId();
        this.chats = this.loadChats();
        
        this.initEventListeners();
        this.autoResizeTextarea();
        this.renderChatHistory();
        
        // Verificar se Firebase está carregado
        this.checkFirebase();
    }

    async checkFirebase() {
        // Aguardar Firebase carregar
        let attempts = 0;
        const checkDB = () => {
            if (typeof db !== 'undefined' && db) {
                console.log('Firebase DB está disponível');
                return true;
            } else if (attempts < 10) {
                attempts++;
                setTimeout(checkDB, 500);
            } else {
                console.error('Firebase DB não carregou após 5 segundos');
            }
        };
        checkDB();
    }

    generateChatId() {
        return 'chat_' + Date.now();
    }

    loadChats() {
        const saved = localStorage.getItem('gpTEH_chats');
        return saved ? JSON.parse(saved) : {};
    }

    saveChats() {
        localStorage.setItem('gpTEH_chats', JSON.stringify(this.chats));
    }

    initEventListeners() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
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

        this.newChatBtn.addEventListener('click', () => this.startNewChat());

        // Sugestões
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                this.userInput.value = chip.getAttribute('data-prompt');
                this.sendMessage();
            });
        });
    }

    updateSendButton() {
        const hasText = this.userInput.value.trim().length > 0;
        this.sendBtn.disabled = !hasText;
    }

    autoResizeTextarea() {
        this.userInput.style.height = 'auto';
        this.userInput.style.height = Math.min(this.userInput.scrollHeight, 120) + 'px';
    }

    startNewChat() {
        this.currentChatId = this.generateChatId();
        this.messagesContainer.innerHTML = '';
        this.showEmptyState();
    }

    showEmptyState() {
        this.emptyState.classList.remove('hidden');
        this.chatContainer.classList.add('hidden');
    }

    hideEmptyState() {
        this.emptyState.classList.add('hidden');
        this.chatContainer.classList.remove('hidden');
    }

    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message) return;

        // Adicionar mensagem do usuário
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
        } catch (error) {
            console.error('Erro:', error);
            this.addMessage('Desculpe, ocorreu um erro ao processar sua solicitação: ' + error.message, 'bot');
        }
        
        this.hideTypingIndicator();
        this.scrollToBottom();
    }

    async processWithGroq(userMessage) {
        console.log('Buscando dados do Firebase...');
        
        // Verificar se db está disponível
        if (typeof db === 'undefined' || !db) {
            throw new Error('Firebase não está inicializado. Aguarde e tente novamente.');
        }
        
        // Buscar dados das coleções
        const [clientes, candidatos, professores] = await Promise.all([
            this.fetchCollection('cadastroClientes'),
            this.fetchCollection('candidatos'),
            this.fetchCollection('dataBaseProfessores')
        ]);

        console.log('Dados obtidos:', { 
            clientes: clientes.length, 
            candidatos: candidatos.length, 
            professores: professores.length 
        });

        // Preparar contexto otimizado
        const contexto = this.prepareContext(clientes, candidatos, professores, userMessage);

        console.log('Enviando para GROQ...');
        
        // VOLTANDO PARA API TRADICIONAL (chat/completions)
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile", // Modelo mais compatível
                messages: [
                    {
                        role: "user",
                        content: contexto
                    }
                ],
                temperature: 0.3,
                max_tokens: 2048, // CORRETO: max_tokens em vez de max_completion_tokens
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
        console.log('Resposta GROQ:', data);
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        } else {
            throw new Error('Resposta da GROQ em formato inesperado');
        }
    }

    prepareContext(clientes, candidatos, professores, userMessage) {
        // Limitar dados para evitar exceder tokens
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

        return `Você é o gpTEH, um assistente especializado em analisar dados de professores, clientes e candidatos.

DADOS DISPONÍVEIS:

CADASTRO DE CLIENTES (Total: ${clientes.length} registros):
${JSON.stringify(sampleClientes, null, 2)}

CANDIDATOS (Total: ${candidatos.length} registros):
${JSON.stringify(sampleCandidatos, null, 2)}

PROFESSORES (Total: ${professores.length} registros):
${JSON.stringify(sampleProfessores, null, 2)}

INSTRUÇÕES CRÍTICAS:
1. Responda APENAS com base nos dados fornecidos acima
2. Se a informação não estiver nos dados, diga claramente "Não encontrei essa informação nos dados disponíveis"
3. Seja direto, objetivo e útil
4. Formate respostas de forma clara e organizada
5. Use markdown básico para melhor legibilidade
6. Não invente informações sob nenhuma circunstância

PERGUNTA DO USUÁRIO: ${userMessage}

RESPONDA COM BASE NOS DADOS ACIMA:`;
    }

    async fetchCollection(collectionName) {
        try {
            if (typeof db === 'undefined' || !db) {
                throw new Error('Firebase DB não está disponível');
            }
            
            const snapshot = await db.collection(collectionName).get();
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`Coleção ${collectionName}:`, data.length, 'registros');
            return data;
        } catch (error) {
            console.error(`Erro ao buscar ${collectionName}:`, error);
            // Retornar dados de exemplo para teste
            return this.getSampleData(collectionName);
        }
    }

    getSampleData(collectionName) {
        // Dados de exemplo para teste enquanto Firebase carrega
        const samples = {
            cadastroClientes: [
                { nome: "Cliente Exemplo 1", email: "cliente1@exemplo.com", status: "ativo" },
                { nome: "Cliente Exemplo 2", email: "cliente2@exemplo.com", status: "inativo" }
            ],
            candidatos: [
                { nome: "Candidato Exemplo 1", area: "TI", experiencia: "Júnior" },
                { nome: "Candidato Exemplo 2", area: "Educação", experiencia: "Sênior" }
            ],
            dataBaseProfessores: [
                { nome: "Professor Exemplo 1", disciplina: "Matemática", nivel: "Superior" },
                { nome: "Professor Exemplo 2", disciplina: "Português", nivel: "Médio" }
            ]
        };
        return samples[collectionName] || [];
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${sender === 'user' ? 'M' : 'G'}</div>
            <div class="message-content">
                <div class="message-text">${this.formatMessage(content)}</div>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(content) {
        // Converter markdown básico e quebras de linha
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
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
        
        this.messagesContainer.innerHTML = '';
        chat.messages.forEach(msg => {
            this.addMessage(msg.content, msg.role);
        });
        
        this.hideEmptyState();
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    showTypingIndicator() {
        this.typingIndicator.classList.remove('hidden');
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.typingIndicator.classList.add('hidden');
    }
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});