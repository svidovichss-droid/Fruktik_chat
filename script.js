// Конфигурация API Mistral
const API_KEY = '030Ujp7uvKCtTdrO8BreT1kj2vpFznGq';
const API_URL = 'https://api.mistral.ai/v1/chat/completions';

// Доступные модели Mistral
const MODELS = {
    'mistral-tiny': 'mistral-tiny',
    'mistral-small': 'mistral-small', 
    'mistral-medium': 'mistral-medium'
};

// Используем mistral-small как модель по умолчанию (она соответствует Mistral 8x7B)
const MODEL = MODELS['mistral-small'];

// Переменные состояния
let chats = [];
let currentChatId = null;
let isSending = false;
const MAX_CHATS = 10;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    createFruitRain();
    document.getElementById('messageInput').focus();
    
    // Загружаем чаты из локального хранилища
    loadChats();
    
    // Обновляем фруктовый дождь каждые 10 секунд
    setInterval(createFruitRain, 10000);
    
    // Обработчики событий
    document.getElementById('messageInput').addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
    
    document.getElementById('newChatButton').addEventListener('click', function() {
        createNewChat();
    });
    
    document.getElementById('menuButton').addEventListener('click', function() {
        openSidebar();
    });
    
    document.getElementById('closeSidebar').addEventListener('click', function() {
        closeSidebar();
    });
    
    document.getElementById('sidebarOverlay').addEventListener('click', function() {
        closeSidebar();
    });
    
    document.getElementById('sendButton').addEventListener('click', function() {
        sendMessage();
    });
    
    // Предотвращаем закрытие боковой панели при клике внутри нее
    document.getElementById('chatsSidebar').addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // Автофокус на поле ввода при клике в любом месте чата
    document.querySelector('.chat-container').addEventListener('click', function() {
        document.getElementById('messageInput').focus();
    });
    
    // Обработка свайпов для мобильных устройств
    let startX = 0;
    document.querySelector('.chat-container').addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
    });
    
    document.querySelector('.chat-container').addEventListener('touchend', function(e) {
        const endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;
        
        // Если свайп вправо более 50px, открываем боковую панель
        if (diffX < -50) {
            openSidebar();
        }
        
        // Если свайп влево более 50px, закрываем боковую панель
        if (diffX > 50) {
            closeSidebar();
        }
    });
});

// Функции для работы с боковой панелью
function openSidebar() {
    document.getElementById('chatsSidebar').classList.add('active');
    document.getElementById('sidebarOverlay').classList.add('active');
    renderChatsList();
}

function closeSidebar() {
    document.getElementById('chatsSidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

// Функции для работы с чатами
function loadChats() {
    const savedChats = localStorage.getItem('fruitChats');
    if (savedChats) {
        chats = JSON.parse(savedChats);
        
        if (chats.length > 0) {
            // Загружаем последний активный чат
            currentChatId = chats[chats.length - 1].id;
            loadChat(currentChatId);
        } else {
            // Создаем первый чат, если нет сохраненных
            createNewChat();
        }
    } else {
        // Создаем первый чат
        createNewChat();
    }
}

function saveChats() {
    // Ограничиваем количество чатов
    if (chats.length > MAX_CHATS) {
        chats = chats.slice(chats.length - MAX_CHATS);
    }
    
    localStorage.setItem('fruitChats', JSON.stringify(chats));
}

function createNewChat() {
    const newChat = {
        id: Date.now().toString(),
        title: 'Новый чат',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    chats.push(newChat);
    currentChatId = newChat.id;
    saveChats();
    renderChat();
    renderChatsList();
    closeSidebar();
    document.getElementById('messageInput').focus();
    showStatus('Новый чат создан!', 'success');
}

function loadChat(chatId) {
    currentChatId = chatId;
    renderChat();
    closeSidebar();
    document.getElementById('messageInput').focus();
}

function deleteChat(chatId, event) {
    if (event) event.stopPropagation();
    
    if (chats.length <= 1) {
        showStatus('Нельзя удалить единственный чат!', 'error');
        return;
    }
    
    if (confirm('Вы уверены, что хотите удалить этот чат?')) {
        chats = chats.filter(chat => chat.id !== chatId);
        
        if (currentChatId === chatId) {
            // Переключаемся на другой чат
            currentChatId = chats.length > 0 ? chats[0].id : null;
        }
        
        saveChats();
        renderChat();
        renderChatsList();
        showStatus('Чат удален!', 'success');
    }
}

function updateChatTitle(chatId, newTitle) {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
        chat.title = newTitle;
        chat.updatedAt = new Date().toISOString();
        saveChats();
        renderChatsList();
    }
}

function renderChatsList() {
    const chatsList = document.getElementById('chatsList');
    chatsList.innerHTML = '';
    
    if (chats.length === 0) {
        chatsList.innerHTML = '<p class="text-center text-gray-500 py-4">Нет сохраненных чатов</p>';
        return;
    }
    
    // Сортируем чаты по дате обновления (новые сверху)
    const sortedChats = [...chats].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    sortedChats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        chatItem.innerHTML = `
            <div class="flex-1" onclick="loadChat('${chat.id}')">
                <div class="chat-title">${escapeHtml(chat.title)}</div>
                <div class="chat-preview">${getChatPreview(chat)}</div>
                <div class="chat-date">${formatDate(chat.updatedAt)}</div>
            </div>
            <button class="delete-chat-btn" onclick="deleteChat('${chat.id}', event)">
                <i class="fas fa-trash"></i>
            </button>
        `;
        chatsList.appendChild(chatItem);
    });
}

function getChatPreview(chat) {
    if (chat.messages.length === 0) return 'Пока нет сообщений';
    
    const lastMessage = chat.messages[chat.messages.length - 1];
    const content = lastMessage.content.substring(0, 30);
    return lastMessage.role === 'user' ? `Вы: ${content}...` : `Фруктик: ${content}...`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Сегодня';
    } else if (diffDays === 1) {
        return 'Вчера';
    } else if (diffDays < 7) {
        return `${diffDays} дней назад`;
    } else {
        return date.toLocaleDateString('ru-RU');
    }
}

function renderChat() {
    const chatMessages = document.getElementById('chatMessages');
    const emptyChat = document.getElementById('emptyChat');
    
    if (!currentChatId || chats.length === 0) {
        chatMessages.innerHTML = `
            <div class="empty-chat" id="emptyChat">
                <div class="empty-chat-icon">🍓</div>
                <h2 class="text-2xl font-bold mb-2">Начни новый разговор!</h2>
                <p class="text-lg">Напиши что-нибудь Фруктику, чтобы начать общение.</p>
            </div>
        `;
        return;
    }
    
    const currentChat = chats.find(chat => chat.id === currentChatId);
    if (!currentChat) return;
    
    chatMessages.innerHTML = '';
    
    if (currentChat.messages.length === 0) {
        chatMessages.innerHTML = `
            <div class="empty-chat" id="emptyChat">
                <div class="empty-chat-icon">🍓</div>
                <h2 class="text-2xl font-bold mb-2">Начни новый разговор!</h2>
                <p class="text-lg">Напиши что-нибудь Фруктику, чтобы начать общение.</p>
            </div>
        `;
        return;
    }
    
    currentChat.messages.forEach(message => {
        addMessageToChat(message.role, message.content, false);
    });
    
    scrollToBottom();
}

// Создаем фруктовый дождь
function createFruitRain() {
    const fruits = ['🍓', '🍍', '🍇', '🍉', '🍊', '🍋', '🍌', '🍎', '🍑', '🍒'];
    const rainContainer = document.getElementById('fruitRain');
    
    // Очищаем контейнер перед созданием новых фруктов
    rainContainer.innerHTML = '';
    
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            const fruit = document.createElement('div');
            fruit.className = 'fruit';
            fruit.textContent = fruits[Math.floor(Math.random() * fruits.length)];
            fruit.style.left = Math.random() * 100 + 'vw';
            fruit.style.animationDuration = (Math.random() * 5 + 3) + 's';
            fruit.style.animationDelay = Math.random() * 2 + 's';
            fruit.style.opacity = Math.random() * 0.4 + 0.2;
            fruit.style.fontSize = (Math.random() * 10 + 20) + 'px';
            rainContainer.appendChild(fruit);
            
            // Удаляем фрукт после завершения анимации
            setTimeout(() => {
                if (fruit.parentNode === rainContainer) {
                    rainContainer.removeChild(fruit);
                }
            }, parseFloat(fruit.style.animationDuration) * 1000 + 1000);
        }, i * 300);
    }
}

// Показ статусного сообщения
function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = 'status-message';
    
    if (type === 'success') {
        statusEl.classList.add('status-success');
    } else if (type === 'error') {
        statusEl.classList.add('status-error');
    }
    
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 3000);
}

function showTypingIndicator() {
    document.getElementById('typingIndicator').classList.remove('hidden');
    scrollToBottom();
}

function hideTypingIndicator() {
    document.getElementById('typingIndicator').classList.add('hidden');
}

function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);
}

// Экранирование HTML для безопасности
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function sendMessage() {
    if (isSending) return;
    
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const message = messageInput.value.trim();
    
    if (!message) {
        showStatus('Введите сообщение', 'error');
        return;
    }
    
    // Блокируем кнопку отправки
    isSending = true;
    sendButton.disabled = true;
    sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    // Убираем пустой чат, если он есть
    const emptyChat = document.getElementById('emptyChat');
    if (emptyChat) {
        emptyChat.remove();
    }
    
    // Добавляем сообщение пользователя
    addMessageToChat('user', message);
    messageInput.value = '';
    
    // Сохраняем сообщение в текущий чат
    const currentChat = chats.find(chat => chat.id === currentChatId);
    if (currentChat) {
        currentChat.messages.push({ role: 'user', content: message });
        
        // Обновляем заголовок чата, если это первое сообщение
        if (currentChat.messages.length === 1) {
            const title = message.length > 20 ? message.substring(0, 20) + '...' : message;
            updateChatTitle(currentChatId, title);
        }
        
        currentChat.updatedAt = new Date().toISOString();
        saveChats();
    }
    
    // Показываем индикатор набора
    showTypingIndicator();
    showStatus('Фруктик думает...', 'info');
    
    try {
        // УЛУЧШЕННЫЙ системный промпт для детей с акцентом на грамматику
        const messagesForAPI = [
            { 
                role: 'system', 
                content: `Ты - Фруктик, дружелюбный помощник для детей младшего школьного возраста. Твоя главная задача - помогать в учебе, соблюдая абсолютно правильную грамматику русского языка.

ОСОБЫЕ ПРАВИЛА:
1. Всегда отвечай грамотно, без ошибок - ты образец для ребенка
2. Используй простые, понятные предложения
3. Объясняй сложные тепы доступным языком
4. Будь терпеливым и поддерживающим
5. Используй 1-2 эмодзи в ответе для дружелюбия

ПРИМЕРЫ ПРАВИЛЬНЫХ ОТВЕТОВ:
"Привет! Я Фруктик 🍎 Помогу тебе с уроками. Что ты хочешь узнать?"
"Молодец, что спросил! Давай разберем эту задачу по шагам 🧩"
"Запомни: 'жи-ши' пиши с буквой 'и'. Это правило русского языка ✏️"

НИКОГДА НЕ ДЕЛАЙ:
- Не давай готовых ответов на домашние задания
- Не используй сложные термины без объяснения
- Не торопи ребенка - давай время подумать
- Не критикуй за ошибки, а мягко исправляй их` 
            },
            ...currentChat.messages.slice(-6)
        ];
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: messagesForAPI,
                max_tokens: 800,  // Уменьшили для более кратких ответов
                temperature: 0.3,  // Понизили для большей точности
                top_p: 0.9,
                stream: false
            })
        });
        
        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error?.message || errorData.error?.code || errorMessage;
            } catch (e) {
                // Если не удалось распарсить JSON с ошибкой
                const errorText = await response.text();
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Неверный формат ответа от API');
        }
        
        const aiResponse = data.choices[0].message.content;
        
        // Добавляем ответ в историю и чат
        if (currentChat) {
            currentChat.messages.push({ role: 'assistant', content: aiResponse });
            currentChat.updatedAt = new Date().toISOString();
            saveChats();
        }
        
        hideTypingIndicator();
        addMessageToChat('assistant', aiResponse);
        showStatus('Фруктик ответил!', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        hideTypingIndicator();
        
        // Более информативное сообщение об ошибке
        let errorMessage = 'Ой, что-то пошло не так! 🍇';
        if (error.message.includes('401')) {
            errorMessage = 'Ошибка авторизации. Проверьте API ключ.';
        } else if (error.message.includes('400')) {
            errorMessage = 'Неверный запрос. Возможно, проблема с форматом данных.';
        } else if (error.message.includes('429')) {
            errorMessage = 'Слишком много запросов. Попробуйте позже.';
        } else if (error.message.includes('500')) {
            errorMessage = 'Ошибка на сервере. Попробуйте позже.';
        }
        
        showStatus(errorMessage, 'error');
        addMessageToChat('assistant', `${errorMessage} 😊\n\nДетали: ${escapeHtml(error.message)}`);
    } finally {
        // Разблокируем кнопку отправки
        isSending = false;
        sendButton.disabled = false;
        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        messageInput.focus();
    }
}

function addMessageToChat(role, content, scroll = true) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    
    if (role === 'user') {
        messageDiv.className = 'flex items-start justify-end';
        messageDiv.innerHTML = `
            <div class="chat-bubble user-bubble">
                <div class="message-content">${escapeHtml(content)}</div>
            </div>
            <div class="fruit-avatar" style="background: linear-gradient(135deg, #a8edea, #fed6e3);">😊</div>
        `;
    } else {
        messageDiv.className = 'flex items-start';
        messageDiv.innerHTML = `
            <div class="fruit-avatar" style="background: linear-gradient(135deg, #ffd93d, #ff6b6b);">${getRandomFruit()}</div>
            <div class="chat-bubble bot-bubble">
                <div class="font-bold text-purple-600 mb-1">Фруктик</div>
                <div class="message-content">${content}</div>
            </div>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    if (scroll) scrollToBottom();
}

function getRandomFruit() {
    const fruits = ['🍓', '🍍', '🍇', '🍉', '🍊', '🍋', '🍌', '🍎', '🍑', '🍒'];
    return fruits[Math.floor(Math.random() * fruits.length)];
}