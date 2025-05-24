/**
 * Главная точка входа для приложения карты.
 * @module main
 */
import { initMap, state } from './mapInit.js';
import { initTools } from './tools.js';
import { setupMapHandlers, finishDrawing, resetDrawing } from './drawing.js';
import { initSearch } from './search.js';
import { initCoordinates, updateFileList } from './ui.js';

/**
 * Инициализирует приложение.
 */
async function init() {
  try {
    // Ожидание полной загрузки DOM
    await new Promise((resolve) => {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        resolve();
      } else {
        document.addEventListener('DOMContentLoaded', resolve);
      }
    });

    console.log('DOM загружен, инициализация карты...');
    // Инициализация карты
    await initMap();

    // Проверка успешной инициализации карты
    if (!state.map) {
      throw new Error('Инициализация карты не удалась');
    }

    console.log('Инициализация остальных модулей...');
    // Инициализация остальных модулей
    initTools();
    setupMapHandlers();
    initSearch();
    initCoordinates();
    await updateFileList(); // Обновление списка файлов

    // Обработка клавиши Escape для рисования
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        finishDrawing(state);
        resetDrawing(state, true);
      }
    });

    console.log('Приложение полностью инициализировано');
  } catch (error) {
    console.error('Ошибка инициализации приложения:', error);
    document.getElementById('error-message').textContent = 'Ошибка запуска приложения. Проверьте консоль.';
  }
}

// Запуск приложения
init();