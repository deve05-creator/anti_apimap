/**
 * RouteFinder - OpenStreetMap Nominatim 거리측정 및 경로 탐색
 * Vercel 배포 최적화 순수 바닐라 자바스크립트 구현체
 */

// ==========================================
// 1. 상태 관리 (State Management)
// ==========================================
const state = {
  origin: null,      // { name, displayName, lat, lon }
  destination: null, // { name, displayName, lat, lon }
  routePolyline: null,
  originMarker: null,
  destMarker: null,
  searchCache: new Map(), // 캐시로 불필요한 중복 API 호출 방지
};

// ==========================================
// 2. DOM 요소 참조
// ==========================================
const DOM = {
  originInput: document.getElementById('origin-input'),
  destInput: document.getElementById('dest-input'),
  originClear: document.getElementById('btn-clear-origin'),
  destClear: document.getElementById('btn-clear-dest'),
  originSuggestions: document.getElementById('origin-suggestions'),
  destSuggestions: document.getElementById('dest-suggestions'),
  originSpinner: document.getElementById('origin-spinner'),
  destSpinner: document.getElementById('dest-spinner'),
  originSelectedInfo: document.getElementById('origin-selected-info'),
  destSelectedInfo: document.getElementById('dest-selected-info'),
  originDisplayName: document.getElementById('origin-display-name'),
  destDisplayName: document.getElementById('dest-display-name'),
  btnSwap: document.getElementById('btn-swap'),
  btnCalculate: document.getElementById('btn-calculate'),
  btnReset: document.getElementById('btn-reset'),
  resultContainer: document.getElementById('result-container'),
  roadDistanceVal: document.getElementById('road-distance-val'),
  estimatedTimeText: document.getElementById('estimated-time-text'),
  metricRoadKm: document.getElementById('metric-road-km'),
  metricDirectKm: document.getElementById('metric-direct-km'),
  summaryOriginAddr: document.getElementById('summary-origin-addr'),
  summaryOriginCoords: document.getElementById('summary-origin-coords'),
  summaryDestAddr: document.getElementById('summary-dest-addr'),
  summaryDestCoords: document.getElementById('summary-dest-coords'),
  btnViewExternalMap: document.getElementById('btn-view-external-map'),
  routeTypeTag: document.getElementById('route-type-tag'),
  toastMessage: document.getElementById('toast-message'),
  quickTags: document.querySelectorAll('.quick-tag'),
};

// ==========================================
// 3. Leaflet 지도 초기화
// ==========================================
let map;

function initMap() {
  // 대한민국 중심 좌표 (대전 부근)
  const defaultCenter = [36.3504, 127.3845];
  const defaultZoom = 7;

  map = L.map('map', {
    center: defaultCenter,
    zoom: defaultZoom,
    zoomControl: true,
  });

  // OpenStreetMap 타일 레이어 (무료, 오픈소스)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // 반응형 리사이즈 대응
  window.addEventListener('resize', () => {
    map.invalidateSize();
  });
}

// 커스텀 마커 아이콘 생성기
function createCustomPin(type) {
  const isStart = type === 'start';
  const pinClass = isStart ? 'start-pin' : 'dest-pin';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-pin ${pinClass}">
        <div class="marker-pin-inner"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

// ==========================================
// 4. OpenStreetMap Nominatim API 검색 & 지오코딩
// ==========================================
/**
 * Nominatim API를 통해 키워드로 실제 위치 목록 검색
 * @param {string} query 검색어
 * @returns {Promise<Array>} 검색 결과 리스트
 */
async function searchNominatim(query) {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  // 캐시 확인
  if (state.searchCache.has(trimmed)) {
    return state.searchCache.get(trimmed);
  }

  // OpenStreetMap Nominatim Search Endpoint
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    trimmed
  )}&addressdetails=1&limit=6&accept-language=ko,en`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        showToast('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', 'error');
      }
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const data = await response.json();
    state.searchCache.set(trimmed, data);
    return data;
  } catch (error) {
    console.error('Nominatim search failed:', error);
    return [];
  }
}

// 디바운스 유틸리티 (입력 중 폭발적인 API 요청 방지)
function debounce(func, delay = 350) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
}

// ==========================================
// 5. 자동완성 UI 제어
// ==========================================
function setupAutocomplete(type) {
  const isOrigin = type === 'origin';
  const inputEl = isOrigin ? DOM.originInput : DOM.destInput;
  const listEl = isOrigin ? DOM.originSuggestions : DOM.destSuggestions;
  const spinnerEl = isOrigin ? DOM.originSpinner : DOM.destSpinner;
  const clearEl = isOrigin ? DOM.originClear : DOM.destClear;

  const handleInput = debounce(async () => {
    const query = inputEl.value.trim();

    if (!query) {
      listEl.innerHTML = '';
      listEl.classList.remove('show');
      clearEl.style.display = 'none';
      return;
    }

    clearEl.style.display = 'block';
    spinnerEl.style.display = 'block';

    try {
      const results = await searchNominatim(query);
      renderSuggestions(results, listEl, type);
    } catch (err) {
      console.error(err);
    } finally {
      spinnerEl.style.display = 'none';
    }
  }, 350);

  inputEl.addEventListener('input', handleInput);

  inputEl.addEventListener('focus', () => {
    if (listEl.children.length > 0) {
      listEl.classList.add('show');
    }
  });

  clearEl.addEventListener('click', () => {
    inputEl.value = '';
    clearEl.style.display = 'none';
    listEl.innerHTML = '';
    listEl.classList.remove('show');
    if (isOrigin) {
      state.origin = null;
      DOM.originSelectedInfo.style.display = 'none';
      if (state.originMarker) map.removeLayer(state.originMarker);
    } else {
      state.destination = null;
      DOM.destSelectedInfo.style.display = 'none';
      if (state.destMarker) map.removeLayer(state.destMarker);
    }
    inputEl.focus();
  });
}

function renderSuggestions(items, listEl, type) {
  listEl.innerHTML = '';

  if (!items || items.length === 0) {
    const emptyLi = document.createElement('li');
    emptyLi.className = 'suggestion-item';
    emptyLi.innerHTML = `
      <span class="suggestion-name" style="color: var(--text-muted); font-size: 0.8rem;">
        검색된 장소가 없습니다. 상세 주소나 다른 명칭으로 입력해보세요.
      </span>
    `;
    listEl.appendChild(emptyLi);
    listEl.classList.add('show');
    return;
  }

  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'suggestion-item';
    li.setAttribute('role', 'option');

    // 대표 명칭 분리 (쉼표 기준 첫 번째 부분)
    const parts = item.display_name.split(',');
    const mainTitle = parts[0].trim();
    const subTitle = parts.slice(1).join(',').trim();

    li.innerHTML = `
      <span class="suggestion-name">${escapeHTML(mainTitle)}</span>
      <span class="suggestion-detail" title="${escapeHTML(item.display_name)}">${escapeHTML(subTitle || item.display_name)}</span>
    `;

    li.addEventListener('click', () => {
      selectPlace(type, {
        name: mainTitle,
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      });
      listEl.classList.remove('show');
    });

    listEl.appendChild(li);
  });

  listEl.classList.add('show');
}

// 장소 선택 처리
function selectPlace(type, placeData) {
  const isOrigin = type === 'origin';
  const inputEl = isOrigin ? DOM.originInput : DOM.destInput;
  const badgeEl = isOrigin ? DOM.originSelectedInfo : DOM.destSelectedInfo;
  const badgeText = isOrigin ? DOM.originDisplayName : DOM.destDisplayName;

  inputEl.value = placeData.name;
  badgeText.textContent = `확인됨: ${placeData.displayName}`;
  badgeEl.style.display = 'block';

  if (isOrigin) {
    state.origin = placeData;
    updateMarker('origin', placeData);
  } else {
    state.destination = placeData;
    updateMarker('destination', placeData);
  }

  // 지도 이동
  map.setView([placeData.lat, placeData.lon], 14, { animate: true });
}

// 마커 업데이트
function updateMarker(type, place) {
  const isOrigin = type === 'origin';
  const icon = createCustomPin(isOrigin ? 'start' : 'dest');
  const popupContent = `
    <strong>${isOrigin ? '🟢 출발지' : '🔴 도착지'}</strong><br/>
    <b>${escapeHTML(place.name)}</b><br/>
    <span style="font-size:0.75rem; color:#94a3b8;">${escapeHTML(place.displayName)}</span>
  `;

  if (isOrigin) {
    if (state.originMarker) map.removeLayer(state.originMarker);
    state.originMarker = L.marker([place.lat, place.lon], { icon }).addTo(map);
    state.originMarker.bindPopup(popupContent).openPopup();
  } else {
    if (state.destMarker) map.removeLayer(state.destMarker);
    state.destMarker = L.marker([place.lat, place.lon], { icon }).addTo(map);
    state.destMarker.bindPopup(popupContent).openPopup();
  }
}

// 외부 클릭 시 제안 드롭다운 닫기
document.addEventListener('click', (e) => {
  if (!e.target.closest('.input-card')) {
    DOM.originSuggestions.classList.remove('show');
    DOM.destSuggestions.classList.remove('show');
  }
});

// ==========================================
// 6. 거리 계산 로직 (Haversine & OSRM)
// ==========================================

/**
 * 하버사인 공식 (직선거리 구하기, km 단위)
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 지구 평균 반경 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * OSRM (Open Source Routing Machine) API로 도로 주행 거리 및 경로 폴리라인 가져오기
 */
async function fetchOsrmRoute(origin, dest) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${dest.lon},${dest.lat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM routing service failed');
    const data = await res.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const primaryRoute = data.routes[0];
      return {
        distanceKm: (primaryRoute.distance / 1000), // m -> km
        durationSec: primaryRoute.duration,         // 초 단위
        coordinates: primaryRoute.geometry.coordinates, // [ [lon, lat], ... ]
      };
    }
    return null;
  } catch (error) {
    console.warn('OSRM Route fetch error, fallback to straight line:', error);
    return null;
  }
}

/**
 * 소요 시간 텍스트 포맷 (예: 2시간 15분)
 */
function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    return `약 ${mins}분 (차량 주행 기준)`;
  }
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 
    ? `약 ${hours}시간 ${remainMins}분 (차량 주행 기준)` 
    : `약 ${hours}시간 (차량 주행 기준)`;
}

// ==========================================
// 7. 메인 거리 측정 실행 함수
// ==========================================
async function calculateDistance() {
  const originVal = DOM.originInput.value.trim();
  const destVal = DOM.destInput.value.trim();

  if (!originVal) {
    showToast('출발지를 입력해주세요.', 'error');
    DOM.originInput.focus();
    return;
  }

  if (!destVal) {
    showToast('도착지를 입력해주세요.', 'error');
    DOM.destInput.focus();
    return;
  }

  DOM.btnCalculate.disabled = true;
  DOM.btnCalculate.innerHTML = `
    <span class="input-spinner" style="position:static; display:inline-block; margin-right:4px;"></span>
    <span>경로 탐색 중...</span>
  `;

  try {
    // 1) 상태에 미선택된 경우 직접 Nominatim으로 최적 매칭 검색
    if (!state.origin || state.origin.name !== originVal) {
      const results = await searchNominatim(originVal);
      if (!results || results.length === 0) {
        showToast(`출발지 "${originVal}"의 정확한 위치를 찾지 못했습니다.`, 'error');
        return;
      }
      selectPlace('origin', {
        name: results[0].display_name.split(',')[0],
        displayName: results[0].display_name,
        lat: parseFloat(results[0].lat),
        lon: parseFloat(results[0].lon),
      });
    }

    if (!state.destination || state.destination.name !== destVal) {
      const results = await searchNominatim(destVal);
      if (!results || results.length === 0) {
        showToast(`도착지 "${destVal}"의 정확한 위치를 찾지 못했습니다.`, 'error');
        return;
      }
      selectPlace('destination', {
        name: results[0].display_name.split(',')[0],
        displayName: results[0].display_name,
        lat: parseFloat(results[0].lat),
        lon: parseFloat(results[0].lon),
      });
    }

    const { origin, destination } = state;

    // 2) 직선 거리 (Haversine) 계산
    const straightKm = calculateHaversineDistance(
      origin.lat,
      origin.lon,
      destination.lat,
      destination.lon
    );

    // 3) 실제 도로 주행 거리 및 경로 (OSRM API) 요청
    const osrmData = await fetchOsrmRoute(origin, destination);

    let finalDistanceKm = straightKm;
    let durationText = '직선 거리 기준 계산';

    // 기존 경로선 제거
    if (state.routePolyline) {
      map.removeLayer(state.routePolyline);
    }

    if (osrmData) {
      finalDistanceKm = osrmData.distanceKm;
      durationText = formatDuration(osrmData.durationSec);
      DOM.routeTypeTag.textContent = '실제 도로 경로';

      // GeoJSON은 [lon, lat] 형식이므로 Leaflet용 [lat, lon]으로 반전
      const latLngs = osrmData.coordinates.map((coord) => [coord[1], coord[0]]);

      state.routePolyline = L.polyline(latLngs, {
        color: '#4f46e5',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    } else {
      // OSRM 실패 시 직선 점선으로 폴백
      DOM.routeTypeTag.textContent = '직선 기준 거리';
      const straightCoords = [
        [origin.lat, origin.lon],
        [destination.lat, destination.lon],
      ];
      state.routePolyline = L.polyline(straightCoords, {
        color: '#6366f1',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.8,
      }).addTo(map);
    }

    // 지도 뷰포트를 두 지점이 모두 보이도록 자동 줌/팬 맞춤
    const bounds = L.latLngBounds([
      [origin.lat, origin.lon],
      [destination.lat, destination.lon],
    ]);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });

    // 4) UI 결과 영역 표시 및 데이터 바인딩
    DOM.roadDistanceVal.textContent = finalDistanceKm.toFixed(1);
    DOM.estimatedTimeText.textContent = durationText;
    DOM.metricRoadKm.textContent = `${finalDistanceKm.toFixed(2)} km`;
    DOM.metricDirectKm.textContent = `${straightKm.toFixed(2)} km`;

    DOM.summaryOriginAddr.textContent = origin.name;
    DOM.summaryOriginCoords.textContent = `위도: ${origin.lat.toFixed(4)}, 경도: ${origin.lon.toFixed(4)}`;

    DOM.summaryDestAddr.textContent = destination.name;
    DOM.summaryDestCoords.textContent = `위도: ${destination.lat.toFixed(4)}, 경도: ${destination.lon.toFixed(4)}`;

    // 5) [Requirement 7]: "지도에서 보기" OpenStreetMap 다이렉트 링크 생성
    // OpenStreetMap 공식 길찾기 엔진 파라미터 규격 적용
    const osmDirectionsUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(
      `${origin.lat},${origin.lon};${destination.lat},${destination.lon}`
    )}`;
    DOM.btnViewExternalMap.href = osmDirectionsUrl;

    DOM.resultContainer.style.display = 'flex';
    DOM.resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    showToast('거리 및 경로 측정이 완료되었습니다.', 'info');
  } catch (error) {
    console.error('Calculation error:', error);
    showToast('거리 계산 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
  } finally {
    DOM.btnCalculate.disabled = false;
    DOM.btnCalculate.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <span>거리 계산하기</span>
    `;
  }
}

// ==========================================
// 8. 부가 기능 (스왑, 리셋, 빠른 예시, 토스트)
// ==========================================

// 출발지 & 도착지 스왑 (맞바꾸기)
function swapLocations() {
  const tempOrigin = state.origin;
  state.origin = state.destination;
  state.destination = tempOrigin;

  const tempVal = DOM.originInput.value;
  DOM.originInput.value = DOM.destInput.value;
  DOM.destInput.value = tempVal;

  if (state.origin) {
    DOM.originDisplayName.textContent = `확인됨: ${state.origin.displayName}`;
    DOM.originSelectedInfo.style.display = 'block';
    DOM.originClear.style.display = 'block';
    updateMarker('origin', state.origin);
  } else {
    DOM.originSelectedInfo.style.display = 'none';
    DOM.originClear.style.display = 'none';
    if (state.originMarker) map.removeLayer(state.originMarker);
  }

  if (state.destination) {
    DOM.destDisplayName.textContent = `확인됨: ${state.destination.displayName}`;
    DOM.destSelectedInfo.style.display = 'block';
    DOM.destClear.style.display = 'block';
    updateMarker('destination', state.destination);
  } else {
    DOM.destSelectedInfo.style.display = 'none';
    DOM.destClear.style.display = 'none';
    if (state.destMarker) map.removeLayer(state.destMarker);
  }

  // 둘 다 있는 경우 즉시 다시 계산
  if (state.origin && state.destination) {
    calculateDistance();
  }
}

// 전체 초기화
function resetAll() {
  state.origin = null;
  state.destination = null;

  DOM.originInput.value = '';
  DOM.destInput.value = '';
  DOM.originClear.style.display = 'none';
  DOM.destClear.style.display = 'none';
  DOM.originSelectedInfo.style.display = 'none';
  DOM.destSelectedInfo.style.display = 'none';
  DOM.originSuggestions.classList.remove('show');
  DOM.destSuggestions.classList.remove('show');

  if (state.originMarker) map.removeLayer(state.originMarker);
  if (state.destMarker) map.removeLayer(state.destMarker);
  if (state.routePolyline) map.removeLayer(state.routePolyline);

  DOM.resultContainer.style.display = 'none';
  map.setView([36.3504, 127.3845], 7, { animate: true });
  showToast('검색 내용이 초기화되었습니다.', 'info');
}

// 토스트 메시지 알림
function showToast(msg, type = 'info') {
  DOM.toastMessage.textContent = msg;
  DOM.toastMessage.className = `toast-box toast-${type}`;
  DOM.toastMessage.style.display = 'flex';

  setTimeout(() => {
    DOM.toastMessage.style.display = 'none';
  }, 3500);
}

// HTML 특수문자 이스케이프 (XSS 방지)
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================
// 9. 이벤트 리스너 등록
// ==========================================
function setupEventListeners() {
  setupAutocomplete('origin');
  setupAutocomplete('dest');

  DOM.btnSwap.addEventListener('click', swapLocations);
  DOM.btnCalculate.addEventListener('click', calculateDistance);
  DOM.btnReset.addEventListener('click', resetAll);

  // Enter 키 입력 시 거리 계산
  DOM.originInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      DOM.destInput.focus();
    }
  });

  DOM.destInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      calculateDistance();
    }
  });

  // 추천 빠른 검색 태그 클릭 이벤트
  DOM.quickTags.forEach((btn) => {
    btn.addEventListener('click', () => {
      const start = btn.dataset.start;
      const dest = btn.dataset.dest;

      DOM.originInput.value = start;
      DOM.destInput.value = dest;
      DOM.originClear.style.display = 'block';
      DOM.destClear.style.display = 'block';

      calculateDistance();
    });
  });
}

// ==========================================
// 10. 앱 부트스트랩 실행
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  setupEventListeners();
  console.log('RouteFinder initialized successfully.');
});
