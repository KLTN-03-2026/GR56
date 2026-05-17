import { useState, useEffect, useCallback, useRef } from 'react';

const DEFAULT_POSITION = { lat: 10.8231, lng: 106.6297 }; // HCM default

/**
 * Hook để lấy và cập nhật vị trí hiện tại của shipper.
 * Sử dụng Geolocation API với watchPosition để cập nhật liên tục.
 *
 * @param {Object} options
 * @param {boolean} options.enableHighAccuracy - Độ chính xác cao (default: true)
 * @param {number} options.frequency - Tần suất cập nhật ms (default: 5000)
 * @param {boolean} options.autoStart - Tự động bắt đầu (default: true)
 */
export function useShipperLocation({ enableHighAccuracy = true, autoStart = true } = {}) {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(autoStart);
  const watchIdRef = useRef(null);

  const errorMessage = useCallback((err) => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        return 'Vui lòng bật quyền truy cập vị trí để sử dụng tính năng chỉ đường.';
      case err.POSITION_UNAVAILABLE:
        return 'Không thể xác định vị trí. Vui lòng kiểm tra kết nối mạng.';
      case err.TIMEOUT:
        return 'Yêu cầu vị trí hết thời gian. Vui lòng thử lại.';
      default:
        return 'Đã xảy ra lỗi khi lấy vị trí.';
    }
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ Geolocation.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Initial position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
        setLoading(false);
      },
      (err) => {
        setError(errorMessage(err));
        setLoading(false);
      },
      { enableHighAccuracy, timeout: 15000, maximumAge: 0 }
    );

    // Watch position
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
        setError(null);
      },
      (err) => {
        setError(errorMessage(err));
      },
      { enableHighAccuracy, timeout: 15000, maximumAge: 0 }
    );

    watchIdRef.current = id;
  }, [enableHighAccuracy, errorMessage]);

  useEffect(() => {
    if (autoStart) {
      startWatching();
    }
    return () => {
      stopWatching();
    };
  }, [autoStart, startWatching, stopWatching]);

  return {
    location,      // { lat, lng, accuracy, timestamp } | null
    error,         // string | null
    loading,       // boolean
    startWatching,
    stopWatching,
  };
}

/**
 * Tính khoảng cách từ vị trí hiện tại đến một điểm (Haversine).
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Ước tính thời gian di chuyển (giả định tốc độ trung bình 25km/h cho xe máy).
 */
export function estimateDuration(distanceKm) {
  if (distanceKm === null || distanceKm === undefined) return null;
  const avgSpeedKmh = 25;
  return Math.round((distanceKm / avgSpeedKmh) * 60); // minutes
}
