import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import OpenMapView from '../../components/OpenMapView';
import { ndaGeocodeReverse } from '../../config/map';

export default function ShipperViTriHienTai() {
  const [isTracking, setIsTracking] = useState(false);
  const [coords, setCoords] = useState(null);
  const [address, setAddress] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const trackingInterval = useRef(null);

  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoords({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
          setLastUpdate(new Date().toLocaleTimeString('vi-VN'));
          try {
             const res = await fetch(ndaGeocodeReverse(lat, lng));
             const data = await res.json();
             if (data?.features?.[0]?.properties?.label) setAddress(data.features[0].properties.label);
          } catch (e) { console.error(e); }
          try {
            const token = localStorage.getItem('shipper_login');
            await api.post('/api/shipper/cap-nhat-vi-tri', { lat, lng }, {
               headers: { Authorization: `Bearer ${token}` }
            });
          } catch (e) { console.error(e); }
        },
        () => { toast.error('Không thể lấy vị trí. Vui lòng bật GPS!'); },
        { enableHighAccuracy: true }
      );
    } else {
       toast.error('Trình duyệt không hỗ trợ Geolocation');
    }
  }, []);

  const toggleTracking = useCallback(() => {
    if (isTracking) {
      if (trackingInterval.current) clearInterval(trackingInterval.current);
      trackingInterval.current = null;
      setIsTracking(false);
      toast('Đã dừng theo dõi vị trí', { icon: '🛑' });
    } else {
      setIsTracking(true);
      getCurrentLocation();
      toast.success('Đã bật theo dõi vị trí tự động');
      trackingInterval.current = setInterval(getCurrentLocation, 10000);
    }
  }, [isTracking, getCurrentLocation]);

  useEffect(() => {
    getCurrentLocation();
    return () => {
      if (trackingInterval.current) clearInterval(trackingInterval.current);
    };
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900"><i className="fa-solid fa-map-location-dot mr-3 text-blue-500" />Vị Trí Của Tôi</h1>
        <p className="text-gray-500 text-sm mt-1">Quản lý định vị GPS</p>
      </div>

      <div className="mx-auto w-full">
        
        {/* Card info */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 mb-6 relative overflow-hidden">
           {isTracking && (
              <div className="absolute top-0 right-0 p-4">
                 <span className="flex h-3 w-3">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                 </span>
              </div>
           )}

           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                 <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Trạng thái tracking</p>
                 <div className="flex items-center gap-2">
                    {isTracking ? <span className="text-green-500 font-bold"><i className="fa-solid fa-satellite-dish mr-2 animate-pulse"></i>Đang truyền vị trí</span>
                                : <span className="text-orange-500 font-bold"><i className="fa-solid fa-power-off mr-2"></i>Đã tắt định vị</span>}
                 </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                 <button onClick={toggleTracking} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-white shadow-md transition-all ${isTracking ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}`}>
                    {isTracking ? <><i className="fa-solid fa-stop mr-2"></i>Dừng Lại</> : <><i className="fa-solid fa-play mr-2"></i>Bật Lại</>}
                 </button>
                 <button onClick={getCurrentLocation} className="px-4 py-2.5 rounded-xl bg-blue-50 text-blue-600 font-bold hover:bg-blue-100 border border-blue-200 transition-colors">
                    <i className="fa-solid fa-location-crosshairs"></i>
                 </button>
              </div>
           </div>

           {coords ? (
             <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                <div className="flex items-start gap-3">
                   <i className="fa-solid fa-location-dot mt-1 text-red-500 text-lg"></i>
                   <div>
                      <p className="text-xs font-bold text-gray-500 uppercase">Tọa độ hiện tại</p>
                      <p className="font-mono text-gray-800 font-medium">{coords.lat}, {coords.lng}</p>
                   </div>
                </div>
                {address && (
                  <div className="flex items-start gap-3">
                     <i className="fa-solid fa-map mt-1 text-blue-500 text-lg"></i>
                     <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Địa chỉ dự đoán</p>
                        <p className="text-gray-800 font-medium text-sm">{address}</p>
                     </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                   <i className="fa-regular fa-clock mt-1 text-orange-500 text-lg"></i>
                   <div>
                      <p className="text-xs font-bold text-gray-500 uppercase">Cập nhật lần cuối</p>
                      <p className="text-gray-800 font-medium text-sm">{lastUpdate} {isTracking && <span className="text-xs text-green-500 ml-2 animate-pulse">(Tự động sau 10s)</span>}</p>
                   </div>
                </div>
             </div>
           ) : (
             <div className="bg-orange-50 text-orange-600 rounded-2xl p-4 flex items-center gap-3">
                <i className="fa-solid fa-circle-notch fa-spin text-2xl text-orange-400"></i>
                <p className="font-semibold text-sm">Đang tìm tín hiệu GPS...</p>
             </div>
           )}
        </div>

        {/* Map iframe */}
        <div className="bg-white rounded-3xl p-2 shadow-sm border border-gray-100 overflow-hidden h-[400px]">
           {coords ? (
              <OpenMapView
                center={[parseFloat(coords.lng), parseFloat(coords.lat)]}
                zoom={16}
                markers={[{ lng: parseFloat(coords.lng), lat: parseFloat(coords.lat), color: '#3b82f6', label: 'Vị trí của bạn' }]}
                style={{ borderRadius: '20px' }}
              />
           ) : (
              <div className="w-full h-full bg-gray-50 rounded-[20px] flex items-center justify-center text-gray-400 flex-col">
                 <i className="fa-solid fa-map-location-dot text-6xl mb-3 text-gray-300"></i>
                 <p className="font-medium text-sm">Bản đồ sẽ hiển thị khi có tọa độ</p>
              </div>
           )}
        </div>

      </div>
    </div>
  );
}
