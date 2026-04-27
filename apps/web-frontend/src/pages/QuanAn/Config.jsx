import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const qA = (url, method = 'get', data = null) => {
  const token = localStorage.getItem('quan_an_login');
  const cfg = { headers: { Authorization: `Bearer ${token}` } };
  return method === 'get' ? api.get(url, cfg) : api.post(url, data, cfg);
};

export default function QuanAnConfig() {
  const [config, setConfig] = useState({
    gio_mo_cua: '',
    gio_dong_cua: '',
    dia_chi: '',
    toa_do_x: '16.0471', // vĩ độ mặc định (Đà Nẵng)
    toa_do_y: '108.2068' // kinh độ mặc định
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await qA('/api/quan-an/cau-hinh/data');
      if (res.data?.data) {
         setConfig({ ...config, ...res.data.data });
      }
    } catch {
       // Ignore if not found
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.gio_mo_cua || !config.gio_dong_cua || !config.dia_chi) {
      return toast.error('Vui lòng nhập đầy đủ giờ làm việc và địa chỉ!');
    }
    setSaving(true);
    try {
      const res = await qA('/api/quan-an/cau-hinh', 'post', config);
      if (res.data.status) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.message);
      }
    } catch (e) {
      Object.values(e?.response?.data?.errors || {}).forEach(v => toast.error(v[0]));
    } finally {
      setSaving(false);
    }
  };

  const searchAddress = async () => {
    if (!config.dia_chi) return toast.error('Vui lòng nhập địa chỉ để tìm kiếm!');
    toast.loading('Đang tìm tọa độ...', { id: 'searchMap' });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(config.dia_chi)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        toast.success('Đã tìm thấy vị trí!', { id: 'searchMap' });
        setConfig({
          ...config,
          toa_do_x: data[0].lat,
          toa_do_y: data[0].lon
        });
      } else {
        toast.error('Không tìm thấy tọa độ cho địa chỉ này!', { id: 'searchMap' });
      }
    } catch {
      toast.error('Lỗi khi gọi API bản đồ!', { id: 'searchMap' });
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return toast.error('Trình duyệt không hỗ trợ Geolocation!');
    toast.loading('Đang lấy vị trí...', { id: 'geoMap' });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Lookup reverse
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`);
          const data = await res.json();
          let dc = config.dia_chi;
          if (data && data.display_name) dc = data.display_name;
          setConfig({ ...config, toa_do_x: lat, toa_do_y: lng, dia_chi: dc });
          toast.success('Đã định vị thành công!', { id: 'geoMap' });
        } catch {
           setConfig({ ...config, toa_do_x: lat, toa_do_y: lng });
           toast.success('Đã cập nhật tọa độ!', { id: 'geoMap' });
        }
      },
      () => toast.error('Lỗi quyền truy cập vị trí!', { id: 'geoMap' })
    );
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500"><i className="fa-solid fa-spinner fa-spin text-4xl mb-4 text-orange-400 block"></i> Đang tải dữ liệu cấu hình...</div>;
  }

  // Google Maps embed URL
  const mapUrl = `https://maps.google.com/maps?q=${config.toa_do_x},${config.toa_do_y}&t=m&z=17&output=embed&iwloc=near`;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      
      <div className="flex items-center justify-between mb-8">
         <div>
            <h1 className="text-3xl font-black text-gray-900"><i className="fa-solid fa-store text-orange-500 mr-3"></i>Cấu Hình Quán Ăn</h1>
            <p className="text-gray-500 mt-2 font-medium">Thiết lập giờ hoạt động và vị trí chính xác trên bản đồ để Shipper dễ dàng tìm kiếm.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Form cột trái */}
         <div className="space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -translate-y-16 translate-x-16"></div>
               <h3 className="font-bold text-gray-800 text-lg mb-6 relative"><i className="fa-regular fa-clock text-orange-500 mr-2"></i>Giờ Hoạt Động</h3>
               
               <div className="grid grid-cols-2 gap-6 relative">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Giờ Mở Cửa</label>
                    <input type="time" value={config.gio_mo_cua} onChange={e=>setConfig({...config, gio_mo_cua: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 font-bold text-gray-800 text-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Giờ Đóng Cửa</label>
                    <input type="time" value={config.gio_dong_cua} onChange={e=>setConfig({...config, gio_dong_cua: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 font-bold text-gray-800 text-lg" />
                  </div>
               </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -translate-y-16 translate-x-16"></div>
               <h3 className="font-bold text-gray-800 text-lg mb-6 relative"><i className="fa-solid fa-map-location-dot text-blue-500 mr-2"></i>Vị Trí Định Vị</h3>

               <div className="space-y-5 relative">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Địa Chỉ Quán Ăn</label>
                    <div className="flex gap-2">
                       <input type="text" value={config.dia_chi} onChange={e=>setConfig({...config, dia_chi: e.target.value})} placeholder="Số 1, Đường Lê Duẩn, Đà Nẵng..." className="flex-1 w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm font-medium" />
                       <button onClick={searchAddress} className="px-5 py-2 whitespace-nowrap bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors shadow-md">
                          <i className="fa-solid fa-magnifying-glass"></i> Dò GPS
                       </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-semibold text-gray-400 mb-1.5 ml-1">Vĩ độ (Latitude)</label>
                       <input type="text" value={config.toa_do_x} readOnly className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 text-sm font-mono cursor-not-allowed" />
                     </div>
                     <div>
                       <label className="block text-xs font-semibold text-gray-400 mb-1.5 ml-1">Kinh độ (Longitude)</label>
                       <input type="text" value={config.toa_do_y} readOnly className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 text-sm font-mono cursor-not-allowed" />
                     </div>
                  </div>

                  <button onClick={getCurrentLocation} className="w-full py-3 bg-white border-2 border-dashed border-blue-200 hover:border-blue-400 text-blue-600 font-bold rounded-xl transition-all">
                    <i className="fa-solid fa-location-crosshairs mr-2"></i> Lấy tọa độ hiện tại của tôi (Tự động)
                  </button>
               </div>
            </div>

            <button onClick={handleSave} disabled={saving} className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-lg rounded-2xl shadow-lg transition-transform hover:-translate-y-1 transform disabled:opacity-50 disabled:hover:translate-y-0 relative overflow-hidden group">
               <div className="absolute inset-0 bg-white/20 w-0 group-hover:w-full transition-all duration-300 ease-out z-0 h-full"></div>
               <span className="relative z-10">{saving ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i>Đang Cập Nhật</> : <><i className="fa-solid fa-floppy-disk mr-2"></i>Lưu Cấu Hình Quán Ăn</>}</span>
            </button>
         </div>

         {/* Map cột phải */}
         <div className="bg-white justify-center items-center rounded-[2rem] p-3 shadow-xl border border-gray-100 lg:h-[700px] flex flex-col">
            <div className="bg-gray-800 text-white w-full py-3 px-5 rounded-t-3xl flex justify-between items-center z-10 shadow-md">
               <h3 className="font-bold text-sm"><i className="fa-solid fa-satellite mr-2"></i>Bản Đồ Quan Sát Vị Trí</h3>
               <span className="bg-green-500/20 text-green-400 px-2 py-0.5 text-xs font-bold rounded border border-green-500/30 tracking-wider">LIVE</span>
            </div>
            {config.toa_do_x ? (
              <iframe 
                width="100%" 
                height="100%" 
                style={{ border: 0, borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px', flex: 1 }}
                loading="lazy" 
                allowFullScreen 
                referrerPolicy="no-referrer-when-downgrade" 
                src={mapUrl}>
              </iframe>
            ) : (
              <div className="w-full flex-1 bg-gray-50 border-r border-b border-l border-gray-200 rounded-b-[24px] flex flex-col items-center justify-center text-gray-400">
                 <i className="fa-solid fa-map-location-dot text-6xl text-gray-300 mb-4"></i>
                 <p className="font-medium">Chưa có dữ liệu tọa độ</p>
              </div>
            )}
         </div>
      </div>
      
    </div>
  );
}
