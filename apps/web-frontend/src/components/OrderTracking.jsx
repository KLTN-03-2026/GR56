import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function OrderTracking({ orderId }) {
  const [canTrack, setCanTrack] = useState(false);
  const [orderInfo, setOrderInfo] = useState({
    tinh_trang: 0,
    shipper_name: '',
    shipper_phone: '',
    shipper_avatar: '',
    restaurant_lat: 0,
    restaurant_lng: 0,
    customer_lat: 0,
    customer_lng: 0,
    shipper_lat: 0,
    shipper_lng: 0,
    last_location_update: null
  });

  const getStatusText = () => {
     if (orderInfo.tinh_trang === 0 || orderInfo.tinh_trang === 1) return 'Chờ nhận đơn';
     if (orderInfo.tinh_trang === 2) return 'Đang chế biến';
     if (orderInfo.tinh_trang === 3) return 'Đang vận chuyển';
     if (orderInfo.tinh_trang === 4) return 'Giao hàng thành công';
     if (orderInfo.tinh_trang === 5) return 'Đã bị hủy';
     return 'Đang cập nhật';
  };

  const loadOrderInfo = async () => {
    try {
      const token = localStorage.getItem('khach_hang_login');
      const res = await api.post('/api/khach-hang/don-hang/theo-doi-don-hang', 
         { id: orderId }, 
         { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data) {
        setCanTrack(res.data.can_track);
        setOrderInfo(res.data.order);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadOrderInfo();
    const interval = setInterval(loadOrderInfo, 10000); // Poll location every 10s as fallback to WebSocket
    return () => clearInterval(interval);
  }, [orderId]);

  const formatTime = (ts) => {
     if (!ts) return 'Chưa cập nhật';
     return new Date(ts).toLocaleTimeString('vi-VN');
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  // Google Maps IFrame URL logic
  let mapUrl = '';
  let distance = null;
  let sLat = null, sLng = null, dLat = null, dLng = null;

  if (orderInfo.shipper_lat && orderInfo.shipper_lng) {
     sLat = orderInfo.shipper_lat;
     sLng = orderInfo.shipper_lng;
     // Always show route to customer
     dLat = orderInfo.customer_lat;
     dLng = orderInfo.customer_lng;
  }

  const centerLat = sLat || orderInfo.customer_lat;
  const centerLng = sLng || orderInfo.customer_lng;

  if (sLat && sLng && (dLat || orderInfo.customer_address)) {
      const destUrl = (dLat && dLng) ? `${dLat},${dLng}` : `${orderInfo.customer_address}`;
      mapUrl = `https://maps.google.com/maps?saddr=${sLat},${sLng}&daddr=${encodeURIComponent(destUrl)}&output=embed`;
      distance = getDistance(sLat, sLng, dLat, dLng);
  } else if (centerLat && centerLng) {
      mapUrl = `https://maps.google.com/maps?q=${centerLat},${centerLng}&t=m&z=15&output=embed`;
  }

  if (orderInfo.tinh_trang === 4 || orderInfo.tinh_trang === 5) {
      return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 my-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h3 className="text-xl font-bold text-gray-900 border-l-4 border-orange-500 pl-3">
             <i className="fa-solid fa-location-crosshairs mr-2"></i>Theo Dõi Đơn Hàng #{orderId}
          </h3>
          {!canTrack && (
            <span className="px-4 py-2 bg-yellow-100 text-yellow-700 font-bold rounded-xl text-sm">
              <i className="fa-regular fa-clock mr-2"></i>{getStatusText()}
            </span>
          )}
       </div>

       {!canTrack ? (
         <div className="bg-orange-50 border border-orange-100 rounded-xl p-6 text-center text-orange-600 font-medium">
            <i className="fa-solid fa-route text-4xl mb-3 text-orange-300 block"></i>
            Hệ thống sẽ cập nhật radar vị trí khi Shipper đã tiếp nhận đơn hàng!
         </div>
       ) : (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 relative h-[350px] sm:h-[450px] w-full bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
               {mapUrl ? (
                 <>
                   <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg font-bold text-xs shadow text-gray-700 flex items-center">
                     <span className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                     LIVE TRACKING
                   </div>
                   <iframe
                     width="100%"
                     height="100%"
                     style={{ border: 0 }}
                     loading="lazy"
                     allowFullScreen
                     referrerPolicy="no-referrer-when-downgrade"
                     src={mapUrl}
                   />
                 </>
               ) : (
                 <div className="flex items-center justify-center h-full text-gray-400">
                    <i className="fa-solid fa-satellite fa-spin text-3xl mr-3"></i> Đang tải tọa độ...
                 </div>
               )}
            </div>

            <div className="lg:col-span-1 border border-gray-100 rounded-2xl p-5 bg-white shadow-sm h-fit">
               <h4 className="font-bold text-gray-800 mb-5 pb-3 border-b border-gray-100">
                  <i className="fa-solid fa-motorcycle text-blue-500 mr-2"></i>Thông Tin Shipper
               </h4>
               <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                     <img 
                       src={orderInfo.shipper_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(orderInfo.shipper_name || 'S')}&background=3b82f6&color=fff`} 
                       alt="Shipper" 
                       className="w-24 h-24 rounded-full object-cover border-4 border-blue-50 shadow-md" 
                     />
                     <span className="absolute bottom-2 right-0 w-4 h-4 rounded-full bg-green-500 border-2 border-white"></span>
                  </div>
                  <h5 className="font-bold text-lg text-gray-900 mb-1">{orderInfo.shipper_name}</h5>
                  <p className="text-gray-500 text-sm mb-4 font-medium"><i className="fa-solid fa-phone mr-2 text-blue-400"></i>{orderInfo.shipper_phone}</p>
                  
                  {distance !== null && (
                    <div className="w-full bg-blue-50 border border-blue-100 rounded-xl p-2 mb-4 grid grid-cols-2 divide-x divide-blue-200 text-center">
                      <div className="px-1 flex flex-col justify-center items-center">
                        <div className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-0.5 leading-tight">Khoảng cách</div>
                        <div className="font-black text-lg text-blue-800 flex items-baseline gap-1">
                          {distance.toFixed(1)} <span className="text-xs font-semibold">km</span>
                        </div>
                      </div>
                      <div className="px-1 flex flex-col justify-center items-center">
                        <div className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-0.5 leading-tight">Thời gian đến</div>
                        <div className="font-black text-lg text-blue-800 flex items-baseline gap-1 whitespace-nowrap">
                          ~{Math.round((distance / 30) * 60) + 3} <span className="text-xs font-semibold">phút</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="w-full bg-gray-50 rounded-xl p-3 text-xs font-semibold text-gray-600 mb-4 flex justify-between">
                     <span>Cập nhật vị trí:</span>
                     <span className="text-blue-600 font-bold">{formatTime(orderInfo.last_location_update)}</span>
                  </div>

                  <a href={`tel:${orderInfo.shipper_phone}`} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-transform active:scale-95 shadow-lg shadow-blue-500/30 flex items-center justify-center">
                     <i className="fa-solid fa-phone-volume mr-2"></i> Gọi Cho Shipper
                  </a>
               </div>
            </div>
         </div>
       )}
    </div>
  );
}
