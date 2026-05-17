export const NDA_API_KEY = '6TTIZbUWJmRMSpiYzQ0YY8z5v8wv43w0';
export const NDA_MAP_STYLE = `https://tiles.openmap.vn/styles/day-v1/style.json`;

const BE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ndaGeocodeForward = (query) =>
  `${BE_URL}/api/map/geocode/forward?text=${encodeURIComponent(query)}`;

export const ndaGeocodeReverse = (lat, lng) =>
  `${BE_URL}/api/map/geocode/reverse?lat=${lat}&lng=${lng}`;
