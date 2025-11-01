// config.js
(function() {
    'use strict';
    
    // XOR шифрование с ключом
    const xorEncrypt = (str, key) => {
        let result = '';
        for (let i = 0; i < str.length; i++) {
            result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(result);
    };

    const xorDecrypt = (encrypted, key) => {
        try {
            const str = atob(encrypted);
            let result = '';
            for (let i = 0; i < str.length; i++) {
                result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return result;
        } catch (error) {
            console.error('Ошибка расшифровки');
            return null;
        }
    };

    // Зашифрованные данные
    const ENCRYPTED_DATA = {
        key: "GBsJER0fDhkVEx0dGx0bGx0bGx0bGx0bGx0bGx0bGx0bGw==",
        xorKey: "fruit_chat_2024"
    };
    
    window.API_KEYS = {
        huggingface: xorDecrypt(ENCRYPTED_DATA.key, ENCRYPTED_DATA.xorKey)
    };

    // Остальная конфигурация...
    window.APP_CONFIG = {
        version: '1.2.0',
        maxMessageLength: 1000,
        maxChats: 15,
        theme: 'light',
        fruitRain: {
            enabled: true,
            density: 25,
            spawnInterval: 200,
            speed: { min: 8, max: 15 },
            size: { min: 28, max: 42 },
            opacity: { min: 0.8, max: 1.0 }
        }
    };
    
    console.log('🎯 Конфигурация Фруктик Чата загружена');
})();
