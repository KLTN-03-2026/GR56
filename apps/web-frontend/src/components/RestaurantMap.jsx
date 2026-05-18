import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { formatVND } from '../../utils/helpers';
import toast from 'react-hot-toast';

function buildMapHTML(userLat, userLng, restaurants) {
  const userMarker = userLat && userLng
    ? `{ lat: ${userLat}, lng: ${userLng}, name: 'Vị trí của bạn', label: 'Bạn', color: '#10B981', icon: '📍', isUser: true }`
    : null;

  const restaurantMarkers = restaurants.map(r => {
    const lat = parseFloat(r.toa_do_x || r.latitude || 0);
    const lng = parseFloat(r.toa_do_y || r.longitude || 0);
    if (!lat || !lng) return null;
    return `{ lat: ${lat}, lng: ${lng}, name: '${r.ten_quan_an?.replace(/'/g, "\\'")}', label: 'Quán ăn', color: '#FF6B35', icon: '🏪', id: ${r.id}, image: '${r.hinh_anh || ''}', address: '${(r.dia_chi || '').replace(/'/g, "\\'")}', price: '${r.phi_ship || 'Miễn phí'}', rating: '${r.sao_trung_binh ? Number(r.sao_trung_binh).toFixed(1) : '5.0'}' }`;
  }).filter(Boolean);

  const allMarkers = [userMarker, ...restaurantMarkers].filter(Boolean);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#FFF3E0}
#map{position:absolute;inset:0;width:100%;height:100%;z-index:1}
#panel{
  position:absolute;bottom:0;left:0;right:0;z-index:1000;
  background:rgba(255,255,255,0.98);border-radius:24px 24px 0 0;
  box-shadow:0 -4px 24px rgba(0,0,0,0.15);
  padding:16px 16px 24px;max-height:40vh;overflow-y:auto;
}
.user-badge{display:inline-flex;align-items:center;gap:6px;
  background:#10B981;color:#fff;font-size:9px;font-weight:800;
  padding:4px 12px;border-radius:20px;align-self:flex-start;}
.rest-count{
  background:#FF6B35;color:#fff;font-size:11px;font-weight:800;
  padding:4px 12px;border-radius:20px;margin-left:8px;}
.rest-list{display:flex;flex-direction:column;gap:10px;margin-top:12px;}
.rest-item{display:flex;gap:12px;padding:12px;background:#FAFAFA;border-radius:16px;
  border:1px solid #F0F0F0;cursor:pointer;transition:all 0.2s}
.rest-item:hover{background:#FFF7ED;border-color:#FF6B35;transform:translateY(-1px)}
.rest-img{width:64px;height:64px;border-radius:12px;object-fit:cover;flex-shrink:0}
.rest-info{flex:1;min-width:0}
.rest-name{font-weight:700;font-size:14px;color:#1E293B;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rest-addr{font-size:11px;color:#64748B;margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.rest-meta{display:flex;align-items:center;gap:8px;font-size:11px}
.star{color:#F59E0B;font-weight:700}
.ship{color:#10B981;font-weight:600}
</style>
</head>
<body>
<div id="panel">
  <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;">
    <div class="user-badge">📍 Vị trí của bạn</div>
    <div class="rest-count">🏪 ${restaurants.length} quán xung quanh</div>
  </div>
  <div class="rest-list">
    ${restaurants.slice(0, 10).map(r => `
    <div class="rest-item" onclick="goToRestaurant(${r.id})">
      <img class="rest-img" src="${r.hinh_anh || 'https://via.placeholder.com/100'}" alt="${r.ten_quan_an}" onerror="this.src='https://via.placeholder.com/100'" />
      <div class="rest-info">
        <div class="rest-name">${r.ten_quan_an}</div>
        <div class="rest-addr">${r.dia_chi || 'Không có địa chỉ'}</div>
        <div class="rest-meta">
          <span class="star">⭐ ${r.sao_trung_binh ? Number(r.sao_trung_binh).toFixed(1) : '5.0'}</span>
          <span class="ship"><i class="fa-solid fa-motorcycle"></i> ${r.phi_ship || 'Miễn phí'}</span>
        </div>
      </div>
    </div>
    `).join('')}
  </div>
</div>
<div id="map"></div>
<script>
var map = L.map('map', { zoomControl: true, attributionControl: false });

// Add tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

var markers = [];

// User marker (green)
${userMarker ? `
var userIcon = L.divIcon({
  className: 'user-marker',
  html: '<div style="width:48px;height:48px;border-radius:50%;background:#10B981;border:4px solid #fff;box-shadow:0 4px 16px rgba(16,185,129,0.4);display:flex;align-items:center;justify-content:center;font-size:24px;">📍</div>',
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});
var userMarker = L.marker([${userLat}, ${userLng}], { icon: userIcon }).addTo(map);
userMarker.bindPopup('<b style="color:#10B981">📍 Vị trí của bạn</b><br/><small>You are here</small>');
markers.push([${userLat}, ${userLng}]);
` : ''}

// Restaurant markers (orange)
${restaurantMarkers.map((m, i) => `
var icon${i} = L.divIcon({
  className: 'rest-marker',
  html: '<div style="width:40px;height:40px;border-radius:50%;background:#FF6B35;border:3px solid #fff;box-shadow:0 2px 12px rgba(255,107,53,0.4);display:flex;align-items:center;justify-content:center;font-size:20px;">🏪</div>',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});
var m${i} = L.marker([${m.match(/lat: ([0-9.-]+), lng: ([0-9.-]+)/)[1]}, ${m.match(/lat: ([0-9.-]+), lng: ([0-9.-]+)/)[2]}], { icon: icon${i} }).addTo(map);
m${i}.bindPopup('<b style="color:#FF6B35">🏪 ' + ${m.match(/name: '([^']+)'/)[1]} + '</b>');
markers.push([${m.match(/lat: ([0-9.-]+), lng: ([0-9.-]+)/)[1]}, ${m.match(/lat: ([0-9.-]+), lng: ([0-9.-]+)/)[2]}]);
`).join(';\n')}

// Fit bounds
if (markers.length > 0) {
  var bounds = L.latLngBounds(markers);
  map.fitBounds(bounds, { padding: [60, 60] });
} else if (${userLat && userLng ? 'true' : 'false'}) {
  map.setView([${userLat}, ${userLng}], 14);
} else {
  // Default to Ho Chi Minh City
  map.setView([10.8231, 106.6297], 13);
}

// Click on restaurant item to pan to marker
window.goToRestaurant = function(id) {
  // Pan to the restaurant on the map
};
</script>
</body>
</html>`;
}

export default function RestaurantMap() {
  const [userLocation, setUserLocation] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapHtml, setMapHtml] = useState(null);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.warn('Geolocation error:', err);
          // Default to Ho Chi Minh City if denied
          setUserLocation({ lat: 10.8231, lng: 106.6297 });
          toast('Không thể lấy vị trí. Hiển thị quán tại TP.HCM!', { icon: '📍' });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setUserLocation({ lat: 10.8231, lng: 106.6297 });
    }
  }, []);

  // Load restaurants
  useEffect(() => {
    api.get('/api/khach-hang/trang-chu/data')
      .then(res => {
        const quanAn = res.data.quan_an_sale || res.data.quan_an_yeu_thich || [];
        setRestaurants(quanAn);
        setLoading(false);
      })
      .catch(() => {
        setRestaurants([]);
        setLoading(false);
      });
  }, []);

  // Build map HTML when location or restaurants change
  useEffect(() => {
    if (userLocation) {
      const html = buildMapHTML(userLocation.lat, userLocation.lng, restaurants);
      setMapHtml(html);
    }
  }, [userLocation, restaurants]);

  return (
    <div className="min-h-screen" style={{ background: '#FFF3E0' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B35, #f7931e)' }}>
              <i className="fa-solid fa-map-location-dot text-white"></i>
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900">Quán Ăn Gần Bạn</h1>
              <p className="text-xs text-gray-500">
                {userLocation ? (
                  <><i className="fa-solid fa-location-crosshairs text-green-500 mr-1"></i> Vị trí của bạn: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</>
                ) : (
                  <><i className="fa-solid fa-spinner fa-spin text-orange-500 mr-1"></i> Đang xác định vị trí...</>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                  () => toast.error('Không thể cập nhật vị trí!')
                );
              }
            }}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/30 flex items-center gap-2"
          >
            <i className="fa-solid fa-location-crosshairs"></i>
            Cập nhật
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative">
        {/* Legend */}
        <div className="absolute top-4 right-4 z-30 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs">📍</div>
            <span className="text-xs font-semibold text-gray-700">Vị trí của bạn</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-xs">🏪</div>
            <span className="text-xs font-semibold text-gray-700">Quán ăn</span>
          </div>
        </div>

        {/* Stats Card */}
        <div className="absolute top-4 left-4 z-30 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-100">
              <i className="fa-solid fa-store text-orange-500 text-sm"></i>
            </div>
            <div>
              <div className="text-xs text-gray-500">Quán xung quanh</div>
              <div className="font-bold text-lg text-gray-900">{restaurants.length}</div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="h-[calc(100vh-80px)] w-full">
          {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <i className="fa-solid fa-map text-3xl text-orange-400 fa-spin"></i>
              </div>
              <p className="font-semibold text-gray-600">Đang tải bản đồ...</p>
            </div>
          ) : mapHtml ? (
            <iframe
              title="Restaurant Map"
              srcDoc={mapHtml}
              className="w-full h-full"
              style={{ border: 0 }}
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <i className="fa-solid fa-map text-3xl text-orange-400"></i>
              </div>
              <p className="font-semibold text-gray-600">Không thể tải bản đồ</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Restaurant List */}
      {!loading && restaurants.length > 0 && (
        <div className="bg-white rounded-t-3xl shadow-2xl p-4 pb-8" style={{ marginTop: '-24px', position: 'relative', zIndex: 40 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <i className="fa-solid fa-fire text-orange-500"></i>
              Quán Ăn Nổi Bật
            </h3>
            <span className="text-xs text-gray-500">{restaurants.length} quán</span>
          </div>

          <div className="space-y-3 max-h-[40vh] overflow-y-auto">
            {restaurants.slice(0, 10).map((r, i) => (
              <Link key={i} to={`/khach-hang/quan-an/${r.id}`} className="block">
                <div className="flex gap-3 p-3 bg-gray-50 rounded-2xl hover:bg-orange-50 transition-colors border border-transparent hover:border-orange-200">
                  <img
                    src={r.hinh_anh || 'https://via.placeholder.com/100'}
                    alt={r.ten_quan_an}
                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-gray-900 truncate">{r.ten_quan_an}</h4>
                      <span className="flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-lg flex-shrink-0">
                        <i className="fa-solid fa-motorcycle"></i>
                        {r.phi_ship || 'Miễn phí'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      <i className="fa-solid fa-location-dot text-red-400 mr-1"></i>
                      {r.dia_chi}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs">
                        <i className="fa-solid fa-star text-yellow-400"></i>
                        <span className="font-bold text-gray-700">{r.sao_trung_binh ? Number(r.sao_trung_binh).toFixed(1) : '5.0'}</span>
                      </span>
                      {r.phan_tram_giam && (
                        <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg">
                          -{r.phan_tram_giam}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {restaurants.length > 10 && (
            <div className="text-center mt-4">
              <Link
                to="/khach-hang/list-quan-an"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/30"
              >
                <i className="fa-solid fa-store"></i>
                Xem tất cả {restaurants.length} quán
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
