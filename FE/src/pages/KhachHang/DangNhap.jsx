import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import logoFood from '../../assets/logoFood.png';

export default function DangNhap() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/khach-hang/dang-nhap', form);
      if (res.data.status === 1) {
        toast.success(res.data.message);
        login(res.data.token);
        navigate(from, { replace: true });
      } else {
        // status 2 = chưa kích hoạt, status 0 = sai thông tin — đều lấy message từ BE
        toast.error(res.data.message);
      }
    } catch (err) {
      const errors = err?.response?.data?.errors;
      if (errors) {
        Object.values(errors).forEach(v => toast.error(v[0]));
      } else {
        toast.error(err?.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại!');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const res = await api.post('/api/khach-hang/dang-nhap-google', { credential: credentialResponse.credential });
      if (res.data.status === 1) {
        toast.success(res.data.message);
        login(res.data.key);
        navigate(from, { replace: true });
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi xác thực với Google');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Đăng nhập Google thất bại');
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' }}>

      {/* Decorative shapes */}
      <div className="absolute top-[-150px] right-[-150px] w-[300px] h-[300px] rounded-full bg-white/10 animate-float"></div>
      <div className="absolute bottom-[-100px] left-[-100px] w-[200px] h-[200px] rounded-full bg-white/10"
        style={{ animation: 'float 8s ease-in-out infinite reverse' }}></div>

      {/* Floating food icons */}
      {['fa-utensils', 'fa-pizza-slice', 'fa-burger', 'fa-mug-hot'].map((icon, i) => (
        <div key={i} className="absolute text-3xl text-white/10 pointer-events-none"
          style={{
            top: `${[20, 60, 70, 40][i]}%`, left: `${[10, 80, 15, 85][i]}%`,
            animation: `float ${8 + i * 2}s ease-in-out infinite`,
            animationDelay: `${i * 2}s`
          }}>
          <i className={`fa-solid ${icon}`}></i>
        </div>
      ))}

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl border border-white/20 animate-fade-up">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl shadow-lg bg-white p-1">
              <img src={logoFood} className="w-full h-full object-contain" alt="FoodBee Logo" />
            </div>
            <h2 className="text-2xl font-extrabold text-gradient">FoodBee</h2>
            <h3 className="text-xl font-bold text-gray-800 mt-2">Đăng Nhập</h3>
            <p className="text-gray-500 text-sm mt-1">Chào mừng trở lại! Hãy đăng nhập để tiếp tục</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <i className="fa-solid fa-envelope mr-2 text-orange-400"></i>Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="example@email.com"
                required
                className="input-modern"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <i className="fa-solid fa-lock mr-2 text-orange-400"></i>Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu"
                  required
                  className="input-modern pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl text-white font-bold text-base transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 overflow-hidden relative"
              style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>Đang xử lý...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-sign-in-alt"></i>Đăng Nhập
                </>
              )}
            </button>

            {/* Links */}
            <div className="text-center space-y-3">
              <Link to="/khach-hang/quen-mat-khau"
                className="text-orange-500 hover:text-orange-600 text-sm font-semibold transition-colors flex items-center justify-center gap-1">
                <i className="fa-solid fa-key text-xs"></i>Quên mật khẩu?
              </Link>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-gray-400 text-sm">hoặc</span>
                </div>
              </div>
              <Link to="/khach-hang/dang-ky"
                className="text-orange-500 hover:text-orange-600 text-sm font-semibold transition-colors flex items-center justify-center gap-1">
                <i className="fa-solid fa-user-plus text-xs"></i>Tạo tài khoản mới
              </Link>
            </div>
          </form>

          {/* Social login */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-center text-gray-400 text-sm mb-4">Hoặc đăng nhập với</p>
            <div className="w-full flex justify-center">
               <GoogleLogin 
                 onSuccess={handleGoogleSuccess}
                 onError={handleGoogleError}
                 useOneTap
                 width="100%"
                 theme="filled_blue"
                 shape="pill"
               />
            </div>
          </div>

          {/* Register for restaurant/shipper */}
          <div className="mt-6 p-4 bg-orange-50 rounded-2xl">
            <p className="text-xs text-center text-gray-500 font-medium">
              Bạn là đối tác?{' '}
              <Link to="/quan-an/dang-nhap" className="text-orange-500 font-bold hover:underline">Đăng nhập Quán ăn</Link>
              {' · '}
              <Link to="/shipper/dang-nhap" className="text-orange-500 font-bold hover:underline">Đăng nhập Shipper</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
