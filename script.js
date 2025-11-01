// script.js
const API_CONFIG = {
    url: 'https://router.huggingface.co/v1/chat/completions',
    key: null
};

const MODEL = "deepseek-ai/DeepSeek-V3.2-Exp:novita";

const FRUIT_EMOJIS = [
    { emoji: '🍓', weight: 10 },
    { emoji: '🍍', weight: 8 },
    { emoji: '🍇', weight: 7 },
    { emoji: '🍉', weight: 9 },
    { emoji: '🍊', weight: 8 },
    { emoji: '🍋', weight: 7 },
    { emoji: '🍌', weight: 9 },
    { emoji: '🍎', weight: 8 },
    { emoji: '🍑', weight: 6 },
    { emoji: '🍒', weight: 7 },
    { emoji: '🥭', weight: 5 },
    { emoji: '🫐', weight: 6 },
    { emoji: '🍐', weight: 5 },
    { emoji: '🥝', weight: 4 },
    { emoji: '🍅', weight: 3 },
    { emoji: '🥥', weight: 2 },
    { emoji: '🍈', weight: 3 },
    { emoji: '🍏', weight: 7 },
    { emoji: '🫒', weight: 2 },
    { emoji: '🌰', weight: 1 }
];

let chats = [];
let currentChatId = null;
let isSending = false;
const MAX_CHATS = 15;
const MAX_MESSAGE_LENGTH = 1000;

let fruitRainInterval = null;
let activeFruits = new Set();

const API_KEY_STORAGE_KEY = 'huggingface_api_key_custom';

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    console.log('🚀 Инициализация Фруктик Чата...');
    
    await loadConfig();
    await loadCustomApiKey();
    loadChats();
    setupEventListeners();
    setupSwipeGestures();
    setupApiKeyModal();
    
    startContinuousFruitRain();
    
    document.documentElement.setAttribute('data-theme', 'light');
    
    initializePWA();
    updateChatsCounter();
    
    console.log('✅ Приложение инициализировано');
}

async function loadCustomApiKey() {
    try {
        const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
        if (savedKey) {
            API_CONFIG.key = savedKey;
            console.log('🔑 Загружен кастомный API ключ');
            return true;
        }
        
        if (window.API_KEYS && window.API_KEYS.huggingface) {
            API_CONFIG.key = window.API_KEYS.huggingface;
            console.log('🔑 Используется API ключ из конфигурации');
            return true;
        }
        
        console.warn('⚠️ API ключ не найден');
        return false;
    } catch (error) {
        console.error('Ошибка загрузки API ключа:', error);
        return false;
    }
}

function loadConfig() {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (!API_CONFIG.key) {
                console.warn('⚠️ API ключ не настроен');
                showStatus('Настройте API ключ для работы', 'warning');
            } else {
                console.log('🔑 API ключ готов к использованию');
            }
            resolve();
        }, 100);
    });
}

function setupApiKeyModal() {
    const modal = document.getElementById('apiKeyModal');
    const closeBtn = document.getElementById('closeApiKeyModal');
    const saveBtn = document.getElementById('saveApiKey');
    const testBtn = document.getElementById('testApiKey');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const statusEl = document.getElementById('apiKeyStatus');
    
    if (API_CONFIG.key) {
        apiKeyInput.value = '•'.repeat(20);
    }
    
    closeBtn.addEventListener('click', hideApiKeyModal);
    
    saveBtn.addEventListener('click', async function() {
        const key = apiKeyInput.value.trim();
        
        if (!key) {
            showApiKeyStatus('Введите API ключ', 'invalid');
            return;
        }
        
        if (key === '•'.repeat(20)) {
            showApiKeyStatus('Используется текущий ключ', 'valid');
            hideApiKeyModal();
            return;
        }
        
        if (!key.startsWith('hf_')) {
            showApiKeyStatus('Ключ должен начинаться с "hf_"', 'invalid');
            return;
        }
        
        try {
            localStorage.setItem(API_KEY_STORAGE_KEY, key);
            API_CONFIG.key = key;
            showApiKeyStatus('Ключ успешно сохранен!', 'valid');
            setTimeout(() => {
                hideApiKeyModal();
                showStatus('API ключ обновлен!', 'success');
            }, 1000);
        } catch (error) {
            showApiKeyStatus('Ошибка сохранения ключа', 'invalid');
        }
    });
    
    testBtn.addEventListener('click', async function() {
        const key = apiKeyInput.value.trim();
        
        if (!key || key === '•'.repeat(20)) {
            showApiKeyStatus('Введите новый ключ для проверки', 'invalid');
            return;
        }
        
        if (!key.startsWith('hf_')) {
            showApiKeyStatus('Неверный формат ключа', 'invalid');
            return;
        }
        
        showApiKeyStatus('Проверяем ключ...', '');
        
        try {
            const isValid = await testApiKey(key);
            if (isValid) {
                showApiKeyStatus('✅ Ключ действителен!', 'valid');
            } else {
                showApiKeyStatus('❌ Ключ недействителен', 'invalid');
            }
        } catch (error) {
            showApiKeyStatus('❌ Ошибка проверки ключа', 'invalid');
        }
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            hideApiKeyModal();
        }
    });
}

async function testApiKey(key) {
    try {
        const response = await fetch('https://huggingface.co/api/whoami-v2', {
            headers: {
                'Authorization': `Bearer ${key}`
            }
        });
        
        return response.ok;
    } catch (error) {
        console.error('Ошибка проверки API ключа:', error);
        return false;
    }
}

function showApiKeyModal() {
    const modal = document.getElementById('apiKeyModal');
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

function hideApiKeyModal() {
    const modal = document.getElementById('apiKeyModal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

function showApiKeyStatus(message, type) {
    const statusEl = document.getElementById('apiKeyStatus');
    statusEl.textContent = message;
    statusEl.className = 'api-key-status';
    
    if (type === 'valid') {
        statusEl.classList.add('valid');
    } else if (type === 'invalid') {
        statusEl.classList.add('invalid');
    }
}

function setupEventListeners() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const newChatButton = document.getElementById('newChatButton');
    const menuButton = document.getElementById('menuButton');
    const closeSidebar = document.getElementById('closeSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const clearAllChats = document.getElementById('clearAllChats');
    const chatContainer = document.querySelector('.chat-container');
    const changeApiKeyBtn = document.getElementById('changeApiKey');

    messageInput.addEventListener('input', function() {
        handleMessageInput();
        updateCharacterCount();
        autoResizeTextarea(this);
    });
    
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (messageInput.value.trim() && !isSending) {
                sendMessage();
            }
        }
    });
    
    messageInput.addEventListener('paste', handlePaste);
    messageInput.addEventListener('focus', () => messageInput.classList.add('focused'));
    messageInput.addEventListener('blur', () => messageInput.classList.remove('focused'));

    sendButton.addEventListener('click', sendMessage);
    newChatButton.addEventListener('click', createNewChat);
    menuButton.addEventListener('click', openSidebar);
    clearAllChats.addEventListener('click', clearAllChatsHandler);

    closeSidebar.addEventListener('click', closeSidebarFunction);
    sidebarOverlay.addEventListener('click', closeSidebarFunction);

    document.querySelectorAll('.helper-btn').forEach(btn => {
        if (btn.id && btn.id.startsWith('quickQuestion')) {
            btn.addEventListener('click', function() {
                const question = this.getAttribute('data-question');
                document.getElementById('messageInput').value = question;
                handleMessageInput();
                updateCharacterCount();
                autoResizeTextarea(document.getElementById('messageInput'));
            });
        }
    });

    if (changeApiKeyBtn) {
        changeApiKeyBtn.addEventListener('click', function() {
            closeSidebarFunction();
            setTimeout(() => {
                showApiKeyModal();
            }, 350);
        });
    }

    chatContainer.addEventListener('click', function(e) {
        if (!e.target.closest('.header') && 
            !e.target.closest('.chats-sidebar') && 
            !document.getElementById('chatsSidebar').classList.contains('active')) {
            messageInput.focus();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSidebarFunction();
        }
    });

    window.addEventListener('beforeunload', function(e) {
        if (isSending) {
            e.preventDefault();
            e.returnValue = 'Сообщение отправляется. Вы уверены, что хотите уйти?';
        }
    });

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', function() {
            setTimeout(scrollToBottom, 100);
        });
    }
}

function setupSwipeGestures() {
    let startX = 0;
    let currentX = 0;
    let isSwiping = false;
    const SWIPE_THRESHOLD = 60;
    const SIDEBAR_SWIPE_AREA = 25;

    const chatContainer = document.querySelector('.chat-container');
    const sidebar = document.getElementById('chatsSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    chatContainer.addEventListener('touchstart', function(e) {
        if (isKeyboardOpen()) return;
        
        startX = e.touches[0].clientX;
        currentX = startX;
        isSwiping = true;
        
        sidebar.style.transition = 'none';
    }, { passive: true });

    chatContainer.addEventListener('touchmove', function(e) {
        if (!isSwiping) return;
        
        currentX = e.touches[0].clientX;
        const diffX = currentX - startX;
        const diffY = Math.abs(e.touches[0].clientY - startY);

        if (Math.abs(diffX) > diffY && Math.abs(diffX) > 10) {
            e.preventDefault();
            
            if (startX <= SIDEBAR_SWIPE_AREA && diffX > 0) {
                const swipeDistance = Math.min(diffX, window.innerWidth * 0.8);
                const progress = swipeDistance / (window.innerWidth * 0.8);
                
                sidebar.style.transform = `translateX(${-100 + (progress * 100)}%)`;
                sidebar.style.opacity = progress.toString();
                
                overlay.style.display = 'block';
                overlay.style.opacity = (progress * 0.5).toString();
            }
        }
    }, { passive: false });

    chatContainer.addEventListener('touchend', function() {
        if (!isSwiping) return;
        isSwiping = false;
        
        sidebar.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
        
        const diffX = currentX - startX;
        
        if (diffX > SWIPE_THRESHOLD && startX <= SIDEBAR_SWIPE_AREA) {
            openSidebar();
        } else {
            sidebar.style.transform = 'translateX(-100%)';
            sidebar.style.opacity = '0';
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (!sidebar.classList.contains('active')) {
                    overlay.style.display = 'none';
                }
            }, 300);
        }
    }, { passive: true });
}

function startContinuousFruitRain() {
    const config = window.APP_CONFIG?.fruitRain || {
        density: 25,
        spawnInterval: 200,
        speed: { min: 8, max: 15 },
        size: { min: 28, max: 42 },
        opacity: { min: 0.8, max: 1.0 }
    };
    
    if (fruitRainInterval) {
        clearInterval(fruitRainInterval);
    }
    
    createInitialFruits(config.density);
    
    fruitRainInterval = setInterval(() => {
        if (activeFruits.size < config.density) {
            createSingleFruit(config);
        }
    }, config.spawnInterval);
    
    console.log('🌧️ Непрерывный фруктовый дождь запущен');
}

function createInitialFruits(count) {
    const config = window.APP_CONFIG?.fruitRain;
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            createSingleFruit(config);
        }, Math.random() * 2000);
    }
}

function createSingleFruit(config) {
    const rainContainer = document.getElementById('fruitRain');
    if (!rainContainer) return;
    
    const fruit = document.createElement('div');
    const fruitId = 'fruit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    fruit.id = fruitId;
    fruit.className = 'fruit';
    
    fruit.textContent = getWeightedRandomFruit();
    fruit.style.left = Math.random() * 100 + 'vw';
    
    const animations = ['straight', 'left', 'right', 'sway', 'spiral', 'bounce'];
    const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
    fruit.classList.add(randomAnimation);
    
    const duration = (Math.random() * (config.speed.max - config.speed.min) + config.speed.min) + 's';
    fruit.style.animationDuration = duration;
    
    fruit.style.animationDelay = (Math.random() * 2) + 's';
    
    const size = Math.random() * (config.size.max - config.size.min) + config.size.min;
    fruit.style.fontSize = size + 'px';
    
    const opacity = (Math.random() * (config.opacity.max - config.opacity.min) + config.opacity.min).toFixed(2);
    fruit.style.setProperty('--fruit-opacity', opacity);
    fruit.style.opacity = opacity;
    
    const hueRotate = Math.random() * 60 - 30;
    fruit.style.filter += ` hue-rotate(${hueRotate}deg)`;
    
    if (Math.random() < 0.1) {
        fruit.classList.add('special');
        if (Math.random() < 0.5) {
            fruit.classList.add('glow');
        }
    }
    
    fruit.style.zIndex = Math.floor(Math.random() * 10) - 5;
    
    rainContainer.appendChild(fruit);
    activeFruits.add(fruitId);
    
    const animationTime = (parseFloat(duration) + parseFloat(fruit.style.animationDelay)) * 1000;
    setTimeout(() => {
        if (document.getElementById(fruitId)) {
            document.getElementById(fruitId).remove();
            activeFruits.delete(fruitId);
        }
    }, animationTime);
    
    return fruitId;
}

function getWeightedRandomFruit() {
    const totalWeight = FRUIT_EMOJIS.reduce((sum, fruit) => sum + fruit.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const fruit of FRUIT_EMOJIS) {
        random -= fruit.weight;
        if (random <= 0) {
            return fruit.emoji;
        }
    }
    
    return FRUIT_EMOJIS[0].emoji;
}

function stopFruitRain() {
    if (fruitRainInterval) {
        clearInterval(fruitRainInterval);
        fruitRainInterval = null;
    }
    
    const rainContainer = document.getElementById('fruitRain');
    if (rainContainer) {
        rainContainer.innerHTML = '';
    }
    
    activeFruits.clear();
}

function updateFruitRainDensity(newDensity) {
    const config = window.APP_CONFIG.fruitRain;
    config.density = newDensity;
    
    stopFruitRain();
    startContinuousFruitRain();
}

document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        if (fruitRainInterval) {
            clearInterval(fruitRainInterval);
            fruitRainInterval = setInterval(() => {
                if (activeFruits.size < window.APP_CONFIG.fruitRain.density * 0.5) {
                    createSingleFruit(window.APP_CONFIG.fruitRain);
                }
            }, 500);
        }
    } else {
        stopFruitRain();
        startContinuousFruitRain();
    }
});

window.addEventListener('resize', function() {
    const isMobile = window.innerWidth < 768;
    const newDensity = isMobile ? 15 : 25;
    
    if (newDensity !== window.APP_CONFIG.fruitRain.density) {
        updateFruitRainDensity(newDensity);
    }
});

function getRandomFruit() {
    return getWeightedRandomFruit();
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

function handleMessageInput() {
    const message = document.getElementById('messageInput').value.trim();
    const sendButton = document.getElementById('sendButton');
    
    sendButton.disabled = !message || isSending;
}

function updateCharacterCount() {
    const messageInput = document.getElementById('messageInput');
    const charCount = document.getElementById('charCount');
    const count = messageInput.value.length;
    
    charCount.textContent = `${count}/${MAX_MESSAGE_LENGTH}`;
    
    if (count > MAX_MESSAGE_LENGTH * 0.9) {
        charCount.classList.add('warning');
    } else {
        charCount.classList.remove('warning');
    }
}

function handlePaste(e) {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.length > MAX_MESSAGE_LENGTH) {
        e.preventDefault();
        const trimmedText = pastedText.substring(0, MAX_MESSAGE_LENGTH);
        document.getElementById('messageInput').value = trimmedText;
        showStatus('Текст обрезан до допустимой длины', 'info');
        updateCharacterCount();
        autoResizeTextarea(document.getElementById('messageInput'));
    }
}

function isKeyboardOpen() {
    return window.visualViewport && (window.visualViewport.height < window.innerHeight * 0.7);
}

function openSidebar() {
    const sidebar = document.getElementById('chatsSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    hideKeyboard();
    
    sidebar.classList.add('active');
    sidebar.style.transform = 'translateX(0)';
    sidebar.style.opacity = '1';
    
    overlay.style.display = 'block';
    setTimeout(() => {
        overlay.classList.add('active');
        overlay.style.opacity = '0.5';
    }, 10);
    
    document.body.style.overflow = 'hidden';
    renderChatsList();
}

function closeSidebarFunction() {
    const sidebar = document.getElementById('chatsSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.remove('active');
    sidebar.style.transform = 'translateX(-100%)';
    sidebar.style.opacity = '0';
    
    overlay.classList.remove('active');
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
    
    document.body.style.overflow = '';
    
    setTimeout(() => {
        document.getElementById('messageInput').focus();
    }, 350);
}

function hideKeyboard() {
    document.activeElement.blur();
}

function loadChats() {
    try {
        const savedChats = localStorage.getItem('fruitChats');
        if (savedChats) {
            chats = JSON.parse(savedChats);
            
            if (chats.length > 0) {
                const lastActiveChat = chats.find(chat => chat.id === currentChatId) || chats[chats.length - 1];
                currentChatId = lastActiveChat.id;
                loadChat(currentChatId);
            } else {
                createNewChat();
            }
        } else {
            createNewChat();
        }
    } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
        showStatus('Ошибка загрузки чатов', 'error');
        createNewChat();
    }
    updateChatsCounter();
}

function saveChats() {
    try {
        if (chats.length > MAX_CHATS) {
            const chatsToRemove = chats.length - MAX_CHATS;
            chats = chats.slice(chatsToRemove);
            showStatus(`Удалены старые чаты (сохранено ${MAX_CHATS})`, 'info');
        }
        
        localStorage.setItem('fruitChats', JSON.stringify(chats));
        updateChatsCounter();
    } catch (error) {
        console.error('Ошибка сохранения чатов:', error);
        showStatus('Ошибка сохранения чатов', 'error');
    }
}

function createNewChat() {
    const newChat = {
        id: generateChatId(),
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
    closeSidebarFunction();
    
    const messageInput = document.getElementById('messageInput');
    messageInput.focus();
    
    showStatus('Новый чат создан!', 'success');
}

function generateChatId() {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function loadChat(chatId) {
    currentChatId = chatId;
    renderChat();
    closeSidebarFunction();
    document.getElementById('messageInput').focus();
    showStatus('Чат загружен', 'success');
}

function deleteChat(chatId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (chats.length <= 1) {
        showStatus('Нельзя удалить единственный чат!', 'error');
        return;
    }
    
    if (confirm('Вы уверены, что хотите удалить этот чат? Все сообщения будут потеряны.')) {
        const chatIndex = chats.findIndex(chat => chat.id === chatId);
        
        chats = chats.filter(chat => chat.id !== chatId);
        
        if (currentChatId === chatId) {
            const newIndex = chatIndex >= chats.length ? chats.length - 1 : chatIndex;
            currentChatId = chats.length > 0 ? chats[newIndex].id : null;
        }
        
        saveChats();
        renderChat();
        renderChatsList();
        showStatus('Чат удален!', 'success');
    }
}

function clearAllChatsHandler() {
    if (chats.length === 0) {
        showStatus('Нет чатов для очистки', 'info');
        return;
    }
    
    if (confirm('Вы уверены, что хотите удалить ВСЕ чаты? Это действие нельзя отменить.')) {
        chats = [];
        createNewChat();
        showStatus('Все чаты очищены', 'success');
    }
}

function updateChatTitle(chatId, newTitle) {
    const chat = chats.find(c => c.id === chatId);
    if (chat && chat.title !== newTitle) {
        chat.title = newTitle.substring(0, 50);
        chat.updatedAt = new Date().toISOString();
        saveChats();
        renderChatsList();
    }
}

function renderChatsList() {
    const chatsList = document.getElementById('chatsList');
    
    if (chats.length === 0) {
        chatsList.innerHTML = `
            <div class="text-center text-white/70 py-8">
                <i class="fas fa-comments text-2xl mb-2"></i>
                <p>Нет сохраненных чатов</p>
            </div>
        `;
        return;
    }
    
    const sortedChats = [...chats].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    chatsList.innerHTML = sortedChats.map(chat => `
        <div class="chat-item ${chat.id === currentChatId ? 'active' : ''}">
            <div class="chat-item-content" onclick="loadChat('${chat.id}')">
                <div class="chat-header">
                    <div class="chat-title">${escapeHtml(chat.title)}</div>
                    <div class="chat-date">${formatDate(chat.updatedAt)}</div>
                </div>
                <div class="chat-preview">${getChatPreview(chat)}</div>
            </div>
            <button class="delete-chat-btn" onclick="deleteChat('${chat.id}', event)">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function getChatPreview(chat) {
    if (chat.messages.length === 0) return 'Пока нет сообщений';
    
    const lastMessage = chat.messages[chat.messages.length - 1];
    const content = lastMessage.content.substring(0, 40);
    return lastMessage.role === 'user' ? `Вы: ${content}...` : `Фруктик: ${content}...`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дн назад`;
    return date.toLocaleDateString('ru-RU');
}

function updateChatsCounter() {
    const counter = document.getElementById('chatsCount');
    if (counter) {
        counter.textContent = chats.length;
    }
}

function renderChat() {
    const chatMessages = document.getElementById('chatMessages');
    
    if (!currentChatId || chats.length === 0) {
        chatMessages.innerHTML = getEmptyChatHTML();
        return;
    }
    
    const currentChat = chats.find(chat => chat.id === currentChatId);
    if (!currentChat) {
        chatMessages.innerHTML = getEmptyChatHTML();
        return;
    }
    
    chatMessages.innerHTML = '';
    
    if (currentChat.messages.length === 0) {
        chatMessages.innerHTML = getEmptyChatHTML();
        return;
    }
    
    currentChat.messages.forEach(message => {
        addMessageToChat(message.role, message.content, false);
    });
    
    scrollToBottom();
}

function getEmptyChatHTML() {
    return `
        <div class="empty-chat">
            <div class="empty-chat-icon">🍓</div>
            <h2 class="text-2xl font-bold mb-2">Начни новый разговор!</h2>
            <p class="text-lg mb-4">Напиши что-нибудь Фруктику, чтобы начать общение.</p>
            <div class="text-sm text-gray-600 max-w-md">
                <p class="font-semibold mb-2">✨ Фруктик поможет с:</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
                    <div class="flex items-center gap-2">
                        <span>📚</span> Домашними заданиями
                    </div>
                    <div class="flex items-center gap-2">
                        <span>🎯</span> Объяснением сложных тем
                    </div>
                    <div class="flex items-center gap-2">
                        <span>📖</span> Подготовкой к урокам
                    </div>
                    <div class="flex items-center gap-2">
                        <span>💡</span> Решением задач
                    </div>
                </div>
            </div>
        </div>
    `;
}

function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = 'status-message';
    
    const typeClass = {
        success: 'status-success',
        error: 'status-error',
        warning: 'status-warning',
        info: 'status-info'
    }[type] || 'status-info';
    
    statusEl.classList.add(typeClass);
    statusEl.style.display = 'block';
    
    const duration = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, duration);
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

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function sendMessage() {
    if (isSending) {
        showStatus('Подождите, сообщение отправляется...', 'warning');
        return;
    }
    
    if (!API_CONFIG.key) {
        showStatus('Ошибка: API ключ не настроен', 'error');
        showApiKeyModal();
        return;
    }
    
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    let message = messageInput.value.trim();
    
    if (!message) {
        showStatus('Введите сообщение', 'error');
        messageInput.focus();
        return;
    }
    
    if (message.length > MAX_MESSAGE_LENGTH) {
        showStatus(`Сообщение слишком длинное (максимум ${MAX_MESSAGE_LENGTH} символов)`, 'error');
        return;
    }
    
    if (!navigator.onLine) {
        showStatus('Отсутствует интернет-соединение', 'error');
        return;
    }
    
    isSending = true;
    sendButton.disabled = true;
    sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    const emptyChat = document.getElementById('emptyChat');
    if (emptyChat) {
        emptyChat.remove();
    }
    
    addMessageToChat('user', message);
    messageInput.value = '';
    updateCharacterCount();
    autoResizeTextarea(messageInput);
    
    const currentChat = chats.find(chat => chat.id === currentChatId);
    if (currentChat) {
        currentChat.messages.push({ role: 'user', content: message });
        
        if (currentChat.messages.length === 1) {
            const title = message.length > 20 ? message.substring(0, 20) + '...' : message;
            updateChatTitle(currentChatId, title);
        }
        
        currentChat.updatedAt = new Date().toISOString();
        saveChats();
    }
    
    showTypingIndicator();
    showStatus('Фруктик думает...', 'info');
    
    try {
        const response = await callHuggingFaceAPI(currentChat);
        const aiResponse = response.choices[0].message.content;
        
        if (currentChat) {
            currentChat.messages.push({ role: 'assistant', content: aiResponse });
            currentChat.updatedAt = new Date().toISOString();
            saveChats();
        }
        
        hideTypingIndicator();
        addMessageToChat('assistant', aiResponse);
        showStatus('Фруктик ответил!', 'success');
        
    } catch (error) {
        handleAPIError(error);
    } finally {
        isSending = false;
        sendButton.disabled = false;
        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        messageInput.focus();
    }
}

async function callHuggingFaceAPI(currentChat) {
    const messagesForAPI = [
        { 
            role: 'system', 
            content: `Ты - Фруктик, дружелюбный помощник для детей младшего школьного возраста. Твоя главная задача - помогать в учебе, соблюдая абсолютно правильную грамматику русского языка.

ОСОБЫЕ ПРАВИЛА:
1. Всегда отвечай грамотно, без ошибок - ты образец для ребенка
2. Используй простые, понятные предложения
3. Объясняй сложные темы доступным языком
4. Будь терпеливым и поддерживающим
5. Используй 1-2 эмодзи в ответе для дружелюбия
6. Не давай готовых ответов на домашние задания, а объясняй как решать
7. Поощряй любопытство и задавание вопросов

ПРИМЕРЫ ПРАВИЛЬНЫХ ОТВЕТОВ:
"Привет! Я Фруктик 🍎 Помогу тебе с уроками. Что ты хочешь узнать?"
"Молодец, что спросил! Давай разберем эту задачу по шагам 🧩"
"Запомни: 'жи-ши' пиши с буквой 'и'. Это правило русского языка ✏️"` 
        },
        ...currentChat.messages.slice(-8)
    ];
    
    const response = await fetch(API_CONFIG.url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_CONFIG.key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: MODEL,
            messages: messagesForAPI,
            max_tokens: 800,
            stream: false
        })
    });
    
    if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error?.message || errorData.error?.code || errorMessage;
        } catch (e) {
            const errorText = await response.text();
            if (errorText) {
                errorMessage = errorText;
            }
        }
        throw new Error(errorMessage);
    }
    
    return await response.json();
}

function handleAPIError(error) {
    console.error('API Error:', error);
    hideTypingIndicator();
    
    let userMessage = 'Произошла ошибка при отправке сообщения';
    
    if (error.message.includes('401') || error.message.includes('authentication')) {
        userMessage = 'Ошибка авторизации API. Проверьте настройки ключа.';
        setTimeout(() => {
            showApiKeyModal();
        }, 1000);
    } else if (error.message.includes('429')) {
        userMessage = 'Слишком много запросов. Попробуйте позже.';
    } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
        userMessage = 'Проблемы с сетью. Проверьте подключение к интернету.';
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
        userMessage = 'Превышен лимит API. Попробуйте позже.';
    }
    
    showStatus(userMessage, 'error');
    addMessageToChat('assistant', `Извини, произошла ошибка: ${userMessage}. Попробуй отправить сообщение еще раз. 🍓`);
}

function addMessageToChat(role, content, animate = true) {
    const chatMessages = document.getElementById('chatMessages');
    
    const emptyChat = document.getElementById('emptyChat');
    if (emptyChat) {
        emptyChat.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${animate ? 'message-enter' : ''}`;
    
    const isUser = role === 'user';
    
    messageDiv.innerHTML = `
        <div class="message-row ${isUser ? 'user' : ''}">
            <div class="${isUser ? 'user-avatar blackberry-glow' : 'bot-avatar'}">
                <div class="avatar-emoji-container">
                    <span class="avatar-emoji">${isUser ? '🫐' : getRandomFruit()}</span>
                </div>
            </div>
            <div class="chat-bubble ${isUser ? 'user-bubble' : 'bot-bubble'}">
                <div class="message-content">${escapeHtml(content)}</div>
                <div class="message-time">${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function initializePWA() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('PWA режим');
    }
    
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

window.loadChat = loadChat;
window.deleteChat = deleteChat;

console.log('🧩 Фруктик Чат загружен!');