/**
 * Инициализирует кнопки инструментов и их обработчики событий.
 * @module tools
 */
import { state } from './mapInit.js';
import { finishDrawing, resetDrawing, exportToGeoJSON, importFromGeoJSON } from './drawing.js';
import { updateToolButtons, showHelp } from './ui.js';

/**
 * Инициализирует обработчики событий для кнопок инструментов.
 */
function initTools() {
  // Кэширование элементов кнопок
  const buttons = {
    marker: document.getElementById('add-marker'),
    line: document.getElementById('add-line'),
    polygon: document.getElementById('add-polygon'),
    delete: document.getElementById('delete-object'),
    clear: document.getElementById('clear-all'),
    save: document.getElementById('save-map'),
    load: document.getElementById('load-map'),
  };

  // Проверка наличия кнопок
  for (const [key, btn] of Object.entries(buttons)) {
    if (!btn) {
      console.error(`Кнопка ${key} (#${key === 'save' ? 'save-map' : key === 'load' ? 'load-map' : key}) не найдена`);
      document.getElementById('error-message').textContent = `Кнопка ${key} не найдена`;
      return;
    }
  }

  // Добавление маркера
  buttons.marker.addEventListener('click', () => {
    finishDrawing(state);
    resetDrawing(state, false);
    state.currentTool = 'marker';
    updateToolButtons(state);
    showHelp('Кликните на карте, чтобы добавить маркер');
  });

  // Добавление линии
  buttons.line.addEventListener('click', () => {
    finishDrawing(state);
    resetDrawing(state, false);
    state.currentTool = 'line';
    updateToolButtons(state);
    showHelp('Кликните на карте, чтобы добавить точки линии. Нажмите Esc для завершения.');
  });

  // Добавление полигона
  buttons.polygon.addEventListener('click', () => {
    finishDrawing(state);
    resetDrawing(state, false);
    state.currentTool = 'polygon';
    updateToolButtons(state);
    showHelp('Кликните на карте, чтобы добавить точки полигона. Нажмите Esc для завершения.');
  });

  // Удаление объекта
  buttons.delete.addEventListener('click', () => {
    finishDrawing(state);
    if (state.selectedLayer) {
      state.drawnItems.removeLayer(state.selectedLayer);
      state.selectedLayer = null;
    }
    resetDrawing(state, false);
    state.currentTool = 'delete';
    updateToolButtons(state);
    showHelp('Кликните на объект, чтобы удалить его');
  });

  // Очистка всех объектов
  buttons.clear.addEventListener('click', () => {
    state.drawnItems.clearLayers();
    resetDrawing(state, true);
    state.currentTool = null;
    updateToolButtons(state);
    showHelp('Все объекты очищены');
  });

  // ... (остальной код без изменений)

// Сохранение карты
buttons.save.addEventListener('click', async () => {
  const fileNameInput = document.getElementById('save-file-name');
  const fileName = fileNameInput.value.trim();
  if (!fileName) {
    showHelp('Ошибка: Введите имя файла для сохранения');
    return;
  }

  const geojson = exportToGeoJSON();
  if (!geojson || geojson.features.length === 0) {
    showHelp('Ошибка: На карте нет объектов для сохранения');
    return;
  }

  try {
    const response = await fetch('http://localhost:5255/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, geoJsonData: JSON.stringify(geojson) })
    });
    if (!response.ok) {
      console.error('Response:', await response.text());
      throw new Error(`HTTP ошибка! Статус: ${response.status}`);
    }
    const result = await response.json();
    showHelp(`Сохранено: ${result.message}`);
    await updateFileList();
  } catch (error) {
    console.error('Ошибка сохранения:', error);
    showHelp('Ошибка при сохранении. Проверьте консоль.');
  }
});

// Загрузка карты
buttons.load.addEventListener('click', async () => {
  const fileSelect = document.getElementById('load-file-name');
  const fileName = fileSelect.value;
  if (!fileName) {
    showHelp('Ошибка: Выберите файл для загрузки');
    return;
  }

  try {
    const response = await fetch(`http://localhost:5255/api/load/${fileName}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      console.error('Response:', await response.text());
      throw new Error(`HTTP ошибка! Статус: ${response.status}`);
    }
    const geojson = await response.json();
    importFromGeoJSON(geojson);
    showHelp(`Загружен файл: ${fileName}`);
  } catch (error) {
    console.error('Ошибка загрузки:', error);
    showHelp('Ошибка при загрузке. Проверьте консоль.');
  }
});
}

export { initTools };