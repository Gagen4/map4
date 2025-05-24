/**
 * Управляет обновлением интерфейса (кнопки, текст подсказок, координаты).
 * @module ui
 */
import { state } from './mapInit.js';

/**
 * Обновляет состояние кнопок инструментов.
 * @param {MapState} state - Глобальное состояние.
 */
function updateToolButtons(state) {
  console.log('Обновление кнопок, currentTool:', state.currentTool);
  document.querySelectorAll('.tools button').forEach((btn) => {
    btn.classList.remove('active');
  });

  if (state.currentTool) {
    const btnId = state.currentTool === 'delete' ? 'delete-object' : `add-${state.currentTool}`;
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.classList.add('active');
    } else {
      console.warn(`Кнопка с ID ${btnId} не найдена`);
      document.getElementById('error-message').textContent = `Кнопка ${btnId} не найдена`;
    }
  }
}

/**
 * Отображает текст подсказки или ошибки.
 * @param {string} message - Сообщение для отображения.
 */
function showHelp(message) {
  const help = document.getElementById('help-text');
  const error = document.getElementById('error-message');
  if (help) help.textContent = message;
  if (error) error.textContent = message.startsWith('Ошибка') ? message : '';
}

/**
 * Инициализирует отображение координат с дебансированием.
 */
function initCoordinates() {
  if (!state.map) {
    console.error('Карта не инициализирована для обновления координат');
    document.getElementById('error-message').textContent = 'Карта не инициализирована';
    return;
  }

  let timeout;
  state.map.on('mousemove', (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const lat = document.getElementById('lat');
      const lng = document.getElementById('lng');
      if (lat && lng) {
        lat.textContent = e.latlng.lat.toFixed(6);
        lng.textContent = e.latlng.lng.toFixed(6);
      } else {
        console.warn('Элементы координат (#lat, #lng) не найдены');
        document.getElementById('error-message').textContent = 'Элементы координат не найдены';
      }
    }, 50);
  });
}

/**
 * Обновляет список файлов.
 */
async function updateFileList() {
  try {
    const response = await fetch('http://localhost:5255/api/files', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ошибка! Статус: ${response.status}, Сообщение: ${errorText}`);
    }
    const files = await response.json();
    const select = document.getElementById('load-file-name');
    if (!select) {
      throw new Error('Элемент #load-file-name не найден');
    }
    select.innerHTML = '<option value="">Выберите файл</option>';
    files.forEach(file => {
      const option = document.createElement('option');
      option.value = file;
      option.textContent = file;
      select.appendChild(option);
    });
    showHelp('Список файлов обновлён');
  } catch (error) {
    console.error('Ошибка обновления списка файлов:', error);
    showHelp(`Ошибка загрузки списка файлов: ${error.message}`);
  }
}

export { updateToolButtons, showHelp, initCoordinates, updateFileList };