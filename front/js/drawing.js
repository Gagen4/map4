/**
 * Управляет рисованием маркеров, линий и полигонов.
 * @module drawing
 */
import { state } from './mapInit.js';
import { selectObject } from './selection.js';

/**
 * Настраивает обработчики кликов по карте для рисования.
 */
function setupMapHandlers() {
  if (!state.map) return;
  state.map.on('click', (e) => {
    if (state.currentTool === 'marker') {
      addMarker(e.latlng);
    } else if (state.currentTool === 'line') {
      addLinePoint(e.latlng);
    } else if (state.currentTool === 'polygon') {
      addPolygonPoint(e.latlng);
    } else if (state.currentTool === 'delete') {
      selectObject(e.latlng);
    }
  });
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
  const marker = L.marker(latlng, { icon: new L.Icon.Default() }).addTo(state.drawnItems);
  marker.bindPopup('Маркер').openPopup();
  marker.on('click', () => selectObject(marker));
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

  state.drawnItems.clearLayers();

  if (geojson.type !== 'FeatureCollection') {
    console.error('Неверный формат GeoJSON');
    return;
  }

  geojson.features.forEach((feature) => {
    if (feature.geometry.type === 'Point') {
      const latlng = L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
      const marker = L.marker(latlng, { icon: new L.Icon.Default() }).addTo(state.drawnItems);
      marker.bindPopup(feature.properties.name || 'Маркер');
      marker.on('click', () => selectObject(marker));
    } else if (feature.geometry.type === 'LineString') {
      const latlngs = feature.geometry.coordinates.map(([lng, lat]) => L.latLng(lat, lng));
      const line = L.polyline(latlngs, { color: 'red' }).addTo(state.drawnItems);
      line.bindPopup(feature.properties.name || 'Линия');
      line.on('click', () => selectObject(line));
    } else if (feature.geometry.type === 'Polygon') {
      const latlngs = feature.geometry.coordinates[0].map(([lng, lat]) => L.latLng(lat, lng));
      const polygon = L.polygon([latlngs], { color: 'green' }).addTo(state.drawnItems);
      polygon.bindPopup(feature.properties.name || 'Полигон');
      polygon.on('click', () => selectObject(polygon));
    }
  });
}

export { setupMapHandlers, addMarker, addLinePoint, addPolygonPoint, finishDrawing, resetDrawing, exportToGeoJSON, importFromGeoJSON };