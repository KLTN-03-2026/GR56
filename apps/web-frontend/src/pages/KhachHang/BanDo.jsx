import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Sử dụng OpenMap.vn
const MAP_STYLE = `https://tiles.openmap.vn/styles/day-v1/style.json`;
import api from '../../utils/api';
import toast from 'react-hot-toast';

const BE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DANANG_CENTER = [108.225, 16.054];
const DEFAULT_ZOOM = 13;

/* ── Polyline decoder (OSRM) ─────────────────────────────────────────────────── */
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

function formatDistance(m) {
  if (!m) return '...';
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function formatDuration(s) {
  if (!s) return '...';
  const m = Math.round(s / 60);
  if (m >= 60) return `${Math.floor(m / 60)} giờ ${m % 60} phút`;
  return `${m} phút`;
}

export default function BanDo() {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const debounceRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [userLocation, setUserLocation] = useState(null); // [lng, lat]
  const [locationLoading, setLocationLoading] = useState(true); // true ngay từ đầu
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [keyword, setKeyword] = useState('');
  const [radius, setRadius] = useState(10);
  const [ratingMin, setRatingMin] = useState(0);
  const [danhMuc, setDanhMuc] = useState('');

  // Route / navigation states
  const [activeRoute, setActiveRoute] = useState(null); // { restaurant, info, coords }
  const [routeLoading, setRouteLoading] = useState(false);

  /* ── Fetch restaurants ─────────────────────────────────────────────────────── */
  const fetchRestaurants = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const params = {};
      if (filters.lat && filters.lng) {
        params.lat = filters.lat;
        params.lng = filters.lng;
      }
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.radius) params.radius = filters.radius;
      if (filters.ratingMin) params.ratingMin = filters.ratingMin;
      if (filters.danhMuc) params.danh_muc = filters.danhMuc;

      const res = await api.get('/api/khach-hang/quan-an/map', { params });
      console.log('[BanDo] API response:', res.data);
      const data = res.data?.data || [];
      setRestaurants(data);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      toast.error('Không thể tải danh sách quán ăn');
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Init map ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: DANANG_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }), 'top-right');

    map.on('load', () => {
      map.resize();
      const loc = map.getCenter();
      fetchRestaurants({ lat: loc.lat, lng: loc.lng });
    });

    map.on('error', (e) => {
      console.error('[BanDo] Map error:', e);
      fetchRestaurants({ lat: DANANG_CENTER[1], lng: DANANG_CENTER[0] });
    });

    return () => {
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  /* ── Geolocation ───────────────────────────────────────────────────────────── */
  const geoDoneRef = useRef(false);

  useEffect(() => {
    if (geoDoneRef.current) return;
    geoDoneRef.current = true;

    if (!navigator.geolocation) {
      toast('Trình duyệt không hỗ trợ định vị', { icon: '📍' });
      const defaultLoc = { lat: DANANG_CENTER[1], lng: DANANG_CENTER[0] };
      setUserLocation(DANANG_CENTER);
      if (mapRef.current) {
        mapRef.current.flyTo({ center: DANANG_CENTER, zoom: 14, duration: 1000 });
      }
      fetchRestaurants(defaultLoc);
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const loc = [longitude, latitude];
        setUserLocation(loc);

        if (mapRef.current) {
          mapRef.current.flyTo({ center: loc, zoom: 14, duration: 1000 });
          addUserMarker(loc);
        }

        setLocationLoading(false);
        fetchRestaurants({ lat: latitude, lng: longitude });
      },
      () => {
        toast('Không thể lấy vị trí. Hiển thị tất cả quán ăn.', { icon: '📍' });
        const defaultLoc = { lat: DANANG_CENTER[1], lng: DANANG_CENTER[0] };
        setUserLocation(DANANG_CENTER);
        setLocationLoading(false);
        fetchRestaurants(defaultLoc);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [fetchRestaurants]);

  /* ── User location marker ──────────────────────────────────────────────────── */
  const addUserMarker = useCallback((loc) => {
    if (userMarkerRef.current) userMarkerRef.current.remove();

    const el = document.createElement('div');
    el.style.cssText = `
      width:18px; height:18px; border-radius:50%;
      background:#3b82f6; border:3px solid white;
      box-shadow:0 2px 8px rgba(59,130,246,0.6);
      position:relative; cursor:pointer;
    `;
    const pulse = document.createElement('div');
    pulse.style.cssText = `
      position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%);
      width:36px; height:36px; border-radius:50%;
      background:rgba(59,130,246,0.25);
      animation:userPulse 2s infinite;
    `;
    el.appendChild(pulse);

    if (!document.getElementById('user-pulse-style')) {
      const s = document.createElement('style');
      s.id = 'user-pulse-style';
      s.textContent = `@keyframes userPulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.6}50%{transform:translate(-50%,-50%) scale(1.5);opacity:0.2}}`;
      document.head.appendChild(s);
    }

    userMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat(loc)
      .setPopup(new maplibregl.Popup({ offset: 16 }).setHTML('<b>Vị trí của bạn</b>'))
      .addTo(mapRef.current);
  }, []);

  /* ── Draw route on map ────────────────────────────────────────────────────── */
  const clearRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    ['bando-route', 'bando-route-outline'].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource('bando-route')) map.removeSource('bando-route');
    if (map.getLayer('bando-route-start')) map.removeLayer('bando-route-start');
    if (map.getSource('bando-route-start')) map.removeSource('bando-route-start');
    if (map.getLayer('bando-route-end')) map.removeLayer('bando-route-end');
    if (map.getSource('bando-route-end')) map.removeSource('bando-route-end');
  }, []);

  const drawRoute = useCallback((coords) => {
    const map = mapRef.current;
    if (!map) return;

    clearRoute();

    const doDraw = () => {
      map.addSource('bando-route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } },
      });
      map.addLayer({
        id: 'bando-route-outline', type: 'line', source: 'bando-route',
        paint: { 'line-color': '#ffffff', 'line-width': 8 },
      });
      map.addLayer({
        id: 'bando-route', type: 'line', source: 'bando-route',
        paint: { 'line-color': '#3b82f6', 'line-width': 5, 'line-opacity': 0.9 },
      });

      // Start marker
      if (userLocation) {
        map.addSource('bando-route-start', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'Point', coordinates: userLocation } },
        });
        map.addLayer({
          id: 'bando-route-start', type: 'circle', source: 'bando-route-start',
          paint: { 'circle-radius': 8, 'circle-color': '#3b82f6', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
        });
      }

      // End marker
      const end = coords[coords.length - 1];
      if (end) {
        map.addSource('bando-route-end', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'Point', coordinates: end } },
        });
        map.addLayer({
          id: 'bando-route-end', type: 'circle', source: 'bando-route-end',
          paint: { 'circle-radius': 8, 'circle-color': '#ff6b35', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
        });
      }

      const bounds = new maplibregl.LngLatBounds();
      if (userLocation) bounds.extend(userLocation);
      coords.forEach(c => bounds.extend(c));
      map.fitBounds(bounds, { padding: 100, maxZoom: 16, duration: 1000 });
    };

    if (map.isStyleLoaded()) doDraw();
    else map.once('load', doDraw);
  }, [clearRoute, userLocation]);

  /* ── Open route ────────────────────────────────────────────────────────────── */
  const handleOpenDirections = useCallback(async (restaurant) => {
    if (!userLocation) {
      toast.error('Cần vị trí của bạn để chỉ đường');
      return;
    }

    setActiveRoute({ restaurant, info: null, coords: null });
    setRouteLoading(true);
    clearRoute();

    try {
      const originStr = `${userLocation[1]},${userLocation[0]}`; // lat,lng
      const destStr = `${restaurant.toa_do_x},${restaurant.toa_do_y}`;
      const res = await fetch(`${BE_URL}/api/map/direction?origin=${originStr}&destination=${destStr}`);
      const data = await res.json();

      const route = data?.routes?.[0];
      let coords = null;
      let info = null;

      if (route) {
        if (route.overview_polyline?.points) {
          coords = decodePoly(route.overview_polyline.points);
        } else if (route.geometry?.coordinates) {
          coords = route.geometry.coordinates;
        }
        if (coords) {
          info = {
            distance: route.legs?.[0]?.distance?.value,
            duration: route.legs?.[0]?.duration?.value,
          };
        }
      }

      if (!coords) {
        // Fallback: straight line
        coords = [
          [userLocation[0], userLocation[1]],
          [parseFloat(restaurant.toa_do_y), parseFloat(restaurant.toa_do_x)],
        ];
      }

      setActiveRoute({ restaurant, info, coords });
      drawRoute(coords);
    } catch {
      toast.error('Không thể tải tuyến đường');
      setActiveRoute(null);
    } finally {
      setRouteLoading(false);
    }
  }, [userLocation, clearRoute, drawRoute]);

  const handleCloseRoute = useCallback(() => {
    clearRoute();
    setActiveRoute(null);
  }, [clearRoute]);

  const handleOpenNativeMap = useCallback(() => {
    if (!activeRoute?.restaurant) return;
    const r = activeRoute.restaurant;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${r.toa_do_x},${r.toa_do_y}&travelmode=driving`,
      '_blank'
    );
  }, [activeRoute]);

  /* ── Render restaurant markers with clustering ─────────────────────────────── */
  useEffect(() => {
    if (!mapRef.current || restaurants.length === 0) return;
    const map = mapRef.current;
    console.log('[BanDo] restaurant effect ran, count:', restaurants.length, 'map loaded:', map.isStyleLoaded());

    // Restaurant data accessible by click handler (closure-safe)
    const restaurantMap = {};
    restaurants.forEach(r => { restaurantMap[r.id] = r; });

    const doRender = () => {
      console.log('[BanDo] doRender running, first coord:', restaurants[0]?.toa_do_x, restaurants[0]?.toa_do_y);
      // Remove old layers & sources
      ['bando-clusters', 'bando-cluster-count', 'bando-unclustered-point', 'bando-unclustered-label'].forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      ['bando-restaurants'].forEach(id => {
        if (map.getSource(id)) map.removeSource(id);
      });

      const geojson = {
        type: 'FeatureCollection',
        features: restaurants.map(r => {
          const coord = [parseFloat(r.toa_do_y), parseFloat(r.toa_do_x)];
          console.log('[BanDo] marker coord:', r.ten_quan_an, coord);
          return {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: coord },
            properties: {
              id: r.id,
              ten_quan_an: r.ten_quan_an,
              hinh_anh: r.hinh_anh || '',
              dia_chi: r.dia_chi || '',
              ten_quan_huyen: r.ten_quan_huyen || '',
              rating: r.rating || 0,
              so_danh_gia: r.so_danh_gia || 0,
              so_mon: r.so_mon || 0,
              khoang_cach_km: r.khoang_cach_km || 0,
              gio_mo_cua: r.gio_mo_cua || '',
              gio_dong_cua: r.gio_dong_cua || '',
              dang_mo: r.dang_mo,
              toa_do_x: r.toa_do_x,
              toa_do_y: r.toa_do_y,
            },
          };
        }),
      };

      map.addSource('bando-restaurants', {
        type: 'geojson',
        data: geojson,
        cluster: false,
      });

      // Cluster circles
      map.addLayer({
        id: 'bando-clusters',
        type: 'circle',
        source: 'bando-restaurants',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#ff6b35', 5, '#f97316', 10, '#ea580c'],
          'circle-radius': ['step', ['get', 'point_count'], 22, 5, 30, 10, 38],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Cluster count labels
      map.addLayer({
        id: 'bando-cluster-count',
        type: 'symbol',
        source: 'bando-restaurants',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 13,
        },
        paint: { 'text-color': '#ffffff' },
      });

      // Individual restaurant points
      map.addLayer({
        id: 'bando-unclustered-point',
        type: 'circle',
        source: 'bando-restaurants',
        filter: ['all'],
        paint: {
          'circle-color': '#ff6b35',
          'circle-radius': 10,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Click on restaurant point → show popup
      map.on('click', 'bando-unclustered-point', (e) => {
        const feature = e.features[0];
        if (!feature) return;
        const p = feature.properties;

        const statusBadge = p.dang_mo
          ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
               <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>Đang mở
             </span>`
          : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
               <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>Đã đóng
             </span>`;

        const stars = p.rating > 0
          ? `<span class="text-yellow-500 font-bold">${'★'.repeat(Math.round(p.rating))}</span><span class="text-gray-400 text-xs">${p.rating}/5</span>`
          : '';

        const distanceBadge = p.khoang_cach_km > 0
          ? `<div class="mt-1 text-xs text-gray-500 flex items-center gap-1">
               <i class="fa-solid fa-location-dot text-blue-400"></i>
               <span>Cách bạn <b class="text-orange-500">${p.khoang_cach_km} km</b></span>
             </div>`
          : '';

        const imgEl = p.hinh_anh
          ? `<img src="${p.hinh_anh}" alt="${p.ten_quan_an}" class="w-16 h-16 rounded-xl object-cover shadow-sm flex-shrink-0"
                onerror="this.style.display='none'" />`
          : '';

        const popupContent = `
          <div class="p-3 min-w-[240px] max-w-xs">
            <div class="flex items-start gap-3">
              ${imgEl || `<div class="w-16 h-16 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0"><i class="fa-solid fa-store text-2xl text-orange-400"></i></div>`}
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-gray-900 text-sm leading-tight mb-1 truncate">${p.ten_quan_an || 'Quán ăn'}</h3>
                ${stars ? `<div class="mb-1">${stars}</div>` : ''}
                ${statusBadge}
              </div>
            </div>
            <div class="mt-2 text-xs text-gray-500 flex items-start gap-1">
              <i class="fa-solid fa-map-marker-alt text-orange-400 mt-0.5 flex-shrink-0"></i>
              <span class="truncate">${p.dia_chi || ''}${p.ten_quan_huyen ? ', ' + p.ten_quan_huyen : ''}</span>
            </div>
            ${distanceBadge}
            ${p.gio_mo_cua && p.gio_dong_cua
              ? `<div class="mt-1 text-xs text-gray-500 flex items-center gap-1">
                   <i class="fa-regular fa-clock text-gray-400"></i>
                   ${p.gio_mo_cua} - ${p.gio_dong_cua}
                 </div>`
              : ''
            }
            <div class="mt-2 flex items-center justify-between">
              <span class="text-xs text-gray-400">${p.so_danh_gia} đánh giá</span>
              <span class="text-xs text-gray-400">${p.so_mon} món</span>
            </div>
            <div class="mt-3 flex gap-2">
              <button id="popup-detail-btn" class="flex-1 py-2 px-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-eye"></i> Chi tiết
              </button>
              <button id="popup-dir-btn" class="flex-1 py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-location-arrow"></i> Chỉ đường
              </button>
            </div>
          </div>
        `;

        const lngLat = feature.geometry.coordinates;
        const popup = new maplibregl.Popup({ offset: 15, closeButton: true, maxWidth: '320px' })
          .setLngLat(lngLat)
          .setHTML(popupContent)
          .addTo(map);

        const container = popup.getElement();
        const detailBtn = container.querySelector('#popup-detail-btn');
        const dirBtn = container.querySelector('#popup-dir-btn');
        if (detailBtn) detailBtn.onclick = () => navigate(`/khach-hang/quan-an/${p.id}`);
        if (dirBtn) dirBtn.onclick = () => handleOpenDirections(restaurantMap[p.id]);
      });

      // Change cursor on hover
      ['bando-unclustered-point'].forEach(layer => {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
      });

      // Fit bounds only if no user location and no active route
      if (!userLocation && !activeRoute && restaurants.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        restaurants.forEach(r => {
          if (r.toa_do_x && r.toa_do_y) {
            bounds.extend([parseFloat(r.toa_do_y), parseFloat(r.toa_do_x)]);
          }
        });
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 800 });
        }
      }
    };

    if (map.isStyleLoaded()) doRender();
    else map.once('load', doRender);

    return () => {
      if (!mapRef.current) return;
      ['bando-clusters', 'bando-cluster-count', 'bando-unclustered-point', 'bando-unclustered-label'].forEach(id => {
        if (mapRef.current.getLayer(id)) mapRef.current.removeLayer(id);
      });
      if (mapRef.current.getSource('bando-restaurants')) mapRef.current.removeSource('bando-restaurants');
    };
  }, [restaurants, userLocation, activeRoute, navigate, handleOpenDirections]);

  /* ── Debounced filter fetch ─────────────────────────────────────────────────── */
  const handleFilterChange = useCallback((newFilters) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleCloseRoute();
      fetchRestaurants({
        lat: userLocation ? userLocation[1] : undefined,
        lng: userLocation ? userLocation[0] : undefined,
        ...newFilters,
      });
    }, 300);
  }, [fetchRestaurants, userLocation, handleCloseRoute]);

  /* ── Filter handlers ───────────────────────────────────────────────────────── */
  const handleSearch = (e) => {
    setKeyword(e.target.value);
    handleFilterChange({ keyword: e.target.value });
  };
  const handleRadiusChange = (value) => {
    setRadius(value);
    handleFilterChange({ radius: value });
  };
  const handleRatingChange = (value) => {
    setRatingMin(value);
    handleFilterChange({ ratingMin: value });
  };
  const handleDanhMucChange = (value) => {
    setDanhMuc(value);
    handleFilterChange({ danhMuc: value });
  };
  const resetFilters = () => {
    setKeyword('');
    setRadius(10);
    setRatingMin(0);
    setDanhMuc('');
    handleFilterChange({});
  };

  /* ── Go to user location ───────────────────────────────────────────────────── */
  const goToMyLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo({ center: userLocation, zoom: 15, duration: 800 });
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = [position.coords.longitude, position.coords.latitude];
          setUserLocation(loc);
          mapRef.current?.flyTo({ center: loc, zoom: 15, duration: 800 });
          addUserMarker(loc);
          handleCloseRoute();
          fetchRestaurants({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        () => toast.error('Không thể lấy vị trí của bạn')
      );
    }
  };

  /* ── Render ────────────────────────────────────────────────────────────────── */
  const eta = activeRoute?.info?.duration
    ? new Date(Date.now() + activeRoute.info.duration * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '...';

  return (
    <div className="h-[calc(100vh-80px)] min-h-[600px] bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto h-full flex flex-col bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
        {/* ── Header ────────────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white z-20 flex-shrink-0">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <i className="fa-solid fa-map text-xl" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Bản Đồ Quán Ăn</h1>
                <p className="text-orange-200 text-xs">Đà Nẵng</p>
              </div>
            </div>
            <button
              onClick={goToMyLocation}
              disabled={locationLoading}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all backdrop-blur-sm disabled:opacity-50"
            >
              <i className={`fa-solid fa-location-crosshairs ${locationLoading ? 'fa-spin' : ''}`} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={keyword}
              onChange={handleSearch}
              placeholder="Tìm kiếm quán ăn..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl text-gray-800 bg-white placeholder-gray-400 font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all text-sm font-medium"
            >
              <i className="fa-solid fa-sliders" />
              Bộ lọc
              {(radius !== 10 || ratingMin > 0 || danhMuc) && (
                <span className="w-5 h-5 bg-white text-orange-600 rounded-full text-xs flex items-center justify-center font-bold">
                  {(radius !== 10 ? 1 : 0) + (ratingMin > 0 ? 1 : 0) + (danhMuc ? 1 : 0)}
                </span>
              )}
            </button>
            <span className="text-xs text-orange-200">
              {loading ? 'Đang tải...' : `${restaurants.length} quán ăn`}
            </span>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-orange-100 font-medium">Bán kính</span>
                  <span className="text-white font-bold">{radius} km</span>
                </div>
                <input
                  type="range" min="1" max="20" value={radius}
                  onChange={(e) => handleRadiusChange(Number(e.target.value))}
                  className="w-full h-2 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-orange-100 font-medium">Đánh giá tối thiểu</span>
                  <span className="text-white font-bold">{ratingMin > 0 ? `${ratingMin} ★` : 'Tất cả'}</span>
                </div>
                <select
                  value={ratingMin}
                  onChange={(e) => handleRatingChange(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg text-gray-800 text-sm font-medium bg-white shadow focus:outline-none"
                >
                  <option value={0}>Tất cả</option>
                  <option value={1}>1 ★ trở lên</option>
                  <option value={2}>2 ★ trở lên</option>
                  <option value={3}>3 ★ trở lên</option>
                  <option value={4}>4 ★ trở lên</option>
                  <option value={5}>5 ★</option>
                </select>
              </div>
              <div>
                <div className="text-xs text-orange-100 font-medium mb-1">Danh mục</div>
                <input
                  type="text" value={danhMuc}
                  onChange={(e) => handleDanhMucChange(e.target.value)}
                  placeholder="VD: Cơm, Phở, Bún..."
                  className="w-full px-3 py-2 rounded-lg text-gray-800 text-sm font-medium bg-white shadow placeholder-gray-400 focus:outline-none"
                />
              </div>
              <button
                onClick={resetFilters}
                className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-rotate-left" />
                Đặt lại bộ lọc
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Map ────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative min-h-[400px]">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
              <span className="text-gray-600 font-medium">Đang tải bản đồ...</span>
            </div>
          </div>
        )}

        {/* Route loading */}
        {routeLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10 pointer-events-none">
            <div className="flex flex-col items-center gap-2 bg-white rounded-2xl p-4 shadow-lg">
              <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin" />
              <span className="text-sm font-medium text-gray-600">Đang tải tuyến đường...</span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg p-3 z-10">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-orange-500 border border-white shadow" />
              <span className="text-gray-600 font-medium">Quán ăn</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500 border border-white shadow" />
              <span className="text-gray-600 font-medium">Vị trí của bạn</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-400 border border-white shadow" />
              <span className="text-gray-600 font-medium">Tuyến đường</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Route info bar ────────────────────────────────────────────────────── */}
      {activeRoute && (
        <div className="bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-20 flex-shrink-0">
          <div className="px-4 py-3">
            {/* Route summary */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-store text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 text-sm truncate">
                  {activeRoute.restaurant.ten_quan_an}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-route text-blue-500" />
                    {activeRoute.info?.distance ? formatDistance(activeRoute.info.distance) : '...'}
                  </span>
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-clock text-blue-500" />
                    {activeRoute.info?.duration ? formatDuration(activeRoute.info.duration) : '...'}
                  </span>
                  <span className="flex items-center gap-1 text-orange-500">
                    <i className="fa-solid fa-flag-checkered" />
                    ETA {eta}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCloseRoute}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <i className="fa-solid fa-xmark text-gray-500 text-sm" />
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-3">
              <button
                onClick={handleOpenNativeMap}
                className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 active:scale-[0.98] transition-all text-white font-bold text-sm shadow shadow-blue-500/30 flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-location-arrow" />
                Mở Google Maps
              </button>
              <button
                onClick={() => navigate(`/khach-hang/quan-an/${activeRoute.restaurant.id}`)}
                className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] transition-all text-white font-bold text-sm shadow shadow-orange-500/30 flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-eye" />
                Xem quán
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
