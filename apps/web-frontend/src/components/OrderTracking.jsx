import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';

const STATUS_LABEL = {
  0: 'Chờ xác nhận',
  1: 'Đã nhận đơn',
  2: 'Quán đang làm',
  3: 'Đang giao hàng',
  4: 'Giao thành công',
  5: 'Đã hủy',
};

function calcDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km) {
  if (km === null || km === undefined) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return null;
  if (minutes < 60) return `~${Math.round(minutes)} phút`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `~${h}h ${m}m`;
}

function formatTime(ts) {
  if (!ts) return 'Chưa cập nhật';
  return new Date(ts).toLocaleTimeString('vi-VN');
}

function buildLeafletHTML(shipperLat, shipperLng, customerLat, customerLng, restaurantLat, restaurantLng, distance, duration) {
  const points = [];

  if (shipperLat && shipperLng) {
    points.push({ lat: shipperLat, lng: shipperLng, name: 'Vị trí Shipper', label: 'Shipper', color: '#EE4D2D', icon: '🚴' });
  }
  if (restaurantLat && restaurantLng) {
    points.push({ lat: restaurantLat, lng: restaurantLng, name: 'Nhà hàng', label: 'Nhà hàng', color: '#3B82F6', icon: '🏪' });
  }
  if (customerLat && customerLng) {
    points.push({ lat: customerLat, lng: customerLng, name: 'Điểm giao', label: 'Điểm đến', color: '#10B981', icon: '📍' });
  }

  const hasRoute = points.length >= 2;

  const markersJS = points.map((p, i) => `
    L.marker([${p.lat}, ${p.lng}], { icon: icon${i} })
      .addTo(map)
      .bindPopup('<div style="font-family:sans-serif;font-size:13px;line-height:1.6;min-width:150px">
        <b style="color:${p.color};font-size:14px">${p.label}</b><br/>
        <span style="color:#334155;font-size:12px">${p.name}</span>
      </div>')
  `).join('\n  ');

  const iconsJS = points.map((p, i) => `
    var icon${i} = L.divIcon({
      className: 'mi${i}',
      html: '<div style="width:40px;height:40px;border-radius:50%;background:${p.color};border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:20px;">${p.icon}</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });`).join('\n  ');

  const routePolyline = hasRoute ? `
  var routeCoords = [${points.map(p => `[${p.lat}, ${p.lng}]`).join(',')}];
  L.polyline(routeCoords, {
    color: '#EE4D2D', weight: 5, opacity: 0.8, lineCap: 'round', lineJoin: 'round',
  }).addTo(map);
  L.polyline(routeCoords, {
    color: '#FFB4A2', weight: 2, opacity: 0.4, dashArray: '8,8',
  }).addTo(map);
` : '';

  const distLabel = distance !== null ? formatDistance(distance) : '';
  const durLabel = duration !== null ? formatDuration(duration) : '';
  const showStats = distance !== null && duration !== null;

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
  position:absolute;top:0;left:0;right:0;z-index:1000;
  background:rgba(255,255,255,0.97);border-radius:0 0 24px 24px;
  box-shadow:0 4px 24px rgba(0,0,0,0.1);
  padding:14px 16px 16px;display:flex;flex-direction:column;gap:10px;
}
.live-badge{display:inline-flex;align-items:center;gap:6px;
  background:#EE4D2D;color:#fff;font-size:9px;font-weight:800;
  padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;align-self:flex-start;}
.ld{width:6px;height:6px;border-radius:50%;background:#FFD54F;animation:pl 1.2s infinite}
@keyframes pl{0%,100%{opacity:1}50%{opacity:0.2}}
.route-row{display:flex;align-items:center;gap:10px}
.loc-icon{width:34px;height:34px;border-radius:10px;border:2px solid;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.loc-info{flex:1;min-width:0}
.loc-lbl{font-size:9px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:0.3px}
.loc-name{font-size:13px;font-weight:700;color:#1E293B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.loc-addr{font-size:11px;color:#64748B;margin-top:1px}
.arrow{color:#EE4D2D;font-size:18px;font-weight:900;text-align:center;padding-left:8px;flex-shrink:0}
.stats{display:flex;background:#FFF7ED;border-radius:12px;padding:10px 14px;gap:0;margin-top:2px}
.stat{flex:1;text-align:center}
.sv{font-size:18px;font-weight:900;color:#EA580C}
.su{font-size:9px;font-weight:700;color:#9A3412;text-transform:uppercase;margin-top:2px}
.ss{width:1px;background:#FDBA74;margin:0 10px}
</style>
</head>
<body>
<div id="panel">
  <div class="live-badge"><div class="ld"></div>Live Tracking</div>
  ${points.map((p, i) => `
    ${i > 0 ? '<div class="arrow">➜</div>' : ''}
    <div class="route-row">
      <div class="loc-icon" style="background:${p.color}18;border-color:${p.color}">${p.icon}</div>
      <div class="loc-info">
        <div class="loc-lbl">${p.label}</div>
        <div class="loc-name">${p.name}</div>
      </div>
    </div>
  `).join('')}
  ${showStats ? `
  <div class="stats">
    <div class="stat"><div class="sv">${distLabel}</div><div class="su">Khoảng cách</div></div>
    <div class="ss"></div>
    <div class="stat"><div class="sv">${durLabel}</div><div class="su">Thời gian đến</div></div>
  </div>
  ` : ''}
</div>
<div id="map"></div>
<script>
var map = L.map('map', { zoomControl: false, attributionControl: false });
${iconsJS}
${markersJS}
${routePolyline}
map.fitBounds([${points.map(p => `[${p.lat}, ${p.lng}]`).join(',')}], { padding: [80, 80] });
</script>
</body>
</html>`;
}

export default function OrderTracking({ orderId }) {
  const [canTrack, setCanTrack] = useState(false);
  const [orderInfo, setOrderInfo] = useState({
    tinh_trang: 0,
    shipper_name: '',
    shipper_phone: '',
    shipper_avatar: '',
    restaurant_lat: null,
    restaurant_lng: null,
    customer_lat: null,
    customer_lng: 0,
    shipper_lat: null,
    shipper_lng: null,
    last_location_update: null,
    restaurant_name: '',
  });

  const [mapHtml, setMapHtml] = useState(null);

  const getStatusText = () => {
    if (orderInfo.tinh_trang === 0 || orderInfo.tinh_trang === 1) return 'Chờ nhận đơn';
    if (orderInfo.tinh_trang === 2) return 'Đang chế biến';
    if (orderInfo.tinh_trang === 3) return 'Đang vận chuyển';
    if (orderInfo.tinh_trang === 4) return 'Giao hàng thành công';
    if (orderInfo.tinh_trang === 5) return 'Đã bị hủy';
    return 'Đang cập nhật';
  };

  const loadOrderInfo = async () => {
    try {
      const token = localStorage.getItem('khach_hang_login');
      const res = await api.post('/api/khach-hang/don-hang/theo-doi-don-hang',
        { id: orderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data) {
        setCanTrack(res.data.can_track);
        setOrderInfo(prev => ({
          ...prev,
          ...res.data.order,
        }));
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadOrderInfo();
    const interval = setInterval(loadOrderInfo, 8000);
    return () => clearInterval(interval);
  }, [orderId]);

  // Build map HTML when order info changes
  useEffect(() => {
    const sLat = orderInfo.shipper_lat ? parseFloat(orderInfo.shipper_lat) : null;
    const sLng = orderInfo.shipper_lng ? parseFloat(orderInfo.shipper_lng) : null;
    const cLat = orderInfo.customer_lat ? parseFloat(orderInfo.customer_lat) : null;
    const cLng = orderInfo.customer_lng ? parseFloat(orderInfo.customer_lng) : null;
    const rLat = orderInfo.restaurant_lat ? parseFloat(orderInfo.restaurant_lat) : null;
    const rLng = orderInfo.restaurant_lng ? parseFloat(orderInfo.restaurant_lng) : null;

    let distance = null;
    let duration = null;
    if (sLat && sLng && cLat && cLng) {
      distance = calcDistance(sLat, sLng, cLat, cLng);
      duration = (distance / 30) * 60 + 3;
    }

    if (canTrack && (sLat || cLat)) {
      setMapHtml(buildLeafletHTML(sLat, sLng, cLat, cLng, rLat, rLng, distance, duration));
    } else {
      setMapHtml(null);
    }
  }, [orderInfo, canTrack]);

  const distance = useMemo(() => {
    if (!orderInfo.shipper_lat || !orderInfo.shipper_lng || !orderInfo.customer_lat || !orderInfo.customer_lng) return null;
    return calcDistance(
      parseFloat(orderInfo.shipper_lat),
      parseFloat(orderInfo.shipper_lng),
      parseFloat(orderInfo.customer_lat),
      parseFloat(orderInfo.customer_lng)
    );
  }, [orderInfo]);

  const duration = distance !== null ? (distance / 30) * 60 + 3 : null;

  // Hide when delivered or cancelled
  if (orderInfo.tinh_trang === 4 || orderInfo.tinh_trang === 5) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 my-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h3 className="text-lg font-bold text-gray-900 border-l-4 border-orange-500 pl-3 flex items-center gap-2">
          <i className="fa-solid fa-location-crosshairs text-orange-500"></i>
          Theo Dõi Đơn Hàng #{orderId}
        </h3>
        {!canTrack && (
          <span className="px-4 py-2 bg-yellow-100 text-yellow-700 font-bold rounded-xl text-sm flex items-center gap-2">
            <i className="fa-regular fa-clock"></i>
            {getStatusText()}
          </span>
        )}
      </div>

      {!canTrack ? (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-100 rounded-2xl p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
            <i className="fa-solid fa-route text-3xl text-orange-400"></i>
          </div>
          <h4 className="font-bold text-orange-600 mb-2">Chưa có thông tin vị trí</h4>
          <p className="text-orange-500/80 text-sm">
            Hệ thống sẽ cập nhật radar vị trí khi Shipper đã tiếp nhận đơn hàng!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map Container */}
          <div className="lg:col-span-2">
            <div className="relative h-[350px] sm:h-[400px] w-full bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl overflow-hidden border border-orange-100">
              {/* Live Badge */}
              <div className="absolute top-3 left-3 z-20 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400"></span>
                </span>
                LIVE
              </div>

              {mapHtml ? (
                <iframe
                  title="Order Tracking Map"
                  srcDoc={mapHtml}
                  className="w-full h-full"
                  style={{ border: 0 }}
                  sandbox="allow-same-origin allow-scripts allow-forms"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-orange-400">
                  <i className="fa-solid fa-satellite-dish fa-spin text-4xl mb-3"></i>
                  <p className="font-semibold">Đang tải bản đồ...</p>
                </div>
              )}
            </div>
          </div>

          {/* Shipper Info Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-5 border border-blue-100 h-full">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-blue-100">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-motorcycle text-white text-sm"></i>
                </div>
                <h4 className="font-bold text-gray-800">Thông Tin Shipper</h4>
              </div>

              {/* Avatar & Name */}
              <div className="flex flex-col items-center text-center mb-4">
                <div className="relative mb-3">
                  <img
                    src={orderInfo.shipper_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(orderInfo.shipper_name || 'S')}&background=EE4D2D&color=fff&size=128`}
                    alt="Shipper"
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                  <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></span>
                </div>
                <h5 className="font-bold text-lg text-gray-900 mb-1">
                  {orderInfo.shipper_name || 'Đang tìm Shipper...'}
                </h5>
                <p className="text-gray-500 text-sm flex items-center gap-2">
                  <i className="fa-solid fa-phone text-blue-400"></i>
                  {orderInfo.shipper_phone || 'Chưa có thông tin'}
                </p>
              </div>

              {/* Distance & ETA Stats */}
              {distance !== null && (
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-3 mb-4 border border-orange-100">
                  <div className="grid grid-cols-2 divide-x divide-orange-200">
                    <div className="text-center px-2">
                      <div className="text-2xl font-black text-orange-600 flex items-center justify-center gap-1">
                        {formatDistance(distance)}
                      </div>
                      <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wide mt-1">Khoảng cách</div>
                    </div>
                    <div className="text-center px-2">
                      <div className="text-2xl font-black text-orange-600 flex items-center justify-center gap-1">
                        {formatDuration(duration)}
                      </div>
                      <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wide mt-1">Thời gian đến</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Last Update */}
              <div className="bg-white rounded-lg p-3 mb-4 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-gray-400"></i>
                  <span className="text-xs text-gray-500">Cập nhật vị trí:</span>
                </div>
                <span className="text-xs font-bold text-blue-600">{formatTime(orderInfo.last_location_update)}</span>
              </div>

              {/* Call Button */}
              {orderInfo.shipper_phone && (
                <a
                  href={`tel:${orderInfo.shipper_phone}`}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <i className="fa-solid fa-phone-volume"></i>
                  Gọi Cho Shipper
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
