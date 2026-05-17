import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { NDA_MAP_STYLE } from '../config/map';

const BE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ─── Polyline decoder ──────────────────────────────────────────────────────── */
function decodePoly(enc) {
  const res = [];
  let i = 0, lat = 0, lng = 0;
  while (i < enc.length) {
    let b, s = 0, v = 0;
    do { b = enc.charCodeAt(i++) - 63; v |= (b & 31) << s; s += 5; } while (b >= 32);
    lat += (v & 1) ? ~(v >> 1) : (v >> 1);
    s = 0; v = 0;
    do { b = enc.charCodeAt(i++) - 63; v |= (b & 31) << s; s += 5; } while (b >= 32);
    lng += (v & 1) ? ~(v >> 1) : (v >> 1);
    res.push([lng / 1e5, lat / 1e5]);
  }
  return res;
}

/* ─── Directions helpers ───────────────────────────────────────────────────── */
function extractRouteInfo(data) {
  const route = data?.routes?.[0];
  if (!route) return null;
  const leg = route.legs?.[0];
  return {
    distance: leg?.distance?.value,
    duration: leg?.duration?.value,
    polyline: route.overview_polyline?.points || null,
    geometry: route.geometry || null,
    steps: leg?.steps,
  };
}


function formatDistance(m) {
  if (!m) return '';
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function formatDuration(s) {
  if (!s) return '';
  const m = Math.round(s / 60);
  if (m >= 60) return `${Math.floor(m / 60)} giờ ${m % 60} phút`;
  return `${m} phút`;
}

/* ─── Navigation step chip ────────────────────────────────────────────────── */
function DirectionStep({ step, index }) {
  const icons = {
    depart: 'fa-location-dot',
    turn: 'fa-arrow-up',
    merge: 'fa-arrow-right-arrow-left',
    via: 'fa-route',
    destination: 'fa-flag-checkered',
  };
  const icon = icons[step.type] || 'fa-arrow-right';
  const maneuver = step.maneuver || '';
  const isFirst = index === 0;
  const isDestination = step.type === 'destination' || step.instruction?.toLowerCase().includes('đến');

  return (
    <div className={`flex items-start gap-3 py-3 ${index !== 0 ? 'border-t border-gray-100' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
        ${isDestination ? 'bg-orange-500' : isFirst ? 'bg-blue-500' : 'bg-gray-100'}`}>
        <i className={`fa-solid ${icon} text-xs ${isDestination || isFirst ? 'text-white' : 'text-gray-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${isDestination ? 'text-orange-600 font-bold' : 'text-gray-700'}`}>
          {step.instruction || maneuver}
        </p>
        {step.distance > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">{formatDistance(step.distance)}</p>
        )}
      </div>
    </div>
  );
}

/* ─── ETA bar ─────────────────────────────────────────────────────────────── */
function EtaBar({ distance, duration, currentStep, currentTime }) {
  const eta = useMemo(() => {
    if (!duration) return '...';
    const baseTime = currentTime;
    const targetTime = new Date(baseTime + duration * 1000);
    return targetTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }, [duration, currentTime]);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 mb-3">
      <div className="grid grid-cols-3 divide-x divide-gray-100 text-center">
        <div>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Khoảng cách</div>
          <div className="font-black text-gray-900 text-lg mt-0.5">{formatDistance(distance)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Thời gian</div>
          <div className="font-black text-gray-900 text-lg mt-0.5">{formatDuration(duration)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Đến lúc</div>
          <div className="font-black text-orange-500 text-lg mt-0.5">{eta}</div>
        </div>
      </div>
      {currentStep && (
        <div className="mt-3 bg-orange-50 rounded-xl p-2.5 border border-orange-100">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-compass text-orange-400 text-sm" />
            <span className="text-xs font-semibold text-orange-700">{currentStep.instruction}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function NavigationGuide({
  order,
  currentLocation,
  onClose,
  mode = 'to-customer',
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerCurrentRef = useRef(null);
  const markerDestRef = useRef(null);

  const [routeInfo, setRouteInfo] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState(null);
  const [recenterKey, setRecenterKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(() => {
    const t = Date.now();
    return t;
  });

  // Update clock every minute for ETA display
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const destData = useMemo(() => {
    let lat, lng;
    if (mode === 'to-restaurant') {
      lat = parseFloat(order.restaurant_lat || order.latitude_quan) || 0;
      lng = parseFloat(order.restaurant_lng || order.longitude_quan) || 0;
    } else {
      lat = parseFloat(order.customer_lat || order.latitude_khach) || 0;
      lng = parseFloat(order.customer_lng || order.longitude_khach) || 0;
    }
    if (lat > 90 || lat < -90) {
      [lat, lng] = [lng, lat];
    }
    return {
      lat: lat || null,
      lng: lng || null,
      label: mode === 'to-restaurant' ? 'Quán ăn' : 'Khách hàng',
      icon: mode === 'to-restaurant' ? 'fa-store' : 'fa-user',
    };
  }, [order, mode]);

  const origin = useMemo(() => {
    if (currentLocation?.lat && currentLocation?.lng) return currentLocation;
    // Fallback: dùng tọa độ điểm còn lại khi chưa có GPS
    let lat, lng;
    if (mode === 'to-customer') {
      lat = parseFloat(order.restaurant_lat || order.latitude_quan) || 0;
      lng = parseFloat(order.restaurant_lng || order.longitude_quan) || 0;
    } else {
      lat = parseFloat(order.customer_lat || order.latitude_khach) || 0;
      lng = parseFloat(order.customer_lng || order.longitude_khach) || 0;
    }
    if (lat > 90 || lat < -90) [lat, lng] = [lng, lat];
    if (lat && lng) return { lat, lng, isFallback: true };
    return null;
  }, [currentLocation, order, mode]);

  /* ── Init map ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const destCenter = destData?.lat && destData?.lng
      ? [destData.lng, destData.lat]
      : [106.6297, 10.8231];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: NDA_MAP_STYLE,
      center: origin ? [origin.lng, origin.lat] : destCenter,
      zoom: 15,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Fetch & draw route ────────────────────────────────────────────────── */
  const fetchAndDrawRoute = useCallback(async () => {
    if (!origin?.lat || !origin?.lng || !destData?.lat || !destData?.lng) return;

    const map = mapRef.current;
    if (!map) return;

    setLoadingRoute(true);
    setError(null);

    const drawRoute = (coords) => {
      const draw = () => {
        if (map.getSource('nav-route')) {
          map.removeLayer('nav-route-line');
          map.removeLayer('nav-route-outline');
          map.removeSource('nav-route');
        }
        map.addSource('nav-route', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } },
        });
        map.addLayer({
          id: 'nav-route-outline', type: 'line', source: 'nav-route',
          paint: { 'line-color': '#ffffff', 'line-width': 8 },
        });
        map.addLayer({
          id: 'nav-route-line', type: 'line', source: 'nav-route',
          paint: { 'line-color': '#2563eb', 'line-width': 5, 'line-opacity': 0.9 },
        });
        const bounds = new maplibregl.LngLatBounds();
        coords.forEach(c => bounds.extend(c));
        map.fitBounds(bounds, { padding: 80, duration: 1000 });
      };
      if (map.isStyleLoaded()) draw();
      else map.on('load', draw);
    };

    try {
      const originStr = `${origin.lat},${origin.lng}`;
      const destStr = `${destData.lat},${destData.lng}`;
      const res = await fetch(`${BE_URL}/api/map/direction?origin=${originStr}&destination=${destStr}`);
      const data = await res.json();
      const info = extractRouteInfo(data);

      if (info?.polyline || info?.geometry) {
        let coords;
        if (info.polyline) {
          coords = decodePoly(info.polyline);
        } else if (info.geometry?.coordinates) {
          coords = info.geometry.coordinates;
        } else if (typeof info.geometry === 'string') {
          coords = decodePoly(info.geometry);
        }
        if (coords && coords.length > 0) {
          setRouteInfo(info);

          if (info.steps?.length > 0) {
            setSteps(info.steps.map(s => ({
              type: s.html_instructions?.toLowerCase().includes('arrived') || s.html_instructions?.toLowerCase().includes('destination') ? 'destination'
                : s.maneuver === '' ? 'depart' : 'turn',
              instruction: (s.html_instructions || '').replace(/<[^>]*>/g, ''),
              distance: s.distance?.value || 0,
              maneuver: s.maneuver || '',
            })));
          } else {
            setSteps([
              { type: 'depart', instruction: 'Bắt đầu', distance: 0 },
              { type: 'destination', instruction: `Đến ${destData.label}`, distance: info.distance },
            ]);
          }

          drawRoute(coords);
        } else {
          throw new Error('empty polyline');
        }
      } else {
        setRouteInfo(null);
        setSteps([
          { type: 'depart', instruction: 'Bắt đầu', distance: 0 },
          { type: 'destination', instruction: `Đến ${destData.label}`, distance: null },
        ]);
        drawRoute([[origin.lng, origin.lat], [destData.lng, destData.lat]]);
      }
    } catch {
      setError('Không thể tải tuyến đường. Vui lòng thử lại.');
    } finally {
      setLoadingRoute(false);
    }
  }, [origin, destData]);

  useEffect(() => {
    if (origin && destData?.lat && destData?.lng) {
      fetchAndDrawRoute();
    }
  }, [origin, destData, fetchAndDrawRoute]);

  /* ── Draw / update markers ──────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const waitAndMark = () => {
      if (markerCurrentRef.current) { markerCurrentRef.current.remove(); markerCurrentRef.current = null; }
      if (markerDestRef.current) { markerDestRef.current.remove(); markerDestRef.current = null; }

      if (origin?.lat && origin?.lng) {
        const el = document.createElement('div');
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#3b82f6';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 8px rgba(59,130,246,0.6)';
        el.style.position = 'relative';

        const pulse = document.createElement('div');
        pulse.style.cssText =
          'position:absolute;width:36px;height:36px;border-radius:50%;' +
          'background:rgba(59,130,246,0.25);top:50%;left:50%;' +
          'transform:translate(-50%,-50%);animation:navPulse 2s infinite;';
        el.appendChild(pulse);

        if (!document.getElementById('nav-pulse-style')) {
          const style = document.createElement('style');
          style.id = 'nav-pulse-style';
          style.textContent =
            '@keyframes navPulse{' +
            '0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.6}' +
            '50%{transform:translate(-50%,-50%) scale(1.5);opacity:0.2}}';
          document.head.appendChild(style);
        }

        markerCurrentRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([origin.lng, origin.lat])
          .setPopup(new maplibregl.Popup({ offset: 16 }).setHTML(`<b>${origin.isFallback ? 'Điểm xuất phát (ước tính)' : 'Vị trí của bạn'}</b>`))
          .addTo(map);
      }

      if (destData?.lat && destData?.lng) {
        const isRestaurant = mode === 'to-restaurant';
        const destEl = document.createElement('div');
        destEl.style.cssText =
          'display:flex;align-items:center;justify-content:center;' +
          'width:36px;height:36px;background:#f97316;border-radius:50%;' +
          'border:3px solid white;box-shadow:0 2px 8px rgba(249,115,22,0.5);cursor:pointer;' +
          'position:relative;';
        destEl.innerHTML =
          `<i class="fa-solid ${destData.icon || 'fa-location-dot'}" style="color:white;font-size:14px;"></i>`;

        const labelDiv = document.createElement('div');
        labelDiv.style.cssText =
          `position:absolute;bottom:100%;left:50%;transform:translateX(-50%);` +
          `white-space:nowrap;background:${isRestaurant ? '#f97316' : '#22c55e'};` +
          `color:white;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;` +
          `box-shadow:0 2px 4px rgba(0,0,0,0.2);`;
        labelDiv.textContent = destData.label;
        destEl.appendChild(labelDiv);

        markerDestRef.current = new maplibregl.Marker({ element: destEl, anchor: 'bottom' })
          .setLngLat([destData.lng, destData.lat])
          .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(`<b>${destData.label}</b>`))
          .addTo(map);
      }
    };

    if (map.isStyleLoaded()) waitAndMark();
    else map.on('load', waitAndMark);
  }, [origin, destData, recenterKey, mode]);

  /* ── Live location update ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!origin) return;
    const map = mapRef.current;
    if (!map) return;

    if (markerCurrentRef.current) {
      markerCurrentRef.current.setLngLat([origin.lng, origin.lat]);
    }
  }, [origin]);

  /* ── Recenter button ───────────────────────────────────────────────────── */
  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map || !origin) return;
    map.flyTo({ center: [origin.lng, origin.lat], zoom: 16, duration: 600 });
    setRecenterKey(k => k + 1);
  };

  /* ── Open native maps app ───────────────────────────────────────────────── */
  const handleOpenNative = () => {
    if (!destData?.lat || !destData?.lng) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destData.lat},${destData.lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const currentStep = steps[0] || null;

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white">
      {/* ── Top header ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-sm z-10"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <i className="fa-solid fa-xmark text-gray-600 text-sm" />
        </button>

        <div className="text-center flex-1 mx-3">
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            {mode === 'to-restaurant' ? 'Đến quán ăn' : 'Đến khách hàng'}
          </div>
          <div className="font-bold text-gray-900 text-sm truncate px-2">
            {destData?.label || '...'}
          </div>
        </div>

        <button
          onClick={handleRecenter}
          className="w-9 h-9 rounded-full bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
        >
          <i className="fa-solid fa-location-crosshairs text-blue-600 text-sm" />
        </button>
      </div>

      {/* ── Map ─────────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0">
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {loadingRoute && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-gray-500">Đang tải tuyến đường...</span>
            </div>
          </div>
        )}

        {origin?.isFallback && (
          <div className="absolute top-14 left-4 right-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 z-10 flex items-center gap-2">
            <i className="fa-solid fa-satellite-dish text-yellow-500" />
            <span className="text-sm text-yellow-700">Đang chờ GPS... Hiện đang hiển thị tuyến đường từ quán.</span>
          </div>
        )}

        {error && (
          <div className="absolute top-4 left-4 right-4 bg-red-50 border border-red-200 rounded-xl p-3 z-10 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
            <button onClick={fetchAndDrawRoute} className="ml-auto text-xs font-bold text-red-600 hover:text-red-800">
              Thử lại
            </button>
          </div>
        )}

        <button
          onClick={handleRecenter}
          className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center z-10 hover:bg-gray-50 active:scale-95 transition-all"
        >
          <i className="fa-solid fa-crosshairs text-blue-600" />
        </button>

        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex bg-white rounded-full shadow-md border border-gray-100 overflow-hidden">
          <div className={`px-4 py-2 text-xs font-bold transition-colors ${mode === 'to-customer' ? 'bg-green-500 text-white' : 'text-gray-500 bg-gray-50'}`}>
            <i className="fa-solid fa-user mr-1" />Đến KH
          </div>
          <div className={`px-4 py-2 text-xs font-bold transition-colors ${mode === 'to-restaurant' ? 'bg-orange-500 text-white' : 'text-gray-500 bg-gray-50'}`}>
            <i className="fa-solid fa-store mr-1" />Đến Quán
          </div>
        </div>
      </div>

      {/* ── Bottom panel ────────────────────────────────────────────────────── */}
      <div
        className="bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
      >
        {routeInfo && (
          <EtaBar distance={routeInfo.distance} duration={routeInfo.duration} currentStep={currentStep} currentTime={currentTime} />
        )}

        {steps.length > 0 && (
          <div className="px-4 max-h-44 overflow-y-auto">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              <i className="fa-solid fa-route mr-1" />Hướng dẫn lộ trình
            </div>
            {steps.slice(0, 6).map((step, i) => (
              <DirectionStep key={i} step={step} index={i} />
            ))}
            {steps.length > 6 && (
              <p className="text-xs text-gray-400 text-center py-1">
                +{steps.length - 6} bước nữa...
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 px-4 pt-3 pb-3">
          <button
            onClick={handleOpenNative}
            className="flex-1 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] transition-all text-white font-bold text-sm shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-location-arrow" />
            Mở Google Maps
          </button>
          <button
            onClick={fetchAndDrawRoute}
            className="w-14 h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all flex items-center justify-center"
          >
            <i className="fa-solid fa-rotate-right text-gray-600" />
          </button>
          <button
            onClick={onClose}
            className="w-14 h-14 rounded-2xl bg-gray-800 hover:bg-gray-900 active:scale-[0.98] transition-all flex items-center justify-center"
          >
            <i className="fa-solid fa-xmark text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
