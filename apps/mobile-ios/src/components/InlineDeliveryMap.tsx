import React from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { NDA_API_KEY } from "../config/mapbox";

interface Props {
  /**
   * dual_address        : quán → khách (tinh_trang 0 - chờ nhận)
   * three_point         : quán + shipper + khách (tinh_trang 1 - đã nhận)
   * shipper_to_customer : shipper → khách (tinh_trang 2 - đang giao)
   */
  mode: "dual_address" | "three_point" | "shipper_to_customer";
  destAddress: string;   // địa chỉ quán
  destName: string;
  destCoord?: [number, number] | null;   // [lng, lat] quán — dùng thẳng, bỏ qua geocode
  secondAddress?: string; // địa chỉ khách
  secondName?: string;
  secondCoord?: [number, number] | null; // [lng, lat] khách — dùng thẳng, bỏ qua geocode
  shipperAddress?: string; // địa chỉ shipper (geocode từ địa chỉ quán khi đã nhận/đang giao)
  shipperName?: string;
  shipperCoord?: [number, number] | null; // [lng, lat] GPS thật của shipper
  height?: number;
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
  shipperCoord: [number, number] | null = null,
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
      width:32px; height:32px; border:3px solid #e2e8f0;
      border-top-color:${PRIMARY}; border-radius:50%;
      animation: sp 0.8s linear infinite;
    }
    @keyframes sp { to { transform:rotate(360deg); } }
    #msg { color:#64748b; font-size:12px; text-align:center; padding:0 20px; line-height:1.5; }
    .maplibregl-popup-content { font-family:sans-serif; font-size:13px; max-width:200px; }
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
    var DEST_COORD = ${destCoord ? `[${destCoord[0]}, ${destCoord[1]}]` : 'null'};
    var SEC_COORD  = ${secondCoord ? `[${secondCoord[0]}, ${secondCoord[1]}]` : 'null'};
    var SHIP_COORD = ${shipperCoord ? `[${shipperCoord[0]}, ${shipperCoord[1]}]` : 'null'};

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

    // Fallback: NDAMaps Forward Geocoding
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

    // Nominatim free-form + nameHint (tên quán → chính xác hơn)
    function geocodeFreeForm(addr, callback, nameHint) {
      var street = addr.split(',')[0].trim();
      var query;
      if (nameHint && nameHint.trim()) {
        query = nameHint.trim() + ' ' + street + ' Đà Nẵng';
      } else {
        query = street + ' Đà Nẵng';
      }
      var url = 'https://nominatim.openstreetmap.org/search?q='
        + encodeURIComponent(query + ', Việt Nam')
        + '&format=json&limit=3&countrycodes=vn'
        + '&viewbox=107.85,16.22,108.35,15.96&bounded=1'
        + '&accept-language=vi';
      fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(d) {
          var hit = d && d.find(function(x) { return isInDanang(parseFloat(x.lon), parseFloat(x.lat)); });
          if (hit) {
            callback(parseFloat(hit.lon), parseFloat(hit.lat));
          } else {
            geocodeNDA(query, callback);
          }
        })
        .catch(function() { geocodeNDA(query, callback); });
    }

    // Geocode chính: nameHint → Nominatim free-form; không có → structured search → fallback NDAMaps
    function geocodeAddr(addr, callback, nameHint) {
      if (!addr || !addr.trim()) { callback(null, null); return; }
      if (nameHint && nameHint.trim()) {
        geocodeFreeForm(addr, callback, nameHint);
      } else {
        var streetPart = addr.split(',')[0].trim();
        var structUrl = 'https://nominatim.openstreetmap.org/search?'
          + 'street=' + encodeURIComponent(streetPart)
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
            paint: { 'line-color': PRIMARY, 'line-width': 4, 'line-opacity': 0.85 } });
        })
        .catch(function() {});
    }

    function fitToPoints(pts) {
      if (!pts.length) return;
      if (pts.length === 1) { map.setCenter(pts[0]); map.setZoom(17); return; }
      var b = new ndamapgl.LngLatBounds(pts[0], pts[0]);
      pts.forEach(function(p) { b.extend(p); });
      map.fitBounds(b, { padding: 60, maxZoom: 17 });
    }

    function makeMarker(emoji, lngLat, name, addr) {
      var el = document.createElement('div');
      el.style.cssText = 'font-size:24px;line-height:1;cursor:pointer;';
      el.textContent = emoji;
      new ndamapgl.Marker(el)
        .setLngLat(lngLat)
        .setPopup(new ndamapgl.Popup({ offset: 25 }).setHTML(
          '<b>' + name + '</b>' + (addr ? '<br><span style="color:#64748b;font-size:11px">' + addr + '</span>' : '')
        ))
        .addTo(map);
    }

    function makeShipperDot(lngLat, name) {
      var el = document.createElement('div');
      el.style.cssText = 'background:' + PRIMARY + ';width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5);cursor:pointer;';
      new ndamapgl.Marker(el)
        .setLngLat(lngLat)
        .setPopup(new ndamapgl.Popup({ offset: 10 }).setHTML('<b>' + name + '</b>'))
        .addTo(map);
    }

    // ── dual_address: quán → khách (tinh_trang 0) ──
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

    // ── three_point: quán + shipper + khách (tinh_trang 1) ──
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

    // ── shipper_to_customer: shipper → khách (tinh_trang 2) ──
    function initShipperToCustomer() {
      setMsg('Đang tìm địa chỉ...');
      resolvePoint(SHIP_COORD, SHIP_ADDR, function(lngS, latS) {
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

    map.on('load', function() {
      if (MODE === 'dual_address')             { initDualAddress(); }
      else if (MODE === 'three_point')          { initThreePoint(); }
      else if (MODE === 'shipper_to_customer')  { initShipperToCustomer(); }
    });
  <\/script>
</body>
</html>`;
};

const InlineDeliveryMap: React.FC<Props> = ({
  mode,
  destAddress,
  destName,
  destCoord = null,
  secondAddress = "",
  secondName = "",
  secondCoord = null,
  shipperAddress = "",
  shipperName = "",
  shipperCoord = null,
  height,
}) => {
  const mapHeight = height ?? hp("42%");
  const html = buildHTML(mode, destAddress, destName, secondAddress, secondName, shipperAddress, shipperName, destCoord, secondCoord, shipperCoord);

  return (
    <View style={[styles.container, { height: mapHeight }]}>
      <WebView
        source={{ html, baseUrl: 'https://mapapis.ndamaps.vn' }}
        style={StyleSheet.absoluteFill}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        originWhitelist={["*"]}
        scrollEnabled={false}
        allowUniversalAccessFromFileURLs
        allowFileAccess
        allowFileAccessFromFileURLs
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#F0F4F8",
  },
});

export default InlineDeliveryMap;
