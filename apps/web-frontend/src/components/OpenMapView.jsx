import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { NDA_MAP_STYLE } from '../config/map';

const BE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

export default function OpenMapView({ center, zoom = 15, markers = [], route, className = '', style = {} }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const fixLngLat = (lng, lat) => {
    if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) return [lat, lng];
    return [lng, lat];
  };

  const safeCenter = center && !isNaN(center[0]) && !isNaN(center[1]) ? fixLngLat(center[0], center[1]) : null;

  useEffect(() => {
    if (!containerRef.current || !safeCenter) return;
    if (mapRef.current) {
      mapRef.current.flyTo({ center: safeCenter, zoom, duration: 800 });
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: NDA_MAP_STYLE,
      center: safeCenter,
      zoom: zoom,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [safeCenter?.[0], safeCenter?.[1], zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    markers.forEach(({ lng, lat, color = '#f97316', label }) => {
      if (isNaN(lng) || isNaN(lat)) return;
      const [safeLng, safeLat] = fixLngLat(lng, lat);
      const el = document.createElement('div');
      el.style.width = '16px';
      el.style.height = '16px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = color;
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([safeLng, safeLat]);

      if (label) {
        marker.setPopup(new maplibregl.Popup({ offset: 12 }).setText(label));
      }

      marker.addTo(map);
      markersRef.current.push(marker);
    });
  }, [markers, safeCenter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route) return;

    const safeOrigin = fixLngLat(route.origin[0], route.origin[1]);
    const safeDest = fixLngLat(route.destination[0], route.destination[1]);

    const drawRoute = (coordinates) => {
      if (map.getSource('route')) {
        map.removeLayer('route-line');
        map.removeSource('route');
      }

      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates },
        },
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 5,
        },
      });

      const bounds = new maplibregl.LngLatBounds();
      coordinates.forEach(c => bounds.extend(c));
      map.fitBounds(bounds, { padding: 60, duration: 800 });
    };

    const fetchRoute = async () => {
      const originStr = `${safeOrigin[1]},${safeOrigin[0]}`;
      const destStr = `${safeDest[1]},${safeDest[0]}`;
      try {
        const res = await fetch(`${BE_URL}/api/map/direction?origin=${originStr}&destination=${destStr}`);
        const data = await res.json();
        const route = data?.routes?.[0];
        let coords = null;
        if (route?.overview_polyline?.points) {
          coords = decodePoly(route.overview_polyline.points);
        } else if (route?.geometry?.coordinates) {
          coords = route.geometry.coordinates;
        } else if (typeof route?.geometry === 'string') {
          coords = decodePoly(route.geometry);
        }
        if (coords?.length > 1) {
          if (map.isStyleLoaded()) drawRoute(coords);
          else map.on('load', () => drawRoute(coords));
          return;
        }
      } catch (e) { console.error(e); }
      if (map.isStyleLoaded()) drawRoute([safeOrigin, safeDest]);
      else map.on('load', () => drawRoute([safeOrigin, safeDest]));
    };

    fetchRoute();
  }, [route?.origin?.[0], route?.origin?.[1], route?.destination?.[0], route?.destination?.[1]]);

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', ...style }} />;
}
