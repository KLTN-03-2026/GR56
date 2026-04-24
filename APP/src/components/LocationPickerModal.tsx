/**
 * LocationPickerModal
 * Cho user tìm kiếm địa chỉ + kéo pin trên bản đồ để lấy tọa độ chính xác.
 */
import React, { useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import { NDA_API_KEY } from "../config/mapbox";

interface Props {
  visible: boolean;
  initialAddress?: string;
  onConfirm: (coord: { lat: number; lng: number }, address: string) => void;
  onClose: () => void;
}

const PRIMARY = "#EE4D2D";

function buildHTML(apiKey: string, initialAddress: string): string {
  const safe = (s: string) => s.replace(/\\/g, "\\\\").replace(/`/g, "'");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link href="https://unpkg.com/ndamap-gl@latest/dist/ndamap-gl.css" rel="stylesheet"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; }

    #searchBox {
      position:fixed; top:10px; left:10px; right:10px; z-index:999;
      display:flex; gap:6px;
    }
    #searchInput {
      flex:1; height:40px; padding:0 12px; border-radius:10px;
      border:1.5px solid #e2e8f0; font-size:14px; background:#fff;
      box-shadow:0 2px 8px rgba(0,0,0,.12);
    }
    #searchBtn {
      width:40px; height:40px; border-radius:10px; background:${PRIMARY};
      border:none; color:#fff; font-size:18px; cursor:pointer;
      box-shadow:0 2px 8px rgba(0,0,0,.2);
    }
    #results {
      position:fixed; top:58px; left:10px; right:10px; z-index:998;
      background:#fff; border-radius:10px; max-height:200px; overflow-y:auto;
      box-shadow:0 4px 16px rgba(0,0,0,.15); display:none;
    }
    .result-item {
      padding:10px 14px; font-size:13px; border-bottom:1px solid #f1f5f9;
      cursor:pointer; color:#1e293b;
    }
    .result-item:last-child { border-bottom:none; }
    .result-item:hover { background:#fef2f2; }

    #pin {
      position:fixed; top:50%; left:50%;
      transform:translate(-50%, -100%);
      font-size:36px; pointer-events:none; z-index:500;
      filter:drop-shadow(0 3px 6px rgba(0,0,0,.4));
    }
    #infoBar {
      position:fixed; bottom:0; left:0; right:0; z-index:999;
      background:#fff; padding:10px 14px 14px;
      border-top:1px solid #e2e8f0;
      box-shadow:0 -2px 12px rgba(0,0,0,.1);
    }
    #currentAddr {
      font-size:12px; color:#64748b; margin-bottom:8px;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    #confirmBtn {
      width:100%; height:42px; background:${PRIMARY}; color:#fff;
      border:none; border-radius:10px; font-size:15px; font-weight:700;
      cursor:pointer;
    }
    #loadingOverlay {
      position:fixed; inset:0; background:rgba(255,255,255,.7);
      display:flex; align-items:center; justify-content:center; z-index:9999;
    }
    .spinner {
      width:36px; height:36px; border:4px solid #e2e8f0;
      border-top-color:${PRIMARY}; border-radius:50%;
      animation:spin .8s linear infinite;
    }
    @keyframes spin { to { transform:rotate(360deg); } }
  </style>
</head>
<body>
  <div id="searchBox">
    <input id="searchInput" type="text" placeholder="Tìm địa chỉ..." value="${safe(initialAddress)}"/>
    <button id="searchBtn" onclick="doSearch()">🔍</button>
  </div>
  <div id="results"></div>
  <div id="pin">📍</div>
  <div id="map"></div>
  <div id="infoBar">
    <div id="currentAddr">Kéo bản đồ để đặt pin đúng vị trí</div>
    <button id="confirmBtn" onclick="confirmLocation()">✅ Xác nhận vị trí này</button>
  </div>
  <div id="loadingOverlay"><div class="spinner"></div></div>

  <script src="https://unpkg.com/ndamap-gl@latest/dist/ndamap-gl.js"></script>
  <script>
    var TOKEN = '${apiKey}';
    var currentLat = 16.0544, currentLng = 108.2022;
    var currentAddr = '';
    var reverseTimer = null;

    var map = new ndamapgl.Map({
      container: 'map',
      style: 'https://nda-tiles.openmap.vn/styles/ndamap/style.json',
      center: [108.2022, 16.0544],
      zoom: 15
    });

    map.on('load', function() {
      document.getElementById('loadingOverlay').style.display = 'none';
      // Nếu có địa chỉ ban đầu → tìm ngay
      var initAddr = document.getElementById('searchInput').value.trim();
      if (initAddr.length > 3) { doSearch(); }
    });

    // Theo dõi khi bản đồ dừng di chuyển → reverse geocode vị trí trung tâm
    map.on('moveend', function() {
      var c = map.getCenter();
      currentLat = c.lat;
      currentLng = c.lng;
      clearTimeout(reverseTimer);
      reverseTimer = setTimeout(function() { reverseGeocode(c.lng, c.lat); }, 500);
    });

    function reverseGeocode(lng, lat) {
      var url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&zoom=18&accept-language=vi';
      fetch(url, { headers: { 'User-Agent': 'ShoppeFood/1.0' } })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d && d.display_name) {
            currentAddr = d.display_name;
            var parts = d.display_name.split(',');
            document.getElementById('currentAddr').textContent = parts.slice(0, 3).join(',').trim();
          }
        })
        .catch(function() {});
    }

    function doSearch() {
      var q = document.getElementById('searchInput').value.trim();
      if (!q) return;
      var resultsEl = document.getElementById('results');
      resultsEl.innerHTML = '<div class="result-item" style="color:#94a3b8">Đang tìm...</div>';
      resultsEl.style.display = 'block';

      // NDAMaps forward geocode
      var url = 'https://mapapis.ndamaps.vn/v1/geocode/forward?text='
        + encodeURIComponent(q)
        + '&apikey=' + TOKEN;
      fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(d) {
          var features = (d && d.features) ? d.features : [];
          // Fallback Nominatim nếu NDA không có kết quả
          if (features.length === 0) {
            return fetch('https://nominatim.openstreetmap.org/search?q='
              + encodeURIComponent(q + ', Việt Nam')
              + '&format=json&limit=5&accept-language=vi&countrycodes=vn',
              { headers: { 'User-Agent': 'ShoppeFood/1.0' } }
            )
            .then(function(r) { return r.json(); })
            .then(function(nd) {
              return (nd || []).map(function(x) {
                return {
                  geometry: { coordinates: [parseFloat(x.lon), parseFloat(x.lat)] },
                  properties: { name: x.display_name }
                };
              });
            });
          }
          return features;
        })
        .then(function(features) {
          resultsEl.innerHTML = '';
          if (!features || features.length === 0) {
            resultsEl.innerHTML = '<div class="result-item" style="color:#94a3b8">Không tìm thấy địa chỉ</div>';
            return;
          }
          features.slice(0, 6).forEach(function(f) {
            var c = f.geometry.coordinates;
            var name = (f.properties && (f.properties.name || f.properties.display_name)) || 'Địa chỉ';
            var item = document.createElement('div');
            item.className = 'result-item';
            item.textContent = name;
            item.onclick = function() {
              map.flyTo({ center: [c[0], c[1]], zoom: 17 });
              resultsEl.style.display = 'none';
              currentLat = c[1]; currentLng = c[0];
              document.getElementById('currentAddr').textContent = name;
              currentAddr = name;
            };
            resultsEl.appendChild(item);
          });
        })
        .catch(function() {
          resultsEl.innerHTML = '<div class="result-item" style="color:#ef4444">Lỗi tìm kiếm</div>';
        });
    }

    // Ẩn kết quả khi bấm vào bản đồ
    map.on('click', function() {
      document.getElementById('results').style.display = 'none';
    });

    document.getElementById('searchInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doSearch();
    });

    function confirmLocation() {
      var c = map.getCenter();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'CONFIRM',
        lat: c.lat,
        lng: c.lng,
        address: currentAddr || document.getElementById('currentAddr').textContent
      }));
    }
  </script>
</body>
</html>`;
}

const LocationPickerModal: React.FC<Props> = ({ visible, initialAddress = "", onConfirm, onClose }) => {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  const html = buildHTML(NDA_API_KEY, initialAddress);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "CONFIRM") {
        onConfirm({ lat: data.lat, lng: data.lng }, data.address || initialAddress);
      }
    } catch {}
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Ghim vị trí địa chỉ</Text>
          <View style={{ width: 36 }} />
        </View>

        <Text style={styles.hint}>
          🔍 Tìm địa chỉ → kéo bản đồ để đặt pin chính xác → bấm Xác nhận
        </Text>

        {/* WebView Map */}
        <View style={styles.mapWrap}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={PRIMARY} />
              <Text style={styles.loadingTxt}>Đang tải bản đồ...</Text>
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ html }}
            style={styles.map}
            onLoad={() => setLoading(false)}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            originWhitelist={["*"]}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1E293B" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  title: { fontSize: 16, fontWeight: "800", color: "#FFF" },
  hint: {
    fontSize: 12, color: "#94A3B8", textAlign: "center",
    paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: "#0F172A",
  },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#F8FAFC", zIndex: 10, gap: 12,
  },
  loadingTxt: { fontSize: 14, color: "#64748B" },
});

export default LocationPickerModal;
