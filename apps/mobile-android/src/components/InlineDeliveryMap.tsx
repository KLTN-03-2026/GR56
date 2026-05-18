import React, { useRef, useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Text, Platform } from "react-native";
import { WebView } from "react-native-webview";
import {
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { NDA_API_KEY } from "../config/mapbox";

interface Props {
  mode: "dual_address" | "three_point" | "shipper_to_customer";
  destAddress: string;
  destName: string;
  destCoord?: [number, number] | null;
  secondAddress?: string;
  secondName?: string;
  secondCoord?: [number, number] | null;
  shipperAddress?: string;
  shipperName?: string;
  shipperCoord?: [number, number] | null;
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

    if (DEST_COORD) DEST_COORD = autoFixCoord(DEST_COORD);
    if (SEC_COORD)  SEC_COORD  = autoFixCoord(SEC_COORD);
    if (SHIP_COORD) SHIP_COORD = autoFixCoord(SHIP_COORD);

    function setMsg(t) { document.getElementById('msg').textContent = t; }
    function hideOverlay() { document.getElementById('overlay').classList.add('gone'); }

    try {
      var map = new ndamapgl.Map({
        container: 'map',
        style: 'https://tiles.openmap.vn/styles/day-v1/style.json',
        center: [108.2022, 16.0544],
        zoom: 12,
        antialias: false,
        failIfMajorPerformanceCaveat: false
      });

      map.on('error', function(e) {
        setMsg('Lỗi bản đồ: ' + (e.error ? e.error.message : 'không tải được'));
      });

      function autoFixCoord(c) {
        if (!c || !Array.isArray(c) || c.length < 2) return c;
        var lng = c[0], lat = c[1];
        if (lat >= 15.8 && lat <= 16.3 && lng >= 107.5 && lng <= 108.5) return c;
        if (lng >= 15.8 && lng <= 16.3 && lat >= 107.5 && lat <= 108.5) return [lat, lng];
        return c;
      }

      function geocodeNDA(query, callback) {
        var q = query.toLowerCase().includes('nẵng') ? query : query + ', Đà Nẵng';
        var url = 'https://mapapis.openmap.vn/v1/geocode/forward?text='
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

      function geocodeAddr(addr, callback, nameHint) {
        if (!addr || !addr.trim()) { callback(null, null); return; }
        var street = addr.split(',')[0].trim();
        var query;
        if (nameHint && nameHint.trim()) {
          query = nameHint.trim() + ' ' + street + ' Đà Nẵng';
        } else {
          query = street + ' Đà Nẵng';
        }
        geocodeNDA(query, callback);
      }

      function resolvePoint(coord, addr, callback, nameHint) {
        if (coord && typeof coord[0] === 'number' && typeof coord[1] === 'number') {
          callback(coord[0], coord[1]);
        } else {
          geocodeAddr(addr, callback, nameHint);
        }
      }

      var routeIdx = 0;
      function drawRoute(p1, p2) {
        var url = 'https://router.project-osrm.org/route/v1/driving/'
          + p1[0] + ',' + p1[1] + ';' + p2[0] + ',' + p2[1]
          + '?overview=full&geometries=geojson&alternatives=3';
        fetch(url)
          .then(function(r) { return r.json(); })
          .then(function(d) {
            if (!d.routes || !d.routes.length) return;
            var route = d.routes[0];
            for (var i = 1; i < d.routes.length; i++) {
              if (d.routes[i].distance < route.distance) route = d.routes[i];
            }
            var coords = route.geometry.coordinates;
            if (!coords || !coords.length) return;
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
        window.shipperMarker = new ndamapgl.Marker(el)
          .setLngLat(lngLat)
          .setPopup(new ndamapgl.Popup({ offset: 10 }).setHTML('<b>' + name + '</b>'))
          .addTo(map);
      }

      window.updateShipperLocation = function(lng, lat) {
        if (window.shipperMarker) {
          window.shipperMarker.setLngLat([lng, lat]);
        } else {
          makeShipperDot([lng, lat], SHIP_NAME);
        }
      };

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
    } catch(e) {
      setMsg('Lỗi: ' + e.message);
    }
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
  const webViewRef = useRef<WebView>(null);
  const [hasError, setHasError] = useState(false);

  const html = useMemo(() => {
    return buildHTML(mode, destAddress, destName, secondAddress, secondName, shipperAddress, shipperName, destCoord, secondCoord, shipperCoord);
  }, [mode, destAddress, destName, secondAddress, secondName, shipperAddress, shipperName, destCoord, secondCoord]);

  useEffect(() => {
    if (shipperCoord && shipperCoord.length === 2 && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (typeof window.updateShipperLocation === 'function') {
          window.updateShipperLocation(${shipperCoord[0]}, ${shipperCoord[1]});
        }
        true;
      `);
    }
  }, [shipperCoord]);

  if (hasError) {
    return (
      <View style={[styles.container, { height: mapHeight }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Không thể tải bản đồ</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: mapHeight }]}>
      <WebView
        ref={webViewRef}
        source={{ html, baseUrl: 'https://mapapis.openmap.vn' }}
        style={StyleSheet.absoluteFill}
        javaScriptEnabled={true}
        domStorageEnabled={false}
        mixedContentMode="always"
        originWhitelist={["*"]}
        scrollEnabled={false}
        allowUniversalAccessFromFileURLs={true}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        onError={() => setHasError(true)}
        onHttpError={() => setHasError(true)}
        onLoadingProgress={({ nativeEvent }) => {
          if (nativeEvent.progress === 1) {
            setHasError(false);
          }
        }}
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F4F8",
  },
  errorText: {
    color: "#64748B",
    fontSize: 14,
  },
});

export default InlineDeliveryMap;
