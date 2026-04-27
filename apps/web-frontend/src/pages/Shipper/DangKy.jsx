import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import logoFood from '../../assets/logoFood.png';

export default function DangKy() {
  const [formData, setFormData] = useState({
    ho_va_ten: '',
    email: '',
    password: '',
    re_password: '',
    so_dien_thoai: '',
    cccd: '',
    id_tinh_thanh: '',
    id_quan_huyen: '',
    dia_chi: ''
  });
  
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    loadProvinces();
  }, []);

  const loadProvinces = async () => {
    try {
      const res = await api.get('/api/khach-hang/tinh-thanh/data');
      if (res.data?.data) setProvinces(res.data.data);
    } catch {}
  };

  const loadDistricts = async (id_tinh) => {
    if (!id_tinh) {
      setDistricts([]);
      setFormData(prev => ({ ...prev, id_quan_huyen: '' }));
      return;
    }
    try {
      const res = await api.post('/api/khach-hang/quan-huyen/data', { id_tinh_thanh: id_tinh });
      if (res.data?.data) {
        setDistricts(res.data.data);
        setFormData(prev => ({ ...prev, id_quan_huyen: '' }));
      }
    } catch {}
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'id_tinh_thanh') {
      loadDistricts(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.re_password) {
      toast.error('Mật khẩu không khớp!');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/shipper/dang-ky', formData);
      if (res.data.status === 1) {
        setIsSuccess(true);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        Object.values(err.response.data.errors).forEach(errArray => toast.error(errArray[0]));
      } else {
        toast.error(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!');
      }
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-center text-white shadow-2xl animate-[slideUp_0.5s_ease-out]">
           <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(72,187,120,0.5)]">
             <i className="fa-solid fa-check text-4xl text-white"></i>
           </div>
           <h2 className="text-3xl font-black mb-4">Gửi Hồ Sơ Thành Công!</h2>
           <p className="text-white/70 mb-8 leading-relaxed">
             Hồ sơ đăng ký đối tác giao hàng của bạn đã được tiếp nhận. Ban quản trị sẽ thẩm định và phản hồi trong thời gian sớm nhất.
           </p>
           
           <div className="space-y-4 text-left mb-8">
             <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex justify-center items-center"><i className="fa-solid fa-check text-sm"/></div> <span className="font-semibold text-white/90">Gửi hồ sơ thành công</span></div>
             <div className="w-0.5 h-4 bg-gray-600 ml-4"></div>
             <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 flex justify-center items-center"><i className="fa-regular fa-clock text-sm"/></div> <span className="font-semibold text-white/90">Chờ admin xét duyệt</span></div>
             <div className="w-0.5 h-4 bg-gray-600 ml-4"></div>
             <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-white/10 text-white/40 flex justify-center items-center"><i className="fa-solid fa-lock text-sm"/></div> <span className="font-semibold text-white/40">Sẵn sàng nhận đơn</span></div>
           </div>

           <Link to="/shipper/dang-nhap" className="block w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl font-bold hover:shadow-lg hover:shadow-orange-500/40 transition-all">
             Về Trang Đăng Nhập
           </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] relative overflow-hidden flex items-center justify-center p-4 py-12 z-0">
      
      {/* Background elements */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-orange-500/10 rounded-full blur-3xl z-[-1]"></div>
      <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl z-[-1]"></div>
      
      <div className="w-full max-w-4xl bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Banner Sidebar */}
        <div className="md:w-5/12 bg-gradient-to-br from-orange-600 to-amber-500 p-10 flex flex-col justify-between hidden md:flex relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
          <div className="relative z-10">
            <Link to="/" className="inline-block p-2 bg-white rounded-2xl shadow-sm mb-8 transition-colors">
              <img src={logoFood} className="w-12 h-12 object-contain" alt="FoodBee Logo" />
            </Link>
            <h1 className="text-4xl font-black mb-4 leading-tight">Gia Nhập<br/>Đội Ngũ<br/>Giao Hàng</h1>
            <p className="text-orange-50 text-base leading-relaxed opacity-90">
              Kiếm thêm thu nhập linh hoạt cùng FoodBee. Làm chủ thời gian, nhận đơn tận tay.
            </p>
          </div>
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><i className="fa-solid fa-sack-dollar text-sm"></i></div>
              <span className="font-semibold text-sm">Thu nhập hấp dẫn</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><i className="fa-regular fa-clock text-sm"></i></div>
              <span className="font-semibold text-sm">Thời gian tự do</span>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="md:w-7/12 p-8 md:p-10 z-10">
          <div className="mb-6">
            <h2 className="text-3xl font-extrabold text-white mb-2">Đăng Ký Đối Tác</h2>
            <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl mt-3 text-yellow-400">
               <i className="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
               <p className="text-xs font-medium leading-relaxed">Sau khi đăng ký, hồ sơ cần được <b>Quản trị viên xét duyệt</b> trước khi bạn có thể tiến hành nhận đơn.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <p className="text-orange-400 text-xs font-bold uppercase tracking-widest border-b border-white/10 pb-2 mb-2"><i className="fa-solid fa-user mr-2"></i>Thông Tin Chức Danh</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 ml-1">Họ và Tên</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500"><i className="fa-solid fa-user text-sm"></i></div>
                  <input required name="ho_va_ten" value={formData.ho_va_ten} onChange={handleChange} type="text" className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:bg-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-all font-medium text-sm" placeholder="VD: NGUYEN VAN A" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 ml-1">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500"><i className="fa-solid fa-envelope text-sm"></i></div>
                  <input required name="email" value={formData.email} onChange={handleChange} type="email" className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:bg-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-all font-medium text-sm" placeholder="shipper@domain.com" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 ml-1">Số điện thoại</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500"><i className="fa-solid fa-phone text-sm"></i></div>
                  <input required name="so_dien_thoai" value={formData.so_dien_thoai} onChange={handleChange} type="tel" className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:bg-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-all font-medium text-sm" placeholder="09xxxxxxx" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 ml-1">CCCD / CMND</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500"><i className="fa-solid fa-id-card text-sm"></i></div>
                  <input required name="cccd" value={formData.cccd} onChange={handleChange} type="text" className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:bg-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-all font-medium text-sm" placeholder="Số định danh cá nhân" />
                </div>
              </div>
            </div>

            <p className="text-orange-400 text-xs font-bold uppercase tracking-widest border-b border-white/10 pb-2 mt-6 mb-2"><i className="fa-solid fa-map-location-dot mr-2"></i>Khu Vực Hoạt Động</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 ml-1">Tỉnh/Thành phố</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500"><i className="fa-solid fa-city text-sm"></i></div>
                  <select required name="id_tinh_thanh" value={formData.id_tinh_thanh} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-[#252538] border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 text-white font-medium text-sm appearance-none">
                    <option value="">-- Chọn --</option>
                    {provinces.map(p => <option key={p.id} value={p.id}>{p.ten_tinh_thanh}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 ml-1">Quận/Huyện</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500"><i className="fa-solid fa-map-pin text-sm"></i></div>
                  <select required name="id_quan_huyen" value={formData.id_quan_huyen} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-[#252538] border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 text-white font-medium text-sm appearance-none">
                     <option value="">-- Chọn --</option>
                     {districts.map(d => <option key={d.id} value={d.id}>{d.ten_quan_huyen}</option>)}
                  </select>
                </div>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 ml-1">Địa chỉ thường trú</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500"><i className="fa-solid fa-house text-sm"></i></div>
                  <input required name="dia_chi" value={formData.dia_chi} onChange={handleChange} type="text" className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:bg-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-all font-medium text-sm" placeholder="Số nhà, đường..." />
                </div>
              </div>
            </div>

            <p className="text-orange-400 text-xs font-bold uppercase tracking-widest border-b border-white/10 pb-2 mt-6 mb-2"><i className="fa-solid fa-lock mr-2"></i>Bảo Mật</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 ml-1">Mật khẩu</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500"><i className="fa-solid fa-key text-sm"></i></div>
                  <input minLength={6} required name="password" value={formData.password} onChange={handleChange} type="password" className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:bg-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-all font-medium text-sm" placeholder="Từ 6 ký tự" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 ml-1">Nhập lại mật khẩu</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500"><i className="fa-solid fa-key text-sm"></i></div>
                  <input required name="re_password" value={formData.re_password} onChange={handleChange} type="password" className={`w-full pl-10 pr-4 py-2.5 bg-white/5 border ${formData.re_password && formData.password !== formData.re_password ? 'border-red-500' : 'border-white/10'} rounded-xl focus:bg-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-all font-medium text-sm`} placeholder="..." />
                </div>
              </div>
            </div>

            <button disabled={loading} type="submit" className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-boldshadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50 mt-6 relative overflow-hidden group">
              <span className="relative z-10">{loading ? <><i className="fa-solid fa-spinner fa-spin mr-2"/> Đang gửi...</> : 'NỘP HỒ SƠ ĐĂNG KÝ'}</span>
              <div className="absolute inset-0 h-full w-full bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out z-0"></div>
            </button>
          </form>

          <p className="text-center text-gray-400 mt-6 text-sm font-medium">
            Đã là đối tác?{' '}
            <Link to="/shipper/dang-nhap" className="text-orange-400 hover:text-orange-300 font-bold transition-colors">
              Đăng nhập
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
