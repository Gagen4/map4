/**
 * Управляет выбором и подсветкой объектов.
 * @module selection
 */
import { state } from './mapInit.js';

/**
 * Выбирает объект по клику или слою.
 * @param {L.LatLng|L.Layer} latlngOrLayer - Координаты или слой для выбора.
 */
function selectObject(latlngOrLayer) {
  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return;
  }

  resetSelection();

  let layer = latlngOrLayer;
  if (!(latlngOrLayer instanceof L.Layer)) {
    state.drawnItems.eachLayer((l) => {
      if (l instanceof L.Marker) {
        if (l.getLatLng().distanceTo(latlngOrLayer) < 20) {
          layer = l;
        }
      } else if (l instanceof L.Polyline) {
        if (isPointOnLine(latlngOrLayer, l.getLatLngs())) {
          layer = l;
        }
      } else if (l instanceof L.Polygon) {
        if (l.getBounds().contains(latlngOrLayer)) {
          layer = l;
        }
      }
    });
  }

  if (layer) {
    state.selectedLayer = layer;
    highlightLayer(layer);
  }
}

/**
 * Проверяет, находится ли точка рядом с линией.
 * @param {L.LatLng} point - Точка для проверки.
 * @param {L.LatLng[]} latlngs - Координаты линии.
 * @returns {boolean}
 */
function isPointOnLine(point, latlngs) {
  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return false;
  }

  for (let i = 0; i < latlngs.length - 1; i++) {
    const dist = L.GeometryUtil.distanceSegment(state.map, point, latlngs[i], latlngs[i + 1]);
    if (dist < 10) return true;
  }
  return false;
}

/**
 * Подсвечивает выбранный слой.
 * @param {L.Layer} layer - Слой для подсветки.
 */
function highlightLayer(layer) {
  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return;
  }

  if (layer instanceof L.Marker) {
    layer.setZIndexOffset(1000);
  } else {
    layer.setStyle({
      color: '#ff0000',
      weight: 3,
    });
  }
}

/**
 * Сбрасывает состояние выбора.
 */
function resetSelection() {
  if (typeof L === 'undefined') {
    console.error('Leaflet не загружен');
    return;
  }

  if (state.selectedLayer) {
    if (state.selectedLayer instanceof L.Marker) {
      state.selectedLayer.setZIndexOffset(0);
    } else {
      state.selectedLayer.setStyle({
        color: '#3388ff',
        weight: 2,
      });
    }
    state.selectedLayer = null;
  }
}

export { selectObject, isPointOnLine, highlightLayer, resetSelection };