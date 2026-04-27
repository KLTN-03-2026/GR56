import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import Geolocation from "react-native-geolocation-service";
import { requestLocationPermission } from "../utils/location";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { NDA_API_KEY } from "../config/mapbox";

interface Props {
  visible: boolean;
  onClose: () => void;
  /**
   * restaurant          : chỉ quán
   * dual_address        : quán → khách (tinh_trang 0)
   * three_point         : quán + shipper + khách (tinh_trang 1)
   * shipper_to_customer : shipper → khách (tinh_trang 2)
   * shipper_delivery    : GPS thiết bị → khách
   */
  mode?: "restaurant" | "dual_address" | "three_point" | "shipper_to_customer" | "shipper_delivery";
  destAddress: string;   // địa chỉ quán (hoặc điểm đến chính)
  destName: string;
  destCoord?: [number, number] | null;   // [lng, lat] điểm đến — dùng thẳng, bỏ qua geocode
  /** Tên POI dùng cho geocode (khác destName khi destName là tên người, không phải quán) */
  destGeocodeHint?: string;
  secondAddress?: string; // địa chỉ khách
  secondName?: string;
  secondCoord?: [number, number] | null; // [lng, lat] khách — dùng thẳng, bỏ qua geocode
  shipperAddress?: string; // địa chỉ shipper (geocode)
  shipperName?: string;
}

const PRIMARY = "#EE4D2D";

const buildHTML = (
  mode: string,
  destAddress: string,
  destName: string,
  secondAddress: string,
  secondName: string,
  shipperAddress: string = "",
  shipperName: string = "",
  destCoord: [number, number] | null = null,
  secondCoord: [number, number] | null = null,
  destGeocodeHint: string = "",
): string => {
  const safe = (s: string) => (s || "").replace(/\\/g, "\\\\").replace(/`/g, "'");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link href="https://unpkg.com/ndamap-gl@latest/dist/ndamap-gl.css" rel="stylesheet"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; }
    #overlay {
      position:fixed; inset:0; background:#f8fafc;
      display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      gap:14px; z-index:9999; font-family:sans-serif;
    }
    #overlay.gone { display:none; }
    .spin {
      width:38px; height:38px; border:4px solid #e2e8f0;
      border-top-color:${PRIMARY}; border-radius:50%;
      animation: sp 0.8s linear infinite;
    }
    @keyframes sp { to { transform:rotate(360deg); } }
    #msg { color:#64748b; font-size:14px; text-align:center; padding:0 28px; line-height:1.6; }
    .maplibregl-popup-content { font-family:sans-serif; font-size:13px; max-width:220px; }
  </style>
</head>
<body>
  <div id="overlay"><div class="spin"></div><p id="msg">Đang tải bản đồ...</p></div>
  <div id="map"></div>
  <script src="https://unpkg.com/ndamap-gl@latest/dist/ndamap-gl.js"></script>
  <script>
    var TOKEN = '${NDA_API_KEY}';
    var PRIMARY = '#EE4D2D';
    var MODE = '${mode}';
    var DEST_ADDR = \`${safe(destAddress)}\`;
    var DEST_NAME = \`${safe(destName)}\`;
    var SEC_ADDR  = \`${safe(secondAddress)}\`;
    var SEC_NAME  = \`${safe(secondName)}\`;
    var SHIP_ADDR = \`${safe(shipperAddress)}\`;
    var SHIP_NAME = \`${safe(shipperName)}\`;
    var DEST_COORD        = ${destCoord ? `[${destCoord[0]}, ${destCoord[1]}]` : 'null'};
    var SEC_COORD          = ${secondCoord ? `[${secondCoord[0]}, ${secondCoord[1]}]` : 'null'};
    var DEST_GEOCODE_HINT  = \`${safe(destGeocodeHint)}\`;

    function setMsg(t) { document.getElementById('msg').textContent = t; }
    function hideOverlay() { document.getElementById('overlay').classList.add('gone'); }

    var map = new ndamapgl.Map({
      container: 'map',
      style: 'https://nda-tiles.openmap.vn/styles/ndamap/style.json',
      center: [108.2022, 16.0544],
      zoom: 12
    });

    map.on('error', function(e) {
      setMsg('Lỗi bản đồ: ' + (e.error ? e.error.message : 'không tải được'));
    });

    // Kiểm tra tọa độ có nằm trong vùng Đà Nẵng không
    function isInDanang(lon, lat) {
      return lon >= 107.85 && lon <= 108.35 && lat >= 15.96 && lat <= 16.22;
    }

    // Fallback: NDAMaps Forward Geocoding (khi Nominatim không ra kết quả)
    function geocodeNDA(query, callback) {
      var q = query.toLowerCase().includes('nẵng') ? query : query + ', Đà Nẵng';
      var url = 'https://mapapis.ndamaps.vn/v1/geocode/forward?text='
        + encodeURIComponent(q)
        + '&apikey=' + TOKEN;
      fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.features && d.features.length > 0) {
            var c = d.features[0].geometry.coordinates;
            callback(c[0], c[1]);
          } else { callback(null, null); }
        })
        .catch(function() { callback(null, null); });
    }

    // Nominatim free-form fallback
    function geocodeFreeForm(addr, callback, nameHint) {
      // Lấy phần "số nhà + tên đường" (trước dấu phẩy đầu tiên)
      var street = addr.split(',')[0].trim();
      var query;
      if (nameHint && nameHint.trim()) {
        // Format đã test: "Highlands Coffee 240 Trần Phú Đà Nẵng" → đúng vị trí
        query = nameHint.trim() + ' ' + street + ' Đà Nẵng';
      } else {
        query = street + ' Đà Nẵng';
      }
      // Thử freeform với địa chỉ đầy đủ trước (có quận/tỉnh → chính xác hơn)
      var fullQuery = addr.toLowerCase().includes('đà nẵng') ? addr : addr + ', Đà Nẵng';
      var fullUrl = 'https://nominatim.openstreetmap.org/search?q='
        + encodeURIComponent(fullQuery + ', Việt Nam')
        + '&format=json&limit=3&countrycodes=vn'
        + '&viewbox=107.85,16.22,108.35,15.96&bounded=1'
        + '&accept-language=vi';
      fetch(fullUrl)
        .then(function(r) { return r.json(); })
        .then(function(d) {
          var hit = d && d.find(function(x) { return isInDanang(parseFloat(x.lon), parseFloat(x.lat)); });
          if (hit) {
            callback(parseFloat(hit.lon), parseFloat(hit.lat));
            return;
          }
          // Fallback: chỉ dùng street + Đà Nẵng
          var url = 'https://nominatim.openstreetmap.org/search?q='
            + encodeURIComponent(query + ', Việt Nam')
            + '&format=json&limit=3&countrycodes=vn'
            + '&viewbox=107.85,16.22,108.35,15.96&bounded=1'
            + '&accept-language=vi';
          fetch(url)
            .then(function(r) { return r.json(); })
            .then(function(d2) {
              var hit2 = d2 && d2.find(function(x) { return isInDanang(parseFloat(x.lon), parseFloat(x.lat)); });
              if (hit2) {
                callback(parseFloat(hit2.lon), parseFloat(hit2.lat));
              } else {
                geocodeNDA(fullQuery, callback);
              }
            })
            .catch(function() { geocodeNDA(fullQuery, callback); });
        })
        .catch(function() { geocodeNDA(fullQuery, callback); });
    }

    // Geocode chính:
    // - Nếu có tên quán (nameHint): free-form với tên POI → chính xác nhất (test confirmed)
    // - Nếu không có tên quán: structured search tách số nhà + tên đường + quận → fallback NDAMaps
    function geocodeAddr(addr, callback, nameHint) {
      if (!addr || !addr.trim()) { callback(null, null); return; }
      if (nameHint && nameHint.trim()) {
        // Có tên POI → free-form với tên quán cho kết quả tốt nhất
        geocodeFreeForm(addr, callback, nameHint);
      } else {
        // Không có tên quán → structured search, kèm quận đã bỏ tiền tố
        var parts = addr.split(',');
        var streetPart = parts[0].trim();
        var districtRaw = parts.length > 1 ? parts[1].trim() : '';
        var districtClean = districtRaw.replace(/^(quận|huyện|thị\s+xã|thành\s+phố)\s+/i, '').trim();
        var structUrl = 'https://nominatim.openstreetmap.org/search?'
          + 'street=' + encodeURIComponent(streetPart)
          + (districtClean ? '&county=' + encodeURIComponent(districtClean) : '')
          + '&city=' + encodeURIComponent('Đà Nẵng')
          + '&country=Vietnam'
          + '&format=json&limit=3&accept-language=vi';
        fetch(structUrl)
          .then(function(r) { return r.json(); })
          .then(function(d) {
            var hit = d && d.find(function(x) { return isInDanang(parseFloat(x.lon), parseFloat(x.lat)); });
            if (hit) {
              callback(parseFloat(hit.lon), parseFloat(hit.lat));
            } else {
              geocodeFreeForm(addr, callback, '');
            }
          })
          .catch(function() { geocodeFreeForm(addr, callback, ''); });
      }
    }

    // Dùng tọa độ sẵn có nếu hợp lệ, không thì geocode
    function resolvePoint(coord, addr, callback, nameHint) {
      if (coord && typeof coord[0] === 'number' && typeof coord[1] === 'number') {
        callback(coord[0], coord[1]);
      } else {
        geocodeAddr(addr, callback, nameHint);
      }
    }

    // Giải mã Google Polyline encoding → mảng [lng, lat]
    function decodePoly(enc) {
      var res = [], i = 0, lat = 0, lng = 0;
      while (i < enc.length) {
        var b, s = 0, v = 0;
        do { b = enc.charCodeAt(i++) - 63; v |= (b & 31) << s; s += 5; } while (b >= 32);
        lat += (v & 1) ? ~(v >> 1) : (v >> 1);
        s = 0; v = 0;
        do { b = enc.charCodeAt(i++) - 63; v |= (b & 31) << s; s += 5; } while (b >= 32);
        lng += (v & 1) ? ~(v >> 1) : (v >> 1);
        res.push([lng / 1e5, lat / 1e5]);
      }
      return res;
    }

    // Vẽ tuyến đường NDAMaps Routing API — p1/p2: [lng, lat]
    var routeIdx = 0;
    function drawRoute(p1, p2) {
      var url = 'https://mapapis.ndamaps.vn/v1/direction?origin='
        + p1[1] + ',' + p1[0]
        + '&destination=' + p2[1] + ',' + p2[0]
        + '&vehicle=car&apikey=' + TOKEN;
      fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (!d.routes || !d.routes[0] || !d.routes[0].overview_polyline) return;
          var coords = decodePoly(d.routes[0].overview_polyline.points);
          if (!coords.length) return;
          var id = 'r' + (routeIdx++);
          map.addSource(id, { type: 'geojson', data: {
            type: 'Feature', properties: {},
            geometry: { type: 'LineString', coordinates: coords }
          }});
          map.addLayer({ id: id, type: 'line', source: id,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': PRIMARY, 'line-width': 5, 'line-opacity': 0.85 } });
        })
        .catch(function() {});
    }

    function fitToPoints(pts) {
      if (!pts.length) return;
      if (pts.length === 1) { map.setCenter(pts[0]); map.setZoom(17); return; }
      var b = new ndamapgl.LngLatBounds(pts[0], pts[0]);
      pts.forEach(function(p) { b.extend(p); });
      map.fitBounds(b, { padding: 70, maxZoom: 17 });
    }

    function makeMarker(emoji, lngLat, name, addr) {
      var el = document.createElement('div');
      el.style.cssText = 'font-size:28px;line-height:1;cursor:pointer;';
      el.textContent = emoji;
      new ndamapgl.Marker(el)
        .setLngLat(lngLat)
        .setPopup(new ndamapgl.Popup({ offset: 30 }).setHTML(
          '<b>' + name + '</b>' + (addr ? '<br><span style="color:#64748b;font-size:11px">' + addr + '</span>' : '')
        ))
        .addTo(map);
    }

    function makeShipperDot(lngLat, name) {
      var el = document.createElement('div');
      el.style.cssText = 'background:' + PRIMARY + ';width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5);cursor:pointer;';
      new ndamapgl.Marker(el)
        .setLngLat(lngLat)
        .setPopup(new ndamapgl.Popup({ offset: 12 }).setHTML('<b>' + name + '</b>'))
        .addTo(map);
    }

    // ── restaurant ──
    function initRestaurant() {
      setMsg('Đang tìm địa chỉ quán...');
      geocodeAddr(DEST_ADDR, function(lng, lat) {
        if (lng === null) { setMsg('Không tìm thấy địa chỉ quán.'); return; }
        hideOverlay();
        map.setCenter([lng, lat]);
        map.setZoom(17);
        makeMarker('🏪', [lng, lat], DEST_NAME, DEST_ADDR);
      }, DEST_NAME);
    }

    // ── dual_address ──
    function initDualAddress() {
      setMsg('Đang tìm địa chỉ...');
      resolvePoint(DEST_COORD, DEST_ADDR, function(lng1, lat1) {
        resolvePoint(SEC_COORD, SEC_ADDR, function(lng2, lat2) {
          var pts = [];
          if (lng1 !== null) { pts.push([lng1, lat1]); makeMarker('🏪', [lng1, lat1], DEST_NAME, DEST_ADDR); }
          if (lng2 !== null) { pts.push([lng2, lat2]); makeMarker('📍', [lng2, lat2], SEC_NAME, SEC_ADDR); }
          if (!pts.length) { setMsg('Không tìm thấy địa chỉ.'); return; }
          hideOverlay();
          if (pts.length === 2) drawRoute(pts[0], pts[1]);
          fitToPoints(pts);
        }, '');
      }, DEST_NAME);
    }

    // ── three_point ──
    function initThreePoint() {
      setMsg('Đang tìm địa chỉ...');
      resolvePoint(DEST_COORD, DEST_ADDR, function(lng1, lat1) {
        geocodeAddr(SHIP_ADDR, function(lngS, latS) {
          resolvePoint(SEC_COORD, SEC_ADDR, function(lng2, lat2) {
            var pts = [];
            if (lng1 !== null) { pts.push([lng1, lat1]); makeMarker('🏪', [lng1, lat1], DEST_NAME, DEST_ADDR); }
            if (lngS !== null) { pts.push([lngS, latS]); makeShipperDot([lngS, latS], SHIP_NAME); }
            if (lng2 !== null) { pts.push([lng2, lat2]); makeMarker('📍', [lng2, lat2], SEC_NAME, SEC_ADDR); }
            if (!pts.length) { setMsg('Không tìm thấy địa chỉ.'); return; }
            hideOverlay();
            if (lng1 !== null && lngS !== null) drawRoute([lng1, lat1], [lngS, latS]);
            if (lngS !== null && lng2 !== null) drawRoute([lngS, latS], [lng2, lat2]);
            fitToPoints(pts);
          }, '');
        });
      }, DEST_NAME);
    }

    // ── shipper_to_customer ──
    function initShipperToCustomer() {
      setMsg('Đang tìm địa chỉ...');
      geocodeAddr(SHIP_ADDR, function(lngS, latS) {
        resolvePoint(SEC_COORD, SEC_ADDR, function(lng2, lat2) {
          var pts = [];
          if (lngS !== null) { pts.push([lngS, latS]); makeShipperDot([lngS, latS], SHIP_NAME); }
          if (lng2 !== null) { pts.push([lng2, lat2]); makeMarker('📍', [lng2, lat2], SEC_NAME, SEC_ADDR); }
          if (!pts.length) { setMsg('Không tìm thấy địa chỉ.'); return; }
          hideOverlay();
          if (pts.length === 2) drawRoute(pts[0], pts[1]);
          fitToPoints(pts);
        }, '');
      });
    }

    // ── shipper_delivery (GPS thiết bị → khách) ──
    var _destCoords = null;   // [lng, lat] sau khi geocode xong
    var _pendingShip = null;  // { lng, lat } | 'none' — GPS từ RN, buffered trước geocode

    function drawShipperMap(sLng, sLat, dLng, dLat) {
      hideOverlay();
      var pts = [[dLng, dLat]];
      makeMarker('📍', [dLng, dLat], DEST_NAME, DEST_ADDR);
      if (sLng !== null) {
        pts.unshift([sLng, sLat]);
        makeShipperDot([sLng, sLat], '📍 Vị trí của bạn');
        drawRoute([sLng, sLat], [dLng, dLat]);
      }
      fitToPoints(pts);
    }

    // RN inject: window.onShipperLocation(lat, lng)
    window.onShipperLocation = function(lat, lng) {
      if (_destCoords) {
        drawShipperMap(lng, lat, _destCoords[0], _destCoords[1]);
      } else {
        _pendingShip = { lng: lng, lat: lat };
      }
    };

    window.onNoLocation = function() {
      if (_destCoords) {
        drawShipperMap(null, null, _destCoords[0], _destCoords[1]);
      } else {
        _pendingShip = 'none';
      }
    };

    function startShipperDelivery() {
      // Nếu đã có tọa độ sẵn thì dùng luôn, không cần geocode
      if (DEST_COORD && typeof DEST_COORD[0] === 'number') {
        _destCoords = DEST_COORD;
        if (_pendingShip === 'none') {
          drawShipperMap(null, null, DEST_COORD[0], DEST_COORD[1]);
        } else if (_pendingShip) {
          drawShipperMap(_pendingShip.lng, _pendingShip.lat, DEST_COORD[0], DEST_COORD[1]);
        }
        return;
      }
      setMsg('Đang tìm địa chỉ giao hàng...');
      geocodeAddr(DEST_ADDR, function(dLng, dLat) {
        if (dLng === null) { setMsg('Không tìm thấy địa chỉ.'); return; }
        _destCoords = [dLng, dLat];
        if (_pendingShip === 'none') {
          drawShipperMap(null, null, dLng, dLat);
        } else if (_pendingShip) {
          drawShipperMap(_pendingShip.lng, _pendingShip.lat, dLng, dLat);
        }
      }, DEST_GEOCODE_HINT);
    }

    map.on('load', function() {
      if (MODE === 'restaurant')              { initRestaurant(); }
      else if (MODE === 'dual_address')        { initDualAddress(); }
      else if (MODE === 'three_point')         { initThreePoint(); }
      else if (MODE === 'shipper_to_customer') { initShipperToCustomer(); }
      else                                     { startShipperDelivery(); }
    });
  <\/script>
</body>
</html>`;
};

const DeliveryMapModal: React.FC<Props> = ({
  visible,
  onClose,
  mode = "shipper_delivery",
  destAddress,
  destName,
  destCoord = null,
  destGeocodeHint = "",
  secondAddress = "",
  secondName = "",
  secondCoord = null,
  shipperAddress = "",
  shipperName = "",
}) => {
  const webviewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const sent = useRef(false);

  useEffect(() => {
    if (!visible) { setReady(false); sent.current = false; }
  }, [visible]);

  useEffect(() => {
    if (!ready || sent.current) return;
    sent.current = true;

    // các mode tự khởi tạo không cần GPS
    if (mode === 'restaurant' || mode === 'dual_address' || mode === 'three_point' || mode === 'shipper_to_customer') return;

    // shipper_delivery: cần GPS thiết bị
    (async () => {
      try {
        const granted = await requestLocationPermission();
        if (!granted) {
          webviewRef.current?.injectJavaScript("window.onNoLocation(); true;");
          return;
        }
        Geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            webviewRef.current?.injectJavaScript(`window.onShipperLocation(${lat},${lng}); true;`);
          },
          () => webviewRef.current?.injectJavaScript("window.onNoLocation(); true;"),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
        );
      } catch {
        webviewRef.current?.injectJavaScript("window.onNoLocation(); true;");
      }
    })();
  }, [ready, mode]);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={S.root}>
        {/* Header */}
        <View style={S.header}>
          <View style={S.row}>
            <Ionicons name="navigate" size={20} color="#FFF" />
            <Text style={S.title}>Chỉ đường giao hàng</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={S.closeBtn} activeOpacity={0.8}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Address bar */}
        <View style={S.addrBar}>
          {mode === 'restaurant' ? (
            <View style={S.addrRow}>
              <View style={[S.dot, { backgroundColor: PRIMARY }]} />
              <Text style={S.addrText} numberOfLines={2}>🏪 {destName}{destAddress ? ` — ${destAddress}` : ''}</Text>
            </View>
          ) : mode === 'dual_address' ? (
            <>
              <View style={S.addrRow}>
                <View style={[S.dot, { backgroundColor: PRIMARY }]} />
                <Text style={S.addrText} numberOfLines={1}>{destName}: {destAddress}</Text>
              </View>
              <View style={S.divider} />
              <View style={S.addrRow}>
                <View style={[S.dot, { backgroundColor: '#10B981' }]} />
                <Text style={S.addrText} numberOfLines={2}>{secondName}: {secondAddress}</Text>
              </View>
            </>
          ) : mode === 'three_point' ? (
            <>
              <View style={S.addrRow}>
                <View style={[S.dot, { backgroundColor: PRIMARY }]} />
                <Text style={S.addrText} numberOfLines={1}>🏪 {destName}: {destAddress}</Text>
              </View>
              <View style={S.divider} />
              <View style={S.addrRow}>
                <View style={[S.dot, { backgroundColor: '#F59E0B' }]} />
                <Text style={S.addrText} numberOfLines={1}>🛵 {shipperName || 'Shipper'}</Text>
              </View>
              <View style={S.divider} />
              <View style={S.addrRow}>
                <View style={[S.dot, { backgroundColor: '#10B981' }]} />
                <Text style={S.addrText} numberOfLines={2}>{secondName}: {secondAddress}</Text>
              </View>
            </>
          ) : mode === 'shipper_to_customer' ? (
            <>
              <View style={S.addrRow}>
                <View style={[S.dot, { backgroundColor: '#F59E0B' }]} />
                <Text style={S.addrText} numberOfLines={1}>🛵 {shipperName || 'Shipper'}</Text>
              </View>
              <View style={S.divider} />
              <View style={S.addrRow}>
                <View style={[S.dot, { backgroundColor: '#10B981' }]} />
                <Text style={S.addrText} numberOfLines={2}>{secondName}: {secondAddress}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={S.addrRow}>
                <View style={[S.dot, { backgroundColor: PRIMARY }]} />
                <Text style={S.addrText}>Vị trí của bạn</Text>
              </View>
              <View style={S.divider} />
              <View style={S.addrRow}>
                <View style={[S.dot, { backgroundColor: '#10B981' }]} />
                <Text style={S.addrText} numberOfLines={2}>{destName ? `${destName} — ` : ''}{destAddress}</Text>
              </View>
            </>
          )}
        </View>

        {/* Map WebView */}
        <WebView
          ref={webviewRef}
          source={{ html: buildHTML(mode, destAddress, destName, secondAddress, secondName, shipperAddress, shipperName, destCoord, secondCoord, destGeocodeHint), baseUrl: 'https://mapapis.ndamaps.vn' }}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          originWhitelist={["*"]}
          allowUniversalAccessFromFileURLs
          allowFileAccess
          allowFileAccessFromFileURLs
          onLoadEnd={() => setReady(true)}
        />
      </View>
    </Modal>
  );
};

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1E293B" },
  header: {
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp("4%"),
    paddingTop: hp("5%"),
    paddingBottom: hp("1.5%"),
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: "#FFF", fontSize: wp("4.2%"), fontWeight: "700" },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  addrBar: {
    backgroundColor: "#FFF",
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.5%"),
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  addrRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  addrText: { flex: 1, fontSize: wp("3.4%"), color: "#334155", lineHeight: 20 },
  divider: { height: 7, width: 1, backgroundColor: "#CBD5E1", marginLeft: 4.5, marginVertical: 2 },
});

export default DeliveryMapModal;
