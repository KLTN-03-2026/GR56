/**
 * NDAMaps configuration
 *
 * Thay YOUR_NDA_API_KEY bằng API key thực của bạn từ https://ndamaps.vn/
 * Map rendering: ndamap-gl (MapLibre-based) via unpkg CDN
 * REST APIs: https://mapapis.ndamaps.vn/v1
 */
export const NDA_API_KEY = 'qrm8fXPZ7HM4nqYZVrEhFepxgxnzarmG';

/** Style bản đồ ban ngày của NDAMaps */
export const NDA_MAP_STYLE = `https://nda-tiles.openmap.vn/styles/ndamap/style.json?apikey=${NDA_API_KEY}`;

/** Base URL cho NDAMaps REST APIs */
export const NDA_BASE_URL = 'https://mapapis.ndamaps.vn/v1';

/**
 * Tạo URL cho NDAMaps Forward Geocoding API.
 * Response (OSM format): features[0].geometry.coordinates = [longitude, latitude]
 */
export const ndaGeocodeURL = (query: string): string =>
  `${NDA_BASE_URL}/geocode/forward?text=${encodeURIComponent(query)}&apikey=${NDA_API_KEY}`;

/**
 * Tạo URL cho NDAMaps Routing API (driving).
 * @param p1 Tọa độ điểm đầu [lng, lat]
 * @param p2 Tọa độ điểm cuối [lng, lat]
 * Note: API nhận tham số theo dạng lat,lng nên cần hoán đổi
 */
export const ndaDirectionsURL = (p1: [number, number], p2: [number, number]): string =>
  `${NDA_BASE_URL}/direction?origin=${p1[1]},${p1[0]}&destination=${p2[1]},${p2[0]}&vehicle=car&apikey=${NDA_API_KEY}`;
