// config.js
(function() {
    'use strict';
    
    window.API_KEYS = {
        huggingface: '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'
    };

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
