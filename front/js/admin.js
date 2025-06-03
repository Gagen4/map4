import { importFromGeoJSON } from './drawing.js';
import { state } from './mapInit.js';


//Загружает список всех файлов для админа
async function loadAdminFileList() {
    try {
        console.log('Запрос списка всех файлов для администратора...');
        const response = await fetch('http://127.0.0.1:3000/admin/files', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка получения списка файлов для админа:', response.status, errorText);
            throw new Error('Ошибка получения списка файлов');
        }

        const files = await response.json();
        console.log('Получен список файлов для админа:', files);
        const select = document.getElementById('admin-file-list');
        if (select) {
            select.innerHTML = '<option value="">Select user file...</option>';
            files.forEach(file => {
                const option = document.createElement('option');
                option.value = `${file.username}/${file.fileName}`;
                option.textContent = `${file.username} - ${file.fileName}`;
                select.appendChild(option);
            });
        } else {
            console.error('Элемент admin-file-list не найден в DOM');
        }
    } catch (error) {
        console.error('Ошибка загрузки списка файлов для админа:', error);
        // Не выводим ошибку на UI, чтобы не отвлекать администратора
    }
}

//Загружает выбранный файл
async function loadSelectedFile() {
    const select = document.getElementById('admin-file-list');
    const value = select.value;
    
    if (!value) {
        document.getElementById('error-message').textContent = 'Выберите файл для загрузки';
        return;
    }

    const [username, fileName] = value.split('/');

    try {
        const response = await fetch(`http://127.0.0.1:3000/admin/load/${username}/${fileName}`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Ошибка загрузки файла');
        }

        const geojsonData = await response.json();
        state.drawnItems.clearLayers();
        importFromGeoJSON(geojsonData);
        document.getElementById('error-message').textContent = '';
    } catch (error) {
        console.error('Ошибка загрузки файла:', error);
        document.getElementById('error-message').textContent = error.message;
    }
}

//Инициализация админских функций
function initAdmin() {
    document.addEventListener('authSuccess', () => {
        // Обновляем список файлов при успешной авторизации
        loadAdminFileList();
    });

    // Добавляем обработчик для кнопки загрузки
    const loadButton = document.getElementById('admin-load-file');
    if (loadButton) {
        loadButton.addEventListener('click', loadSelectedFile);
    }
}

export { initAdmin }; 