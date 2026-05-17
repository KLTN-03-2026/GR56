import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from "react-native";
import { WebView } from "react-native-webview";
import Geolocation from "react-native-geolocation-service";
import { requestLocationPermission } from "../utils/location";
import Ionicons from "react-native-vector-icons/Ionicons";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { NDA_API_KEY } from "../config/mapbox";

const PRIMARY = "#EE4D2D";

interface Props {
  visible: boolean;
  onClose: () => void;
  mode?: "restaurant" | "dual_address" | "three_point" | "shipper_to_customer" | "shipper_delivery";
  destAddress: string;
  destName?: string;
  secondAddress?: string;
  secondName?: string;
  shipperAddress?: string;
  shipperName?: string;
  destCoord?: [number, number] | null;
  secondCoord?: [number, number] | null;
  shipperCoord?: [number, number] | null;
  restaurantCoord?: [number, number] | null;
}

const buildHTML = (
  mode: string,
  destAddress: string,
  destName: string = "",
  secondAddress: string,
  secondName: string,
  shipperAddress: string,
  shipperName: string,
  destCoord: [number, number] | null = null,
  secondCoord: [number, number] | null = null,
  shipperCoord: [number, number] | null = null,
  restaurantCoord: [number, number] | null = null,
): string => {
  const safe = (s: string) => (s || "").replace(/\\/g, "\\\\").replace(/`/g, "'");
  const initShip = shipperCoord ? JSON.stringify(shipperCoord) : "null";
  const initRestaurant = restaurantCoord ? JSON.stringify(restaurantCoord) : "null";
  const safeDestName = safe(destName);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link href="https://unpkg.com/ndamap-gl@latest/dist/ndamap-gl.css" rel="stylesheet"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; font-family:-apple-system,sans-serif; }
    #overlay {
      position:fixed; inset:0; background:#f8fafc;
      display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      gap:14px; z-index:9999;
    }
    #overlay.gone { display:none; }
    .spin {
      width:38px; height:38px; border:4px solid #e2e8f0;
      border-top-color:#EE4D2D; border-radius:50%;
      animation: sp 0.8s linear infinite;
    }
    @keyframes sp { to { transform:rotate(360deg); } }

    /* ── Top Navigation Banner (Google Maps style) ── */
    #nav-banner {
      position:fixed; top:0; left:0; right:0; z-index:300;
      background:linear-gradient(135deg,#1a7f37 0%,#2ea043 100%);
      color:#fff; display:none; flex-direction:column;
      box-shadow:0 4px 20px rgba(0,0,0,0.3);
    }
    #nav-banner.active { display:flex; }
    #nav-current {
      display:flex; align-items:center; padding:16px 16px 12px; gap:14px;
    }
    #nav-current-icon {
      font-size:36px; width:56px; height:56px;
      display:flex; align-items:center; justify-content:center;
      background:rgba(255,255,255,0.15); border-radius:14px; flex-shrink:0;
    }
    #nav-current-info { flex:1; }
    #nav-current-road { font-size:22px; font-weight:800; line-height:1.2; }
    #nav-current-detail { font-size:13px; opacity:0.85; margin-top:3px; }
    #nav-next {
      display:flex; align-items:center; gap:8px;
      padding:8px 16px 10px; background:rgba(0,0,0,0.15);
      font-size:13px; font-weight:600;
    }
    #nav-next-label { opacity:0.8; }
    #nav-next-text { flex:1; }

    /* ── Bottom Info Bar ── */
    #nav-bottom {
      position:fixed; bottom:0; left:0; right:0; z-index:300;
      background:#fff; display:none;
      box-shadow:0 -4px 20px rgba(0,0,0,0.12);
      border-radius:20px 20px 0 0;
    }
    #nav-bottom.active { display:block; }
    #nav-eta {
      display:flex; align-items:center; padding:16px 20px; gap:16px;
    }
    #nav-eta-time {
      font-size:32px; font-weight:900; color:#1a7f37;
    }
    #nav-eta-unit { font-size:14px; color:#1a7f37; font-weight:600; }
    #nav-eta-sep { width:1px; height:36px; background:#e2e8f0; }
    #nav-eta-dist { font-size:14px; color:#64748b; font-weight:500; }
    #nav-eta-arrival { font-size:14px; color:#64748b; font-weight:500; }

    /* ── Steps list (expandable) ── */
    #nav-steps-toggle {
      display:flex; align-items:center; justify-content:center;
      padding:8px; border-top:1px solid #f1f5f9; cursor:pointer;
      font-size:13px; color:#64748b; font-weight:600; gap:4px;
    }
    #nav-steps-list {
      max-height:0; overflow:hidden; transition:max-height 0.3s;
    }
    #nav-steps-list.open { max-height:40vh; overflow-y:auto; }
    .step-item {
      display:flex; align-items:center; gap:12px;
      padding:12px 20px; border-top:1px solid #f8fafc;
    }
    .step-item:first-child { border-top:none; }
    .step-icon { font-size:20px; width:32px; text-align:center; flex-shrink:0; }
    .step-text { flex:1; font-size:14px; color:#334155; font-weight:500; }
    .step-dist { font-size:12px; color:#94a3b8; font-weight:500; }
    .step-active { background:#f0fdf4; }
    .step-active .step-text { color:#15803d; font-weight:700; }

    /* ── Recenter button ── */
    #recenter-btn {
      position:fixed; right:16px; z-index:250;
      width:48px; height:48px; border-radius:50%;
      background:#fff; border:none; box-shadow:0 2px 12px rgba(0,0,0,0.2);
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; font-size:22px;
    }

    .maplibregl-ctrl-top-right { top:auto !important; }
  </style>
</head>
<body>
  <div id="overlay"><div class="spin"></div><p id="msg">Đang khởi tạo...</p></div>
  <div id="map"></div>

  <!-- Navigation Banner -->
  <div id="nav-banner">
    <div id="nav-current">
      <div id="nav-current-icon">⬆️</div>
      <div id="nav-current-info">
        <div id="nav-current-road">Đang tải...</div>
        <div id="nav-current-detail"></div>
      </div>
    </div>
    <div id="nav-next">
      <span id="nav-next-label">Sau đó</span>
      <span id="nav-next-icon">➡️</span>
      <span id="nav-next-text">...</span>
    </div>
  </div>

  <!-- Recenter -->
  <button id="recenter-btn" onclick="recenterMap()" style="bottom:200px;">🎯</button>

  <!-- Bottom bar -->
  <div id="nav-bottom">
    <div id="nav-eta">
      <div>
        <span id="nav-eta-time">--</span>
        <span id="nav-eta-unit">phút</span>
      </div>
      <div id="nav-eta-sep"></div>
      <div>
        <div id="nav-eta-dist">-- km</div>
        <div id="nav-eta-arrival">Đến lúc --:--</div>
      </div>
    </div>
    <div id="nav-steps-toggle" onclick="toggleSteps()">
      <span>📋</span> Các bước chỉ đường <span id="toggle-arrow">▲</span>
    </div>
    <div id="nav-steps-list"></div>
  </div>

  <script src="https://unpkg.com/ndamap-gl@latest/dist/ndamap-gl.js"></script>
  <script>
    var TOKEN = '${NDA_API_KEY}';
    var DEST_ADDR = '${safe(destAddress)}';
    var DEST_NAME = '${safeDestName}';
    var DEST_COORD = ${destCoord ? JSON.stringify(destCoord) : "null"};
    var INIT_SHIP_COORD = ${initShip};
    var INIT_RESTAURANT_COORD = ${initRestaurant};
    var _allSteps = [];
    var _routeCoords = [];
    var _following = true;
    var _prevBearing = 0;

    var map = new ndamapgl.Map({
      container: 'map',
      style: 'https://tiles.openmap.vn/styles/day-v1/style.json',
      center: [108.2022, 16.0544],
      zoom: 16, pitch: 45, bearing: 0
    });

    map.on('dragstart', function() { _following = false; });

    function hideOverlay() { document.getElementById('overlay').classList.add('gone'); }

    // ── Maneuver helpers ──
    var TURN_ICONS = {
      depart:'🚗', arrive:'🏁',
      'turn-left':'⬅️', 'turn-right':'➡️',
      'sharp left':'↩️', 'sharp right':'↪️',
      'slight left':'↖️', 'slight right':'↗️',
      'straight':'⬆️', 'uturn':'🔄',
      'rotary':'🔄', 'roundabout':'🔄',
      'fork':'🔀', 'merge':'🔀',
      'on ramp':'⬆️', 'off ramp':'↘️',
      'end of road':'🛑'
    };

    function getIcon(type, modifier) {
      if (type === 'arrive') return '🏁';
      if (type === 'depart') return '🚗';
      var key = modifier ? type + '-' + modifier : type;
      if (TURN_ICONS[key]) return TURN_ICONS[key];
      if (modifier && TURN_ICONS[modifier]) return TURN_ICONS[modifier];
      if (TURN_ICONS[type]) return TURN_ICONS[type];
      return '⬆️';
    }

    function getVietnamese(type, modifier, name) {
      var road = name || '';
      if (type === 'depart') return 'Bắt đầu' + (road ? ' trên ' + road : '');
      if (type === 'arrive') return 'Đến nơi — ' + DEST_NAME;
      var dir = '';
      if (modifier === 'left' || modifier === 'sharp left' || modifier === 'slight left') dir = 'Rẽ trái';
      else if (modifier === 'right' || modifier === 'sharp right' || modifier === 'slight right') dir = 'Rẽ phải';
      else if (modifier === 'uturn') dir = 'Quay đầu';
      else if (modifier === 'straight') dir = 'Đi thẳng';
      else dir = 'Tiếp tục';
      return dir + (road ? ' vào ' + road : '');
    }

    function formatDist(m) {
      if (m >= 1000) return (m/1000).toFixed(1) + ' km';
      return Math.round(m) + ' m';
    }

    // ── Toggle steps ──
    function toggleSteps() {
      var el = document.getElementById('nav-steps-list');
      var arrow = document.getElementById('toggle-arrow');
      el.classList.toggle('open');
      arrow.textContent = el.classList.contains('open') ? '▼' : '▲';
    }

    // ── Update navigation banner ──
    function updateNavUI(steps, totalDist, totalDur) {
      _allSteps = steps;
      var banner = document.getElementById('nav-banner');
      var bottom = document.getElementById('nav-bottom');

      if (!steps || steps.length === 0) return;

      banner.classList.add('active');
      bottom.classList.add('active');

      // Current step
      var cur = steps[0];
      document.getElementById('nav-current-icon').textContent = getIcon(cur.type, cur.modifier);
      document.getElementById('nav-current-road').textContent = cur.name || getVietnamese(cur.type, cur.modifier, cur.name);
      document.getElementById('nav-current-detail').textContent = formatDist(cur.distance);

      // Next step
      if (steps.length > 1) {
        var nxt = steps[1];
        document.getElementById('nav-next').style.display = 'flex';
        document.getElementById('nav-next-icon').textContent = getIcon(nxt.type, nxt.modifier);
        document.getElementById('nav-next-text').textContent = getVietnamese(nxt.type, nxt.modifier, nxt.name);
      } else {
        document.getElementById('nav-next').style.display = 'none';
      }

      // ETA
      var mins = Math.round(totalDur / 60);
      document.getElementById('nav-eta-time').textContent = mins;
      document.getElementById('nav-eta-dist').textContent = formatDist(totalDist);
      var arrival = new Date(Date.now() + totalDur * 1000);
      document.getElementById('nav-eta-arrival').textContent =
        'Đến lúc ' + arrival.getHours().toString().padStart(2,'0') + ':' + arrival.getMinutes().toString().padStart(2,'0');

      // Steps list
      var html = '';
      steps.forEach(function(s, i) {
        var icon = getIcon(s.type, s.modifier);
        var text = getVietnamese(s.type, s.modifier, s.name);
        var cls = i === 0 ? ' step-active' : '';
        html += '<div class="step-item' + cls + '">' +
          '<span class="step-icon">' + icon + '</span>' +
          '<span class="step-text">' + text + '</span>' +
          '<span class="step-dist">' + formatDist(s.distance) + '</span></div>';
      });
      document.getElementById('nav-steps-list').innerHTML = html;
    }

    // ── Recenter ──
    function recenterMap() {
      _following = true;
      if (_ship) {
        map.flyTo({ center: _ship, zoom: 17, pitch: 45, bearing: _prevBearing, duration: 600 });
      }
    }

    // ── Markers ──
    var _dest = null;
    var _ship = null;
    var _destMarker = null;
    var _shipMarker = null;
    var _shipEl = null;

    function isValidCoord(c) {
      if (!c || !Array.isArray(c) || c.length < 2) return false;
      if (isNaN(c[0]) || isNaN(c[1])) return false;
      if (c[0] === 0 && c[1] === 0) return false;
      return c[0] >= -180 && c[0] <= 180 && c[1] >= -90 && c[1] <= 90;
    }

    function autoFixCoord(c) {
      if (!c || !Array.isArray(c) || c.length < 2) return c;
      if (c[1] >= 15.8 && c[1] <= 16.3 && c[0] >= 107.5 && c[0] <= 108.5) return c;
      if (c[0] >= 15.8 && c[0] <= 16.3 && c[1] >= 107.5 && c[1] <= 108.5) return [c[1], c[0]];
      return c;
    }

    function geocodeNDA(query, callback) {
      var q = query.toLowerCase().includes('nẵng') ? query : query + ', Đà Nẵng';
      var url = 'https://mapapis.openmap.vn/v1/geocode/forward?text=' + encodeURIComponent(q) + '&apikey=' + TOKEN;
      fetch(url).then(function(r){return r.json()}).then(function(d) {
        if (d.features && d.features.length > 0) {
          var c = d.features[0].geometry.coordinates;
          if (isValidCoord(c)) callback(c); else callback(null);
        } else callback(null);
      }).catch(function(){ callback(null); });
    }

    // ── Draw route ──
    function drawRoute(p1, p2) {
      if (!p1 || !p2) return;
      var url = 'https://router.project-osrm.org/route/v1/driving/'+p1[0]+','+p1[1]+';'+p2[0]+','+p2[1]+'?overview=full&geometries=geojson&steps=true&alternatives=3';
      fetch(url).then(function(r){return r.json()}).then(function(d){
        var coords = null;
        var steps = [];
        var totalDist = 0, totalDur = 0;
        if (d.code === 'Ok' && d.routes && d.routes.length) {
          var route = d.routes[0];
          for (var i = 1; i < d.routes.length; i++) {
            if (d.routes[i].distance < route.distance) route = d.routes[i];
          }
          if (route.geometry && route.geometry.coordinates) coords = route.geometry.coordinates;
          totalDist = route.distance || 0;
          totalDur = route.duration || 0;
          if (route.legs && route.legs[0] && route.legs[0].steps) {
            steps = route.legs[0].steps.map(function(s) {
              return {
                type: s.maneuver ? s.maneuver.type : 'turn',
                modifier: s.maneuver ? s.maneuver.modifier || '' : '',
                name: s.name || '',
                distance: s.distance || 0,
                duration: s.duration || 0,
                location: s.maneuver ? s.maneuver.location : null,
                bearing_after: s.maneuver ? s.maneuver.bearing_after : 0
              };
            });
          }
        }
        if (!coords || coords.length < 2) coords = [p1, p2];
        _routeCoords = coords;

        // Draw route line with outline
        if (map.getSource('route-outline')) {
          map.getSource('route-outline').setData({ type:'Feature', geometry:{ type:'LineString', coordinates:coords }});
          map.getSource('route').setData({ type:'Feature', geometry:{ type:'LineString', coordinates:coords }});
        } else {
          map.addSource('route-outline', { type:'geojson', data:{ type:'Feature', geometry:{ type:'LineString', coordinates:coords }}});
          map.addLayer({ id:'route-outline-line', type:'line', source:'route-outline',
            layout:{ 'line-join':'round', 'line-cap':'round' },
            paint:{ 'line-color':'#fff', 'line-width':9 }});
          map.addSource('route', { type:'geojson', data:{ type:'Feature', geometry:{ type:'LineString', coordinates:coords }}});
          map.addLayer({ id:'route-line', type:'line', source:'route',
            layout:{ 'line-join':'round', 'line-cap':'round' },
            paint:{ 'line-color':'#2563eb', 'line-width':6, 'line-opacity':0.9 }});
        }

        // Fit & update UI
        if (!_ship) {
          var b = new ndamapgl.LngLatBounds();
          coords.forEach(function(c) { b.extend(c); });
          map.fitBounds(b, { padding:{ top:180, bottom:220, left:40, right:40 } });
        }
        updateNavUI(steps, totalDist, totalDur);

        // Set bearing from first step
        if (steps.length > 0 && steps[0].bearing_after) {
          _prevBearing = steps[0].bearing_after;
          if (_following && _ship) {
            map.flyTo({ center:_ship, bearing:_prevBearing, zoom:17, pitch:45, duration:800 });
          }
        }
      }).catch(function(){
        if (!map.getSource('route')) {
          map.addSource('route', { type:'geojson', data:{ type:'Feature', geometry:{ type:'LineString', coordinates:[p1, p2] }}});
          map.addLayer({ id:'route-line', type:'line', source:'route',
            paint:{ 'line-color':'#EE4D2D', 'line-width':4, 'line-dasharray':[2,1] }});
        }
      });
    }

    function updateMap() {
      if (!_dest) return;
      if (!isValidCoord(_dest)) return;
      hideOverlay();

      if (!_destMarker) {
        var el1 = document.createElement('div');
        el1.style.cssText = 'width:40px;height:40px;background:#EE4D2D;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 3px 12px rgba(0,0,0,0.3);';
        el1.innerHTML = '<span style="transform:rotate(45deg);font-size:18px;">📍</span>';
        _destMarker = new ndamapgl.Marker({ element:el1, anchor:'bottom' }).setLngLat(_dest).addTo(map);
      }

      if (_ship) {
        if (!_shipMarker) {
          _shipEl = document.createElement('div');
          _shipEl.style.cssText = 'width:24px;height:24px;position:relative;';
          _shipEl.innerHTML =
            '<div style="width:24px;height:24px;background:#2563eb;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(37,99,235,0.5);position:relative;z-index:2;"></div>' +
            '<div style="position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(37,99,235,0.15);top:50%;left:50%;transform:translate(-50%,-50%);z-index:1;animation:pulse 2s infinite;"></div>';
          var style = document.createElement('style');
          style.textContent = '@keyframes pulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.6}50%{transform:translate(-50%,-50%) scale(1.6);opacity:0.15}}';
          document.head.appendChild(style);
          _shipMarker = new ndamapgl.Marker({ element:_shipEl, anchor:'center' }).setLngLat(_ship).addTo(map);
        } else {
          _shipMarker.setLngLat(_ship);
        }

        // Calculate bearing
        if (_routeCoords.length > 1) {
          var closest = 0, minD = 99999;
          for (var i = 0; i < _routeCoords.length; i++) {
            var dx = _routeCoords[i][0] - _ship[0], dy = _routeCoords[i][1] - _ship[1];
            var dd = dx*dx + dy*dy;
            if (dd < minD) { minD = dd; closest = i; }
          }
          if (closest < _routeCoords.length - 1) {
            var next = _routeCoords[closest + 1];
            var dLng = next[0] - _ship[0], dLat = next[1] - _ship[1];
            _prevBearing = Math.atan2(dLng, dLat) * 180 / Math.PI;
          }
        }

        if (_following) {
          map.flyTo({ center:_ship, bearing:_prevBearing, zoom:17, pitch:45, duration:800 });
        }
        drawRoute(_ship, _dest);
      } else {
        // Không có GPS shipper → vẽ route quán → khách nếu có tọa độ quán
        var restCoord = INIT_RESTAURANT_COORD ? autoFixCoord(INIT_RESTAURANT_COORD) : null;
        if (restCoord && isValidCoord(restCoord)) {
          // Hiện marker quán
          if (!document.getElementById('rest-marker-added')) {
            var elR = document.createElement('div');
            elR.id = 'rest-marker-added';
            elR.style.cssText = 'width:36px;height:36px;background:#22c55e;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 3px 12px rgba(0,0,0,0.3);';
            elR.innerHTML = '<span style="transform:rotate(45deg);font-size:16px;">🏪</span>';
            new ndamapgl.Marker({ element:elR, anchor:'bottom' }).setLngLat(restCoord).addTo(map);
          }
          drawRoute(restCoord, _dest);
          var b = new ndamapgl.LngLatBounds();
          b.extend(restCoord);
          b.extend(_dest);
          map.fitBounds(b, { padding:{ top:100, bottom:100, left:40, right:40 } });
        } else {
          map.flyTo({ center:_dest, zoom:15, pitch:0 });
        }
        // Hiện thông báo chờ GPS
        var gpsMsg = document.getElementById('gps-waiting');
        if (!gpsMsg) {
          gpsMsg = document.createElement('div');
          gpsMsg.id = 'gps-waiting';
          gpsMsg.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.75);color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;z-index:400;font-family:sans-serif;';
          gpsMsg.textContent = '📡 Đang lấy vị trí GPS...';
          document.body.appendChild(gpsMsg);
        }
      }
    }

    window.onShipperLocation = function(lat, lng) {
      var coord = [lng, lat];
      if (!isValidCoord(coord)) return;
      _ship = coord;
      var gpsMsg = document.getElementById('gps-waiting');
      if (gpsMsg) gpsMsg.remove();
      updateMap();
    };

    map.on('load', function() {
      if (INIT_SHIP_COORD) {
        var fixed = autoFixCoord(INIT_SHIP_COORD);
        if (isValidCoord(fixed)) _ship = fixed;
      }
      if (DEST_COORD && DEST_COORD[0]) {
        var fixedD = autoFixCoord(DEST_COORD);
        if (isValidCoord(fixedD)) { _dest = fixedD; updateMap(); }
        else { geocodeNDA(DEST_ADDR, function(c) { _dest = c || [108.2022,16.0544]; updateMap(); }); }
      } else {
        geocodeNDA(DEST_ADDR, function(c) { _dest = c || [108.2022,16.0544]; updateMap(); });
      }
    });
  <\/script>
</body>
</html>`;
};

const DeliveryMapModal: React.FC<Props> = ({ visible, onClose, destAddress, destName, destCoord, shipperCoord, restaurantCoord }) => {
  const webviewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { if (visible) setReady(false); }, [visible]);

  const handleRefresh = () => {
    Geolocation.getCurrentPosition(
      (pos) => {
        webviewRef.current?.injectJavaScript(`window.onShipperLocation(${pos.coords.latitude},${pos.coords.longitude}); true;`);
      },
      (err) => {
        if (err.code === 1) Alert.alert("GPS", "Vui lòng bật quyền truy cập vị trí trong cài đặt iPhone.");
        else console.warn(err);
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (!visible || !ready) return;
    let watchId: number;
    let gpsFailed = false;
    let gpsSucceeded = false;

    // Kiểm tra tọa độ có nằm trong Việt Nam không (tránh Simulator trả về vị trí sai)
    const isInVietnam = (lat: number, lng: number): boolean => {
      return lat >= 8.0 && lat <= 23.5 && lng >= 102.0 && lng <= 110.0;
    };

    const injectFromBE = () => {
      if (shipperCoord) {
        webviewRef.current?.injectJavaScript(
          `window.onShipperLocation(${shipperCoord[1]}, ${shipperCoord[0]}); true;`
        );
      } else {
        // Không có cả GPS lẫn server coord → hiện thông báo
        webviewRef.current?.injectJavaScript(`
          var gpsMsg = document.getElementById('gps-waiting');
          if (gpsMsg) gpsMsg.textContent = '⚠️ Không lấy được vị trí GPS';
          true;
        `);
      }
    };

    // BƯỚC 1: Inject ngay tọa độ từ server nếu có (không chờ GPS)
    if (shipperCoord) {
      webviewRef.current?.injectJavaScript(
        `window.onShipperLocation(${shipperCoord[1]}, ${shipperCoord[0]}); true;`
      );
    }

    const startGPS = async () => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        injectFromBE();
        webviewRef.current?.injectJavaScript(`
          var gpsMsg = document.getElementById('gps-waiting');
          if (gpsMsg) gpsMsg.textContent = '📡 Dùng vị trí từ server';
          true;
        `);
        return;
      }

      // BƯỚC 2: Thử lấy GPS thật (timeout 5s, nếu fail hoặc ngoài VN → dùng server coord)
      Geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          if (!isInVietnam(latitude, longitude)) {
            // Tọa độ ngoài Việt Nam (Simulator default location) → bỏ qua, dùng server
            console.log(`GPS ngoài VN: ${latitude}, ${longitude} → dùng server coord`);
            if (!gpsFailed) { gpsFailed = true; injectFromBE(); }
            return;
          }
          gpsSucceeded = true;
          webviewRef.current?.injectJavaScript(
            `window.onShipperLocation(${latitude},${longitude}); true;`
          );
        },
        (err) => {
          console.log("GPS getCurrentPosition Error:", err.code, err.message);
          if (!gpsFailed) { gpsFailed = true; injectFromBE(); }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
      );

      // BƯỚC 3: Watch GPS liên tục (cập nhật vị trí real-time)
      watchId = Geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          if (!isInVietnam(latitude, longitude)) {
            // Tọa độ ngoài Việt Nam → bỏ qua
            console.log(`GPS Watch ngoài VN: ${latitude}, ${longitude} → bỏ qua`);
            return;
          }
          gpsSucceeded = true;
          gpsFailed = false;
          webviewRef.current?.injectJavaScript(
            `window.onShipperLocation(${latitude},${longitude}); true;`
          );
        },
        (err) => {
          console.log("GPS Watch Error:", err.code, err.message);
          if (!gpsSucceeded && !gpsFailed) { gpsFailed = true; injectFromBE(); }
        },
        { enableHighAccuracy: true, distanceFilter: 5, interval: 3000, fastestInterval: 2000 }
      );
    };
    startGPS();
    return () => { if (watchId !== undefined) Geolocation.clearWatch(watchId); };
  }, [visible, ready]);

  // Inject shipper coord từ WebSocket vào WebView khi prop thay đổi (real-time)
  useEffect(() => {
    if (!ready || !shipperCoord) return;
    const script = `window.onShipperLocation(${shipperCoord[1]}, ${shipperCoord[0]}); true;`;
    webviewRef.current?.injectJavaScript(script);
  }, [ready, shipperCoord?.[0], shipperCoord?.[1]]);

  return (
    <Modal visible={visible} animationType="slide">
      <View style={S.container}>
        <View style={S.header}>
          <Text style={S.title}>Chỉ đường giao hàng</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={handleRefresh} style={S.headerIconBtn}>
              <Ionicons name="refresh" size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={S.closeBtn}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
        <WebView
          ref={webviewRef}
          source={{ html: buildHTML("shipper_delivery", destAddress, destName ?? "", "", "", "", "", destCoord, null, shipperCoord ?? null, restaurantCoord ?? null), baseUrl: 'https://mapapis.openmap.vn' }}
          style={{ flex: 1 }}
          onLoadEnd={() => setReady(true)}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          originWhitelist={["*"]}
          allowUniversalAccessFromFileURLs
          allowFileAccess
          allowFileAccessFromFileURLs
        />
      </View>
    </Modal>
  );
};

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    paddingTop: hp("5%"), paddingBottom: 15, paddingHorizontal: 20,
    backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  title: { color: "#FFF", fontSize: 18, fontWeight: "700" },
  headerIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
});

export default DeliveryMapModal;
