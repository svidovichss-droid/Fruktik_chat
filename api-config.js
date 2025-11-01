// api-config.js
(function() {
    'use strict';
    
    // Зашифрованный API ключ (base64)
    const ENCRYPTED_KEY = 'aGZfWGlvUmR1aEJkcWhFVEZDa1hKWVRjTHN3TW1sSkRzZ0tWcw==';
    
    // Простая декодировка
    function decodeKey(encrypted) {
        try {
            return atob(encrypted);
        } catch (e) {
            console.error('Ошибка декодирования ключа:', e);
            return null;
        }
    }
    
    // Инициализация API ключа
    window.API_KEYS = {
        huggingface: decodeKey(ENCRYPTED_KEY)
    };
    
    console.log('🔑 API конфигурация инициализирована');
})();