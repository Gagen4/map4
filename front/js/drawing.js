/**
 * Управляет рисованием маркеров, линий и полигонов.
 * @module drawing
 */
import { state } from './mapInit.js';
import { selectObject } from './selection.js';
import { saveMapData } from './api.js';

// Таймер для дебаунсинга сохранения
let saveTimeout = null;
let lastSaveTime = 0;
const MIN_SAVE_INTERVAL = 2000; // Минимальный интервал между сохранениями (2 секунды)

/**
 * Настраивает обработчики кликов по карте для рисования.
 */
function setupMapHandlers() {
  if (!state.map) return;
  
  // Предотвращаем отправку формы по умолчанию
  document.addEventListener('submit', (e) => {
    e.preventDefault();
  });

  state.map.on('click', (e) => {
    if (state.currentTool === 'marker') {
      e.originalEvent.preventDefault();
      addMarker(e.latlng);
    } else if (state.currentTool === 'line') {
      e.originalEvent.preventDefault();
      addLinePoint(e.latlng);
    } else if (state.currentTool === 'polygon') {
      e.originalEvent.preventDefault();
      addPolygonPoint(e.latlng);
    } else if (state.currentTool === 'delete') {
      e.originalEvent.preventDefault();
      selectObject(e.latlng);
    }
  });
}

/**
 * Сохраняет текущее состояние карты на сервер с дебаунсингом.
 * @param {boolean} [forceSave=false] - Принудительное сохранение, игнорируя дебаунсинг
 */
async function saveCurrentState(forceSave = false) {
  try {
    const now = Date.now();
    
    // Если это не принудительное сохранение, применяем дебаунсинг
    if (!forceSave) {
      // Проверяем, прошло ли достаточно времени с последнего сохранения
      if (now - lastSaveTime < MIN_SAVE_INTERVAL) {
        // Если нет, отменяем предыдущий таймер и устанавливаем новый
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }
        saveTimeout = setTimeout(() => saveCurrentState(true), MIN_SAVE_INTERVAL);
        return;
      }
    }

    // Обновляем время последнего сохранения
    lastSaveTime = now;

    // Не сохраняем автоматически, только если это принудительное сохранение
    if (forceSave) {
      const geojson = exportToGeoJSON();
      await saveMapData(geojson);
      console.log('Данные карты успешно сохранены');
    }
  } catch (error) {
    console.error('Ошибка при сохранении данных карты:', error);
  }
}

/**
 * Добавляет маркер на карту.
 * @param {L.LatLng} latlng - Координаты маркера.
 */
function addMarker(latlng) {
  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return;
  }

  try {
    const marker = L.marker(latlng, { 
      draggable: true // Делаем маркер перетаскиваемым
    }).addTo(state.drawnItems);
    
    marker.bindPopup('Маркер').openPopup();
    
    // Добавляем обработчики событий для маркера
    marker.on('click', (e) => {
      e.originalEvent?.preventDefault();
      selectObject(marker);
    });
    
    // Не сохраняем автоматически при перетаскивании
    marker.on('dragend', (e) => {
      e.originalEvent?.preventDefault();
    });
  } catch (error) {
    console.error('Ошибка при добавлении маркера:', error);
  }
}

/**
 * Добавляет точку к временной линии.
 * @param {L.LatLng} latlng - Координаты точки.
 */
function addLinePoint(latlng) {
  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return;
  }
  state.tempPoints.push(latlng);

  if (state.tempLayer) {
    state.map.removeLayer(state.tempLayer);
    state.tempLayer = null;
  }

  if (state.tempPoints.length >= 2) {
    state.tempLayer = L.polyline(state.tempPoints, {
      color: 'blue',
      dashArray: '5,5',
      weight: 2,
    }).addTo(state.map);
  }
}

/**
 * Добавляет точку к временному полигону.
 * @param {L.LatLng} latlng - Координаты точки.
 */
function addPolygonPoint(latlng) {
  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return;
  }
  state.tempPoints.push(latlng);

  if (state.tempLayer) {
    state.map.removeLayer(state.tempLayer);
    state.tempLayer = null;
  }

  if (state.tempPoints.length >= 3) {
    state.tempLayer = L.polygon([state.tempPoints], {
      color: 'green',
      dashArray: '5,5',
      fillOpacity: 0.2,
    }).addTo(state.map);
  }
}

/**
 * Завершает рисование линии или полигона и добавляет их в drawnItems.
 * @param {MapState} state - Глобальное состояние.
 */
function finishDrawing(state) {
  if (state.tempPoints.length === 0) return;

  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return;
  }

  if (state.currentTool === 'line' && state.tempPoints.length >= 2) {
    const line = L.polyline(state.tempPoints, { color: 'red' }).addTo(state.drawnItems);
    line.bindPopup('Линия');
    line.on('click', () => selectObject(line));
  } else if (state.currentTool === 'polygon' && state.tempPoints.length >= 3) {
    const polygon = L.polygon([state.tempPoints], { color: 'green' }).addTo(state.drawnItems);
    polygon.bindPopup('Полигон');
    polygon.on('click', () => selectObject(polygon));
  }

  if (state.tempLayer) {
    state.map.removeLayer(state.tempLayer);
    state.tempLayer = null;
  }
  state.tempPoints = [];
}

/**
 * Сбрасывает состояние рисования.
 * @param {MapState} state - Глобальное состояние.
 * @param {boolean} [fullReset=true] - Сбрасывать ли currentTool.
 */
function resetDrawing(state, fullReset = true) {
  if (state.tempLayer) {
    state.map.removeLayer(state.tempLayer);
    state.tempLayer = null;
  }
  state.tempPoints = [];
  if (fullReset) {
    state.currentTool = null;
  }
}

/**
 * Экспортирует слой drawnItems в GeoJSON.
 * @returns {Object} GeoJSON объект.
 */
function exportToGeoJSON() {
  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return null;
  }

  const geojson = {
    type: 'FeatureCollection',
    features: [],
  };

  state.drawnItems.eachLayer((layer) => {
    if (layer instanceof L.Marker) {
      geojson.features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [layer.getLatLng().lng, layer.getLatLng().lat],
        },
        properties: {
          name: layer.getPopup()?.getContent() || 'Маркер',
        },
      });
    } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
      geojson.features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: layer.getLatLngs().map((latlng) => [latlng.lng, latlng.lat]),
        },
        properties: {
          name: layer.getPopup()?.getContent() || 'Линия',
        },
      });
    } else if (layer instanceof L.Polygon) {
      geojson.features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [layer.getLatLngs()[0].map((latlng) => [latlng.lng, latlng.lat])],
        },
        properties: {
          name: layer.getPopup()?.getContent() || 'Полигон',
        },
      });
    }
  });

  return geojson;
}

/**
 * Импортирует GeoJSON в drawnItems.
 * @param {Object} geojson - GeoJSON объект.
 */
function importFromGeoJSON(geojson) {
  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return;
  }

  if (!geojson || !geojson.features) {
    console.error('Некорректный формат GeoJSON');
    return;
  }

  state.drawnItems.clearLayers();

  geojson.features.forEach((feature) => {
    try {
      if (feature.geometry.type === 'Point') {
        const [lng, lat] = feature.geometry.coordinates;
        const marker = L.marker([lat, lng], { 
          draggable: true // Делаем маркер перетаскиваемым
        }).addTo(state.drawnItems);
        
        if (feature.properties && feature.properties.name) {
          marker.bindPopup(feature.properties.name);
        }
        
        marker.on('click', () => selectObject(marker));
        marker.on('dragend', () => saveCurrentState());
      } else if (feature.geometry.type === 'LineString') {
        const coordinates = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const line = L.polyline(coordinates, { color: 'red' })
          .addTo(state.drawnItems);
        if (feature.properties && feature.properties.name) {
          line.bindPopup(feature.properties.name);
        }
        line.on('click', () => selectObject(line));
      } else if (feature.geometry.type === 'Polygon') {
        const coordinates = feature.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
        const polygon = L.polygon([coordinates], { color: 'green' })
          .addTo(state.drawnItems);
        if (feature.properties && feature.properties.name) {
          polygon.bindPopup(feature.properties.name);
        }
        polygon.on('click', () => selectObject(polygon));
      }
    } catch (error) {
      console.error('Ошибка при импорте объекта:', error);
    }
  });
}

export { setupMapHandlers, addMarker, addLinePoint, addPolygonPoint, finishDrawing, resetDrawing, exportToGeoJSON, importFromGeoJSON };