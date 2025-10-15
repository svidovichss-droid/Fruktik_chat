// script.js
// Конфигурация API Mistral - ключ теперь в отдельном файле конфигурации
const API_CONFIG = {
    url: 'https://api.mistral.ai/v1/chat/completions',
    // Ключ будет загружен из config.js
    key: null
};

// Доступные модели Mistral
const MODELS = {
    'mistral-tiny': 'mistral-tiny',
    'mistral-small': 'mistral-small', 
    'mistral-medium': 'mistral-medium'
};

// Используем mistral-small как модель по умолчанию
const MODEL = MODELS['mistral-small'];

// Переменные состояния
let chats = [];
let currentChatId = null;
let isSending = false;
const MAX_CHATS = 10;
const MAX_MESSAGE_LENGTH = 1000;

// Эмодзи для аватаров
const FRUIT_EMOJIS = ['🍓', '🍍', '🍇', '🍉', '🍊', '🍋', '🍌', '🍎', '🍑', '🍒', '🥭', '🫐', '🍐', '🥝'];

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Загружаем конфигурацию с API ключом
    await loadConfig();
    
    createFruitRain();
    
    // Загружаем чаты из локального хранилища
    loadChats();
    
    // Обновляем фруктовый дождь каждые 15 секунд
    setInterval(createFruitRain, 15000);
    
    setupEventListeners();
    setupAccessibility();
    setupEnhancedSwipeGestures();
    
    // Принудительно устанавливаем светлую тему
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.style.background = 'linear-gradient(135deg, #ffafbd 0%, #ffc3a0 100%)';
    
    // Инициализация PWA
    initializePWA();
    
    // На мобильных устройствах не фокусируемся автоматически на поле ввода
    if (!isMobileDevice()) {
        setTimeout(() => {
            document.getElementById('messageInput').focus();
        }, 500);
    }
}

// Проверка мобильного устройства
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768;
}

async function loadConfig() {
    try {
        // Пытаемся загрузить конфигурацию из внешнего файла
        const response = await fetch('config.js');
        if (response.ok) {
            // Динамически загружаем и выполняем config.js
            const script = document.createElement('script');
            script.src = 'config.js';
            script.type = 'text/javascript';
            document.head.appendChild(script);
            
            // Ждем загрузки конфигурации
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Проверяем, загрузился ли API ключ
            if (typeof window.API_KEYS !== 'undefined' && window.API_KEYS.mistral) {
                API_CONFIG.key = window.API_KEYS.mistral;
                console.log('API ключ загружен успешно');
            } else {
                throw new Error('API ключ не найден в конфигурации');
            }
        } else {
            throw new Error('Файл конфигурации не найден');
        }
    } catch (error) {
        console.error('Ошибка загрузки конфигурации:', error);
        showStatus('Ошибка загрузки конфигурации приложения', 'error');
    }
}

function initializePWA() {
    // Проверяем, установлено ли приложение
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('Приложение запущено в PWA режиме');
    }
    
    // Обработка онлайн/офлайн статуса
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
}

function updateOnlineStatus() {
    if (navigator.onLine) {
        showStatus('Соединение восстановлено!', 'success');
    } else {
        showStatus('Отсутствует интернет-соединение', 'error');
    }
}

function setupEventListeners() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const newChatButton = document.getElementById('newChatButton');
    const menuButton = document.getElementById('menuButton');
    const closeSidebar = document.getElementById('closeSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const chatContainer = document.querySelector('.chat-container');
    
    // Обработка ввода сообщения с подсчетом символов
    messageInput.addEventListener('input', function(e) {
        handleMessageInput(e);
        updateCharacterCount();
    });
    
    messageInput.addEventListener('keypress', handleMessageKeypress);
    messageInput.addEventListener('paste', handlePaste);
    
    // На мобильных устройствах фокусируемся только при явном тапе
    if (isMobileDevice()) {
        messageInput.addEventListener('touchstart', function(e) {
            // Позволяем фокус только при прямом тапе на поле ввода
            e.stopPropagation();
        });
        
        // Предотвращаем автоматический фокус при клике на контейнер чата
        chatContainer.addEventListener('touchstart', function(e) {
            if (e.target !== messageInput && !messageInput.contains(e.target)) {
                // Снимаем фокус с поля ввода, если тап не на нем
                messageInput.blur();
            }
        });
    } else {
        // На десктопе сохраняем старое поведение
        chatContainer.addEventListener('click', function() {
            messageInput.focus();
        });
    }
    
    // Кнопки
    sendButton.addEventListener('click', sendMessage);
    newChatButton.addEventListener('click', createNewChat);
    menuButton.addEventListener('click', openSidebar);
    
    // Обработчики закрытия боковой панели
    closeSidebar.addEventListener('click', function(e) {
        closeSidebarFunction();
    });
    
    sidebarOverlay.addEventListener('click', function(e) {
        closeSidebarFunction();
    });
    
    // Закрытие боковой панели при нажатии Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSidebarFunction();
        }
    });
    
    // Предотвращение закрытия приложения при отправке сообщения
    window.addEventListener('beforeunload', function(e) {
        if (isSending) {
            e.preventDefault();
            e.returnValue = 'Сообщение отправляется. Вы уверены, что хотите уйти?';
        }
    });
}

function setupEnhancedSwipeGestures() {
    setupSwipeGestures();
    
    // Показываем подсказку о свайпе для новых пользователей
    const isFirstVisit = !localStorage.getItem('fruityChatSeenSwipeHint');
    if (isFirstVisit && window.innerWidth <= 768) {
        setTimeout(() => {
            document.querySelector('.chat-container').classList.add('swipe-hint');
            setTimeout(() => {
                document.querySelector('.chat-container').classList.remove('swipe-hint');
                localStorage.setItem('fruityChatSeenSwipeHint', 'true');
            }, 4000);
        }, 2000);
    }
}

function setupSwipeGestures() {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isSwiping = false;
    let swipeDistance = 0;
    const SWIPE_THRESHOLD = 50; // Минимальное расстояние свайпа
    const SIDEBAR_SWIPE_AREA = 20; // Область активации свайпа от края
    
    const chatContainer = document.querySelector('.chat-container');
    const sidebar = document.getElementById('chatsSidebar');
    
    // Обработка начала свайпа
    chatContainer.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        currentX = startX;
        isSwiping = true;
        swipeDistance = 0;
        
        // Сбрасываем трансформации
        sidebar.style.transform = 'translateX(-100%)';
        sidebar.style.transition = 'none';
        sidebar.classList.add('swiping');
    });
    
    // Обработка движения при свайпе
    chatContainer.addEventListener('touchmove', function(e) {
        if (!isSwiping) return;
        
        currentX = e.touches[0].clientX;
        const diffX = currentX - startX;
        const diffY = Math.abs(e.touches[0].clientY - startY);
        
        // Проверяем, что это горизонтальный свайп (не вертикальный скролл)
        if (Math.abs(diffX) > diffY && Math.abs(diffX) > 5) {
            e.preventDefault();
            
            // Свайп только из левого края экрана
            if (startX <= SIDEBAR_SWIPE_AREA && diffX > 0) {
                swipeDistance = Math.min(diffX, window.innerWidth * 0.8);
                
                // Плавное открытие боковой панели при свайпе
                const progress = swipeDistance / (window.innerWidth * 0.8);
                sidebar.style.transform = `translateX(${-100 + (progress * 100)}%)`;
                sidebar.style.opacity = progress;
                
                // Затемнение оверлея
                const overlay = document.getElementById('sidebarOverlay');
                overlay.style.display = 'block';
                overlay.style.opacity = progress * 0.5;
            }
        }
    });
    
    // Обработка окончания свайпа
    chatContainer.addEventListener('touchend', function(e) {
        if (!isSwiping) return;
        isSwiping = false;
        sidebar.classList.remove('swiping');
        
        // Восстанавливаем анимацию
        sidebar.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        
        const diffX = currentX - startX;
        
        // Если свайп достаточно длинный, открываем панель
        if (swipeDistance > SWIPE_THRESHOLD && diffX > 0) {
            openSidebar();
        } else {
            // Иначе закрываем
            closeSidebarFunction();
        }
    });
}

function setupAccessibility() {
    // Добавляем ARIA атрибуты для улучшения доступности
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    
    messageInput.setAttribute('aria-label', 'Введите ваше сообщение');
    sendButton.setAttribute('aria-label', 'Отправить сообщение');
    
    // Управление с клавиатуры
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            messageInput.focus();
        }
    });
}

function handleMessageInput(e) {
    const messageInput = document.getElementById('messageInput');
    
    // Автоматическое увеличение высоты текстового поля
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
    
    // Обновление состояния кнопки отправки
    const sendButton = document.getElementById('sendButton');
    const hasText = messageInput.value.trim().length > 0;
    const isValidLength = messageInput.value.length <= MAX_MESSAGE_LENGTH;
    
    sendButton.disabled = !hasText || !isValidLength || isSending;
}

function updateCharacterCount() {
    const messageInput = document.getElementById('messageInput');
    const characterCount = document.getElementById('characterCount');
    const currentLength = messageInput.value.length;
    
    characterCount.textContent = `${currentLength}/${MAX_MESSAGE_LENGTH}`;
    
    if (currentLength > MAX_MESSAGE_LENGTH * 0.9) {
        characterCount.classList.add('warning');
    } else {
        characterCount.classList.remove('warning');
    }
}

function handleMessageKeypress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function handlePaste(e) {
    // Обработка вставки текста с автоматической обрезкой
    setTimeout(() => {
        const messageInput = document.getElementById('messageInput');
        if (messageInput.value.length > MAX_MESSAGE_LENGTH) {
            messageInput.value = messageInput.value.substring(0, MAX_MESSAGE_LENGTH);
            showStatus(`Сообщение обрезано до ${MAX_MESSAGE_LENGTH} символов`, 'warning');
        }
        updateCharacterCount();
        handleMessageInput();
    }, 0);
}

async function sendMessage() {
    if (isSending) return;
    
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    if (message.length > MAX_MESSAGE_LENGTH) {
        showStatus(`Сообщение слишком длинное (максимум ${MAX_MESSAGE_LENGTH} символов)`, 'error');
        return;
    }
    
    // Проверяем API ключ
    if (!API_CONFIG.key) {
        showStatus('API ключ не настроен. Проверьте конфигурацию.', 'error');
        return;
    }
    
    isSending = true;
    updateSendButtonState();
    
    try {
        // Создаем новый чат, если его нет
        if (!currentChatId) {
            createNewChat();
        }
        
        // Добавляем сообщение пользователя
        addMessageToChat(message, 'user');
        
        // Очищаем поле ввода
        messageInput.value = '';
        updateCharacterCount();
        handleMessageInput();
        
        // Показываем индикатор набора
        showTypingIndicator();
        
        // Получаем ответ от Mistral AI
        const response = await getMistralResponse(message);
        
        // Убираем индикатор набора
        hideTypingIndicator();
        
        // Добавляем ответ бота
        addMessageToChat(response, 'bot');
        
        // Сохраняем чаты
        saveChats();
        
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        hideTypingIndicator();
        
        let errorMessage = 'Произошла ошибка при отправке сообщения';
        if (error.message.includes('API key')) {
            errorMessage = 'Ошибка API ключа. Проверьте конфигурацию.';
        } else if (error.message.includes('network') || error.message.includes('Network')) {
            errorMessage = 'Ошибка сети. Проверьте подключение к интернету.';
        } else if (error.message.includes('rate limit')) {
            errorMessage = 'Превышен лимит запросов. Попробуйте позже.';
        }
        
        showStatus(errorMessage, 'error');
        addMessageToChat(errorMessage, 'bot');
    } finally {
        isSending = false;
        updateSendButtonState();
    }
}

async function getMistralResponse(userMessage) {
    const currentChat = chats.find(chat => chat.id === currentChatId);
    if (!currentChat) throw new Error('Чат не найден');
    
    // Формируем историю сообщений для контекста
    const messages = currentChat.messages
        .filter(msg => msg.content && msg.content.trim())
        .slice(-10) // Берем последние 10 сообщений для контекста
        .map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));
    
    // Добавляем текущее сообщение пользователя
    messages.push({
        role: 'user',
        content: userMessage
    });
    
    const requestBody = {
        model: MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
        stream: false
    };
    
    const response = await fetch(API_CONFIG.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.key}`
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
            const errorData = JSON.parse(errorText);
            if (errorData.error && errorData.error.message) {
                errorMessage = errorData.error.message;
            }
        } catch (e) {
            errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content.trim();
    } else {
        throw new Error('Неверный формат ответа от API');
    }
}

function addMessageToChat(content, type) {
    if (!currentChatId) return;
    
    const currentChat = chats.find(chat => chat.id === currentChatId);
    if (!currentChat) return;
    
    const message = {
        id: Date.now() + Math.random(),
        type: type,
        content: content,
        timestamp: new Date().toISOString()
    };
    
    currentChat.messages.push(message);
    currentChat.lastActivity = message.timestamp;
    
    // Обновляем превью чата
    if (type === 'user') {
        currentChat.preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
    }
    
    displayMessage(message);
    saveChats();
    updateChatsList();
}

function displayMessage(message) {
    const messagesContainer = document.getElementById('messagesContainer');
    const emptyChat = document.getElementById('emptyChat');
    
    // Скрываем сообщение о пустом чате
    if (emptyChat) {
        emptyChat.style.display = 'none';
    }
    
    const messageElement = createMessageElement(message);
    messagesContainer.appendChild(messageElement);
    
    // Прокручиваем к последнему сообщению
    scrollToBottom();
    
    // Анимация появления
    setTimeout(() => {
        messageElement.classList.add('message-enter');
    }, 50);
}

function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type}-message`;
    
    const isUser = message.type === 'user';
    const avatarEmoji = isUser ? '🫐' : '🤖'; // Ежевика для пользователя
    
    messageDiv.innerHTML = `
        <div style="display: flex; align-items: flex-start; justify-content: ${isUser ? 'flex-end' : 'flex-start'}; margin-bottom: 1rem;">
            ${!isUser ? `
                <div class="bot-avatar">
                    <span class="avatar-emoji">${avatarEmoji}</span>
                </div>
            ` : ''}
            
            <div class="chat-bubble ${isUser ? 'user-bubble' : 'bot-bubble'}" style="order: ${isUser ? '1' : '2'};">
                <div class="message-content">${formatMessageContent(message.content)}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            </div>
            
            ${isUser ? `
                <div class="user-avatar">
                    <span class="avatar-emoji blackberry-glow">${avatarEmoji}</span>
                </div>
            ` : ''}
        </div>
    `;
    
    return messageDiv;
}

function formatMessageContent(content) {
    // Заменяем переносы строк на <br> и экранируем HTML
    return content
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function showTypingIndicator() {
    const messagesContainer = document.getElementById('messagesContainer');
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message';
    typingDiv.id = 'typingIndicator';
    
    typingDiv.innerHTML = `
        <div style="display: flex; align-items: flex-start; margin-bottom: 1rem;">
            <div class="bot-avatar">
                <span class="avatar-emoji">🤖</span>
            </div>
            <div class="chat-bubble bot-bubble">
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(typingDiv);
    scrollToBottom();
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateSendButtonState() {
    const sendButton = document.getElementById('sendButton');
    const messageInput = document.getElementById('messageInput');
    
    if (isSending) {
        sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        sendButton.disabled = true;
    } else {
        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        const hasText = messageInput.value.trim().length > 0;
        const isValidLength = messageInput.value.length <= MAX_MESSAGE_LENGTH;
        sendButton.disabled = !hasText || !isValidLength;
    }
}

function createNewChat() {
    // Ограничиваем количество чатов
    if (chats.length >= MAX_CHATS) {
        showStatus(`Максимальное количество чатов: ${MAX_CHATS}`, 'warning');
        return;
    }
    
    const newChat = {
        id: 'chat_' + Date.now(),
        title: `Чат ${chats.length + 1}`,
        preview: 'Новый чат...',
        messages: [],
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
    };
    
    chats.unshift(newChat);
    currentChatId = newChat.id;
    
    // Очищаем контейнер сообщений
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.innerHTML = `
        <div id="emptyChat" class="empty-chat">
            <div class="empty-chat-icon">🫐</div>
            <h3>Добро пожаловать в FruityChat!</h3>
            <p>Начните общение с ИИ, отправив сообщение ниже.</p>
        </div>
    `;
    
    saveChats();
    updateChatsList();
    closeSidebarFunction();
    
    showStatus('Новый чат создан!', 'success');
    
    // Фокусируемся на поле ввода (только на десктопе)
    if (!isMobileDevice()) {
        setTimeout(() => {
            document.getElementById('messageInput').focus();
        }, 300);
    }
}

function openSidebar() {
    const sidebar = document.getElementById('chatsSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.add('active');
    overlay.classList.add('active');
    overlay.style.display = 'block';
    
    // Обновляем список чатов при открытии
    updateChatsList();
    
    // Предотвращаем скролл основного контента
    document.body.style.overflow = 'hidden';
}

function closeSidebarFunction() {
    const sidebar = document.getElementById('chatsSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    
    setTimeout(() => {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }, 300);
}

function updateChatsList() {
    const chatsList = document.getElementById('chatsList');
    if (!chatsList) return;
    
    chatsList.innerHTML = '';
    
    if (chats.length === 0) {
        chatsList.innerHTML = `
            <div class="sidebar-info">
                <p>Чатов пока нет. Создайте новый чат!</p>
            </div>
        `;
        return;
    }
    
    chats.forEach(chat => {
        const chatElement = document.createElement('div');
        chatElement.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        
        chatElement.innerHTML = `
            <div class="chat-item-content" onclick="switchToChat('${chat.id}')">
                <div class="chat-header">
                    <div class="chat-title">${escapeHtml(chat.title)}</div>
                    <div class="chat-date">${formatDate(chat.lastActivity)}</div>
                </div>
                <div class="chat-preview">${escapeHtml(chat.preview)}</div>
            </div>
            <button class="delete-chat-btn" onclick="deleteChat('${chat.id}', event)">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        chatsList.appendChild(chatElement);
    });
}

function switchToChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    currentChatId = chatId;
    
    // Обновляем контейнер сообщений
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.innerHTML = '';
    
    if (chat.messages.length === 0) {
        messagesContainer.innerHTML = `
            <div id="emptyChat" class="empty-chat">
                <div class="empty-chat-icon">🫐</div>
                <h3>Начните общение!</h3>
                <p>Этот чат пока пуст. Отправьте первое сообщение.</p>
            </div>
        `;
    } else {
        chat.messages.forEach(message => {
            displayMessage(message);
        });
    }
    
    closeSidebarFunction();
    updateChatsList();
    
    showStatus(`Переключен на чат: ${chat.title}`, 'info');
}

function deleteChat(chatId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (chats.length <= 1) {
        showStatus('Нельзя удалить последний чат', 'warning');
        return;
    }
    
    const chatIndex = chats.findIndex(chat => chat.id === chatId);
    if (chatIndex === -1) return;
    
    const chatToDelete = chats[chatIndex];
    
    if (confirm(`Удалить чат "${chatToDelete.title}"?`)) {
        // Если удаляем текущий чат, переключаемся на другой
        if (currentChatId === chatId) {
            const newCurrentChat = chats.find(chat => chat.id !== chatId);
            currentChatId = newCurrentChat ? newCurrentChat.id : null;
        }
        
        // Удаляем чат
        chats.splice(chatIndex, 1);
        
        // Если это был последний чат, создаем новый
        if (chats.length === 0) {
            createNewChat();
        } else if (currentChatId === null) {
            currentChatId = chats[0].id;
        }
        
        saveChats();
        updateChatsList();
        
        // Обновляем отображение сообщений
        if (currentChatId) {
            switchToChat(currentChatId);
        }
        
        showStatus('Чат удален', 'success');
    }
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
        return 'Вчера';
    } else if (diffDays < 7) {
        return date.toLocaleDateString('ru-RU', { weekday: 'short' });
    } else {
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('statusMessage');
    if (!statusDiv) return;
    
    statusDiv.textContent = message;
    statusDiv.className = `status-message status-${type}`;
    statusDiv.style.display = 'block';
    
    // Автоматическое скрытие
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

function saveChats() {
    try {
        const chatsToSave = chats.map(chat => ({
            ...chat,
            // Ограничиваем количество сохраняемых сообщений для экономии места
            messages: chat.messages.slice(-50)
        }));
        
        localStorage.setItem('fruityChat_chats', JSON.stringify(chatsToSave));
        localStorage.setItem('fruityChat_currentChatId', currentChatId);
    } catch (error) {
        console.error('Ошибка сохранения чатов:', error);
        showStatus('Ошибка сохранения чатов', 'error');
    }
}

function loadChats() {
    try {
        const savedChats = localStorage.getItem('fruityChat_chats');
        const savedCurrentChatId = localStorage.getItem('fruityChat_currentChatId');
        
        if (savedChats) {
            chats = JSON.parse(savedChats);
            
            // Восстанавливаем текущий чат
            if (savedCurrentChatId && chats.some(chat => chat.id === savedCurrentChatId)) {
                currentChatId = savedCurrentChatId;
                switchToChat(currentChatId);
            } else if (chats.length > 0) {
                currentChatId = chats[0].id;
                switchToChat(currentChatId);
            }
        } else {
            // Создаем первый чат, если нет сохраненных
            createNewChat();
        }
        
        updateChatsList();
    } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
        // Создаем новый чат при ошибке
        createNewChat();
    }
}

function createFruitRain() {
    const fruitRain = document.querySelector('.fruit-rain');
    if (!fruitRain) return;
    
    // Очищаем предыдущие фрукты
    fruitRain.innerHTML = '';
    
    // Создаем 15 случайных фруктов
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            const fruit = document.createElement('div');
            fruit.className = 'fruit';
            fruit.textContent = FRUIT_EMOJIS[Math.floor(Math.random() * FRUIT_EMOJIS.length)];
            
            // Случайная позиция и анимация
            const left = Math.random() * 100;
            const duration = 5 + Math.random() * 10;
            const delay = Math.random() * 5;
            
            fruit.style.left = `${left}%`;
            fruit.style.animationDuration = `${duration}s`;
            fruit.style.animationDelay = `${delay}s`;
            
            fruitRain.appendChild(fruit);
            
            // Удаляем фрукт после завершения анимации
            setTimeout(() => {
                if (fruit.parentNode === fruitRain) {
                    fruitRain.removeChild(fruit);
                }
            }, (duration + delay) * 1000);
        }, i * 300);
    }
}

// Экспортируем функции для глобального использования
window.switchToChat = switchToChat;
window.deleteChat = deleteChat;
window.createNewChat = createNewChat;
window.sendMessage = sendMessage;
window.openSidebar = openSidebar;
window.closeSidebarFunction = closeSidebarFunction;

// Инициализация приложения
console.log('FruityChat инициализирован! 🫐');
