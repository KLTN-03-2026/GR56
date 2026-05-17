import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import Geolocation from "react-native-geolocation-service";
import apiClient from "../../genaral/api";
import { requestLocationPermission } from "../../utils/location";

const API_BASE_IMAGE = "http://172.30.16.1:8000/storage";

const buildHTML = (restaurantsStr: string, userLocStr: string) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet"/>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; background:#f8fafc; }
    .marker-user {
      width: 18px; height: 18px; border-radius: 50%;
      background: #3b82f6; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(59,130,246,0.6);
    }
    .marker-res {
      width: 32px; height: 32px; border-radius: 50%;
      background: #EE4D2D; border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 14px;
    }
    .popup-content { font-family: sans-serif; min-width: 180px; }
    .popup-content h3 { font-size: 15px; margin-bottom: 4px; color: #111; }
    .popup-content p { font-size: 12px; color: #666; margin-bottom: 8px; }
    .popup-content img { width: 100%; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; }
    .btn-detail {
      display: block; width: 100%; padding: 8px;
      background: #EE4D2D; color: white; text-align: center;
      border-radius: 6px; text-decoration: none; font-weight: bold;
      font-size: 13px; border: none; cursor: pointer;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <script>
    var RESTAURANTS = ${restaurantsStr};
    var USER_LOC = ${userLocStr};

    var map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openmap.vn/styles/day-v1/style.json',
      center: USER_LOC ? [USER_LOC.lng, USER_LOC.lat] : [108.2022, 16.0544],
      zoom: 13
    });

    map.on('load', function() {
      if (USER_LOC) {
        var el = document.createElement('div');
        el.className = 'marker-user';
        new maplibregl.Marker({ element: el })
          .setLngLat([USER_LOC.lng, USER_LOC.lat])
          .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML('<b>Bạn đang ở đây</b>'))
          .addTo(map);
      }

      var bounds = new maplibregl.LngLatBounds();
      var hasBounds = false;

      RESTAURANTS.forEach(function(r) {
        if (!r.toa_do_x || !r.toa_do_y) return;
        var lat = parseFloat(r.toa_do_x);
        var lng = parseFloat(r.toa_do_y);
        
        // Auto fix coordinates
        if (lng > 15 && lng < 17 && lat > 107 && lat < 109) {
          var t = lat; lat = lng; lng = t;
        }

        var el = document.createElement('div');
        el.className = 'marker-res';
        el.innerHTML = '<i class="fa-solid fa-store"></i>';

        var imgSrc = r.hinh_anh ? (r.hinh_anh.startsWith('http') ? r.hinh_anh : '${API_BASE_IMAGE}/' + r.hinh_anh) : '';
        var imgHtml = imgSrc ? '<img src="' + imgSrc + '" onerror="this.style.display=\\'none\\'"/>' : '';
        var popupHtml = '<div class="popup-content">' + imgHtml + '<h3>' + (r.ten_quan_an || 'Quán ăn') + '</h3><p>' + (r.dia_chi || '') + '</p><button class="btn-detail" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({action: \\'DETAIL\\', id: ' + r.id + '}))">Xem chi tiết</button></div>';

        new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(popupHtml))
          .addTo(map);

        bounds.extend([lng, lat]);
        hasBounds = true;
      });

      if (hasBounds) {
        if (USER_LOC) bounds.extend([USER_LOC.lng, USER_LOC.lat]);
        map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
      }
    });
  </script>
</body>
</html>`;
};

export default function RestaurantMap() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const hasPermission = await requestLocationPermission();
        let loc = null;
        if (hasPermission) {
          loc = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
            Geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => resolve(null),
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
            );
          });
          setUserLoc(loc);
        }

        const params: any = {};
        if (loc) {
          params.lat = loc.lat;
          params.lng = loc.lng;
        }
        const res = await apiClient.get("/khach-hang/quan-an/map", { params });
        setRestaurants(res.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const html = buildHTML(JSON.stringify(restaurants), JSON.stringify(userLoc));

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.action === "DETAIL" && data.id) {
        navigation.navigate("RestaurantDetail", { id: data.id });
      }
    } catch (e) {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.title}>Bản Đồ Quán Ăn</Text>
      </View>
      
      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#EE4D2D" />
            <Text style={styles.loadingText}>Đang tải bản đồ...</Text>
          </View>
        ) : (
          <WebView
            source={{ html, baseUrl: 'https://mapapis.openmap.vn' }}
            style={StyleSheet.absoluteFill}
            javaScriptEnabled
            domStorageEnabled
            onMessage={onMessage}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111",
  },
  mapContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  }
});
