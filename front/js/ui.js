/**
 * Управляет обновлением интерфейса (кнопки, текст подсказок, координаты).
 * @module ui
 */
import { state } from './mapInit.js';
import { exportToGeoJSON, importFromGeoJSON } from './drawing.js';
import { isAuthenticated, getCurrentUser } from './auth.js';

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
 * Обновляет отображение координат
 */
function updateCoordinates(lat, lng) {
    const latElement = document.getElementById('lat');
    const lngElement = document.getElementById('lng');
    if (latElement && lngElement) {
        latElement.textContent = lat.toFixed(6);
        lngElement.textContent = lng.toFixed(6);
    } else {
        console.warn('Элементы координат (#lat, #lng) не найдены');
        document.getElementById('error-message').textContent = 'Элементы координат не найдены';
    }
}

/**
 * Инициализирует отображение координат с дебаунсингом.
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
            updateCoordinates(e.latlng.lat, e.latlng.lng);
        }, 50);
    });
}

/**
 * Обновляет список файлов
 */
async function updateFileList() {
    if (!isAuthenticated()) {
        console.log('Пользователь не авторизован');
        return;
    }

    try {
        console.log('Запрос списка файлов...');
        console.log('Текущие cookies:', document.cookie);
        
        const response = await fetch('http://127.0.0.1:3000/files', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Ошибка получения списка файлов:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Текст ошибки:', errorText);
            throw new Error('Ошибка получения списка файлов');
        }
        
        const files = await response.json();
        console.log('Получен список файлов:', files);
        
        const select = document.getElementById('load-file-name');
        select.innerHTML = '<option value="">Выберите файл...</option>';
        files.forEach(fileName => {
            const option = document.createElement('option');
            option.value = fileName;
            option.textContent = fileName;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка загрузки списка файлов:', error);
        document.getElementById('error-message').textContent = 'Ошибка загрузки списка файлов';
    }
}

/**
 * Сохраняет текущее состояние карты
 */
async function saveMap() {
    if (!isAuthenticated()) {
        document.getElementById('error-message').textContent = 'Необходимо войти в систему';
        return;
    }

    const fileName = document.getElementById('save-file-name').value;
    if (!fileName) {
        document.getElementById('error-message').textContent = 'Введите имя файла';
        return;
    }

    try {
        const currentUser = getCurrentUser();
        const fullFileName = `${currentUser.username}_${fileName}`;
        const geojsonData = exportToGeoJSON();
        
        console.log('Сохранение файла:', fullFileName);
        const response = await fetch('http://127.0.0.1:3000/save', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ fileName: fullFileName, geojsonData }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка сохранения:', response.status, errorText);
            throw new Error('Ошибка сохранения');
        }
        
        document.getElementById('save-file-name').value = '';
        await updateFileList();
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        document.getElementById('error-message').textContent = 'Ошибка сохранения карты';
    }
}

/**
 * Загружает сохраненное состояние карты
 */
async function loadMap() {
    if (!isAuthenticated()) {
        document.getElementById('error-message').textContent = 'Необходимо войти в систему';
        return;
    }

    const fileName = document.getElementById('load-file-name').value;
    if (!fileName) {
        document.getElementById('error-message').textContent = 'Выберите файл для загрузки';
        return;
    }

    try {
        console.log('Загрузка файла:', fileName);
        const response = await fetch(`http://127.0.0.1:3000/load/${fileName}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка загрузки:', response.status, errorText);
            throw new Error('Ошибка загрузки');
        }
        
        const geojsonData = await response.json();
        state.drawnItems.clearLayers();
        importFromGeoJSON(geojsonData);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        document.getElementById('error-message').textContent = 'Ошибка загрузки карты';
    }
}

/**
 * Инициализация обработчиков событий для UI
 */
function initUI() {
    document.getElementById('save-map').addEventListener('click', saveMap);
    document.getElementById('load-map').addEventListener('click', loadMap);
}

export { 
    updateToolButtons, 
    showHelp, 
    initCoordinates, 
    updateFileList, 
    saveMap, 
    loadMap,
    initUI 
};