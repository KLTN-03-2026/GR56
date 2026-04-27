import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function ShipperViTriHienTai() {
  const [isTracking, setIsTracking] = useState(false);
  const [coords, setCoords] = useState(null);
  const [address, setAddress] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const trackingInterval = useRef(null);

  useEffect(() => {
    // Tự động lấy vị trí ban đầu
    getCurrentLocation();
    
    return () => {
      // Dọn dẹp interval khi unmount
      if (trackingInterval.current) clearInterval(trackingInterval.current);
    };
  }, []);

  const toggleTracking = () => {
    if (isTracking) {
      if (trackingInterval.current) clearInterval(trackingInterval.current);
      trackingInterval.current = null;
      setIsTracking(false);
      toast('Đã dừng theo dõi vị trí', { icon: '🛑' });
    } else {
      setIsTracking(true);
      getCurrentLocation();
      toast.success('Đã bật theo dõi vị trí tự động');
      trackingInterval.current = setInterval(() => {
        getCurrentLocation();
      }, 10000); // Mỗi 10 giây
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setCoords({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
          setLastUpdate(new Date().toLocaleTimeString('vi-VN'));
          
          // Lấy địa chỉ từ OpenStreetMap
          try {
             const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
             const data = await res.json();
             if (data?.display_name) setAddress(data.display_name);
          } catch {}

          // Send to backend if tracking
          if (isTracking || !isTracking) { // Actually always send at least once when requested
            try {
              const token = localStorage.getItem('shipper_login');
              await api.post('/api/shipper/cap-nhat-vi-tri', { lat, lng }, {
                 headers: { Authorization: `Bearer ${token}` }
              });
            } catch {}
          }
        },
        () => {
          toast.error('Không thể lấy vị trí. Vui lòng bật GPS!');
        },
        { enableHighAccuracy: true }
      );
    } else {
       toast.error('Trình duyệt không hỗ trợ Geolocation');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="text-white px-4 py-5 pb-8" style={{ background: 'linear-gradient(135deg, #0f2027, #2c5364)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <i className="fa-solid fa-map-location-dot text-2xl text-blue-400" />
              <h1 className="text-xl font-extrabold">Vị Trí Của Tôi</h1>
            </div>
          </div>
          <div className="flex gap-2">
             <Link to="/shipper/profile" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors border border-white/20"><i className="fa-solid fa-user" /></Link>
             <Link to="/shipper/don-hang" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors border border-white/20"><i className="fa-solid fa-house" /></Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-4 flex-1 -mt-6">
        
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
              <iframe 
                width="100%" 
                height="100%" 
                style={{ border: 0, borderRadius: '20px' }}
                loading="lazy" 
                allowFullScreen 
                referrerPolicy="no-referrer-when-downgrade" 
                src={`https://maps.google.com/maps?q=${coords.lat},${coords.lng}&t=m&z=16&output=embed&iwloc=near`}>
              </iframe>
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
