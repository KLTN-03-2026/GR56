import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import logoFood from '../../assets/logoFood.png';

export default function QuanAnDangNhap() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/quan-an/dang-nhap', form);
      if (res.data.status === 1) {
        localStorage.setItem('quan_an_login', res.data.token);
        toast.success(res.data.message);
        navigate('/quan-an/profile');
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      const errs = err?.response?.data?.errors;
      if (errs) Object.values(errs).forEach(v => toast.error(v[0]));
      else toast.error(err?.response?.data?.message || 'Đăng nhập thất bại!');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 relative overflow-hidden">
      {/* BG shapes */}
      <div className="absolute top-[-150px] right-[-150px] w-[400px] h-[400px] rounded-full bg-white/5 animate-float" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] rounded-full bg-white/5" style={{ animation: 'float 8s ease-in-out infinite reverse' }} />
      {['fa-store', 'fa-utensils', 'fa-chart-line', 'fa-receipt'].map((icon, i) => (
        <div key={i} className="absolute text-3xl text-white/5 pointer-events-none"
          style={{ top: `${[15, 65, 40, 80][i]}%`, left: `${[5, 85, 90, 8][i]}%`, animation: `float ${8 + i * 2}s ease-in-out infinite`, animationDelay: `${i * 1.5}s` }}>
          <i className={`fa-solid ${icon}`} />
        </div>
      ))}

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl border border-white/20 animate-fade-up">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-3xl shadow-lg bg-white p-2">
              <img src={logoFood} className="w-full h-full object-contain drop-shadow" alt="FoodBee Logo" />
            </div>
            <h2 className="text-3xl font-extrabold text-white">FoodBee</h2>
            <h3 className="text-xl font-bold text-white/80 mt-2">Cổng Quán Ăn</h3>
            <p className="text-white/50 text-sm mt-1">Đăng nhập để quản lý quán của bạn</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2">
                <i className="fa-solid fa-envelope mr-2" />Email
              </label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@quanan.com" required
                className="w-full px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition-all" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2">
                <i className="fa-solid fa-lock mr-2" />Mật khẩu
              </label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Nhập mật khẩu" required
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition-all" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors">
                  <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-base transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              {loading ? <><i className="fa-solid fa-spinner fa-spin" />Đang đăng nhập...</> : <><i className="fa-solid fa-sign-in-alt" />Đăng Nhập</>}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link to="/quan-an/quen-mat-khau" className="text-blue-300 hover:text-blue-200 text-sm block mb-2 font-medium">
              Quên mật khẩu?
            </Link>
            <p className="text-white/50 text-sm">
              Chưa có tài khoản?{' '}
              <Link to="/quan-an/dang-ky" className="text-blue-300 hover:text-blue-200 font-semibold transition-colors">Đăng ký</Link>
            </p>
            <Link to="/khach-hang/dang-nhap" className="text-white/40 hover:text-white/60 text-xs transition-colors block">
              <i className="fa-solid fa-user mr-1" />Đăng nhập khách hàng
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
