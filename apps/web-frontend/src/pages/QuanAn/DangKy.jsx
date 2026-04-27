import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import logoFood from '../../assets/logoFood.png';

export default function DangKy() {
  const [formData, setFormData] = useState({
    ten_quan_an: '',
    email: '',
    password: '',
    re_password: '',
    so_dien_thoai: '',
    ma_so_thue: '',
    gio_mo_cua: '',
    gio_dong_cua: '',
    dia_chi: '',
    id_quan_huyen: ''
  });
  
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadDistricts();
  }, []);

  const loadDistricts = async () => {
    try {
      const res = await api.get('/api/admin/quan-huyen/data-open');
      if (res.data?.data) {
        setDistricts(res.data.data);
      }
    } catch (err) {
      toast.error('Không thể tải danh sách quận/huyện');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.re_password) {
      toast.error('Mật khẩu không khớp!');
      return;
    }
    if (!formData.id_quan_huyen) {
      toast.error('Vui lòng chọn quận/huyện!');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/quan-an/dang-ky', formData);
      if (res.data.status) {
        toast.success(res.data.message);
        navigate('/quan-an/dang-nhap');
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        Object.values(err.response.data.errors).forEach(errArray => {
          toast.error(errArray[0]);
        });
      } else {
        toast.error(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden flex flex-col md:flex-row">
        
        {/* Banner Sidebar */}
        <div className="md:w-5/12 bg-gradient-to-br from-orange-500 to-amber-500 text-white p-10 flex flex-col justify-between hidden md:flex">
          <div>
            <Link to="/" className="inline-block p-2 bg-white rounded-2xl shadow-sm mb-8 transition-colors">
              <img src={logoFood} className="w-12 h-12 object-contain" alt="FoodBee Logo" />
            </Link>
            <h1 className="text-4xl font-black mb-4 leading-tight">Mở Quán Ăn<br/>Trực Tuyến</h1>
            <p className="text-orange-50 text-base leading-relaxed">
              Trở thành đối tác của FoodBee ngay hôm nay. Hàng triệu khách hàng đang chờ đợi các món ăn tuyệt vời từ bạn.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0"><i className="fa-solid fa-chart-line text-sm"></i></div>
              <span className="text-sm font-medium">Tăng trưởng doanh thu</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0"><i className="fa-solid fa-headset text-sm"></i></div>
              <span className="text-sm font-medium">Hỗ trợ đối tác 24/7</span>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="md:w-7/12 p-8 md:p-12 pb-10">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-gray-800 mb-2">Đăng Ký Đối Tác</h2>
            <p className="text-gray-500 text-sm">Điền thông tin bên dưới để bắt đầu kinh doanh.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Tên Quán Ăn <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-utensils"></i>
                  </div>
                  <input required name="ten_quan_an" value={formData.ten_quan_an} onChange={handleChange} type="text" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-800" placeholder="VD: Quán Cơm Tấm Bà Bé" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Email <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-envelope"></i>
                  </div>
                  <input required name="email" value={formData.email} onChange={handleChange} type="email" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-800" placeholder="Email chủ quán" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Số điện thoại <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-phone"></i>
                  </div>
                  <input required name="so_dien_thoai" value={formData.so_dien_thoai} onChange={handleChange} type="tel" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-800" placeholder="09xxxxxxx" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Mật khẩu <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-lock"></i>
                  </div>
                  <input required name="password" value={formData.password} onChange={handleChange} type="password" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-800" placeholder="Mật khẩu" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Xác nhận mật khẩu <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-lock"></i>
                  </div>
                  <input required name="re_password" value={formData.re_password} onChange={handleChange} type="password" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-800" placeholder="Nhập lại mật khẩu" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Giờ mở cửa <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-clock"></i>
                  </div>
                  <input required name="gio_mo_cua" value={formData.gio_mo_cua} onChange={handleChange} type="time" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-800" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Giờ đóng cửa <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-clock"></i>
                  </div>
                  <input required name="gio_dong_cua" value={formData.gio_dong_cua} onChange={handleChange} type="time" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-800" />
                </div>
              </div>
              
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Mã số thuế</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-file-invoice"></i>
                  </div>
                  <input name="ma_so_thue" value={formData.ma_so_thue} onChange={handleChange} type="text" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-800" placeholder="Mã số thuế doanh nghiệp/hộ kinh doanh" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Quận/Huyện <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-map-location"></i>
                  </div>
                  <select required name="id_quan_huyen" value={formData.id_quan_huyen} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-800 appearance-none">
                    <option value="">-- Chọn Quận/Huyện --</option>
                    {districts.map(d => (
                      <option key={d.id} value={d.id}>{d.ten_quan_huyen}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Địa chỉ cụ thể <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-location-dot"></i>
                  </div>
                  <input required name="dia_chi" value={formData.dia_chi} onChange={handleChange} type="text" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-800" placeholder="Số nhà, tên đường..." />
                </div>
              </div>
            </div>

            <button disabled={loading} type="submit" className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-75 disabled:cursor-not-allowed mt-6">
              {loading ? <><i className="fa-solid fa-spinner fa-spin mr-2"/> Đang xử lý...</> : 'ĐĂNG KÝ NGAY'}
            </button>
          </form>

          <p className="text-center text-gray-500 mt-8 font-medium">
            Bạn đã có tài khoản Quán Ăn?{' '}
            <Link to="/quan-an/dang-nhap" className="text-orange-500 hover:text-orange-600 font-bold hover:underline transition-colors">
              Đăng nhập ngay
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
