import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import logoFood from '../../assets/logoFood.png';

export default function AdminDangNhap() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/admin/dang-nhap', form);
      if (res.data.status === 1) {
        localStorage.setItem('nhan_vien_login', res.data.token);
        toast.success(res.data.message);
        navigate('/admin/dashboard');
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)' }}>
      {/* Grid bg effect */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Floating icons */}
      {['fa-users', 'fa-chart-pie', 'fa-shield-halved', 'fa-database'].map((icon, i) => (
        <div key={i} className="absolute text-4xl text-white/5 pointer-events-none"
          style={{ top: `${[10, 70, 20, 75][i]}%`, left: `${[5, 7, 88, 90][i]}%`, animation: `float ${8 + i * 2}s ease-in-out infinite`, animationDelay: `${i * 1.5}s` }}>
          <i className={`fa-solid ${icon}`} />
        </div>
      ))}

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/8 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl border border-white/15 animate-fade-up">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-3xl shadow-xl bg-white p-2">
              <img src={logoFood} className="w-full h-full object-contain drop-shadow" alt="FoodBee Logo" />
            </div>
            <h2 className="text-3xl font-extrabold text-white">FoodBee</h2>
            <h3 className="text-xl font-bold text-white/70 mt-1">Admin Panel</h3>
            <p className="text-white/40 text-xs mt-1">Dành riêng cho quản trị viên</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">
                <i className="fa-solid fa-envelope mr-2 text-red-400" />Email
              </label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="admin@foodbee.vn" required
                className="w-full px-4 py-3.5 rounded-xl bg-white/8 border border-white/15 text-white placeholder-white/25 focus:outline-none focus:border-red-400/60 focus:bg-white/15 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">
                <i className="fa-solid fa-lock mr-2 text-red-400" />Mật khẩu
              </label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Nhập mật khẩu" required
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white/8 border border-white/15 text-white placeholder-white/25 focus:outline-none focus:border-red-400/60 focus:bg-white/15 transition-all" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                  <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-xl text-white font-bold text-base transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #e94560, #c0392b)' }}>
              {loading ? <><i className="fa-solid fa-spinner fa-spin" />Đang xác thực...</> : <><i className="fa-solid fa-right-to-bracket" />Đăng Nhập</>}
            </button>
          </form>

          <p className="text-center text-white/25 text-xs mt-6">
            <i className="fa-solid fa-triangle-exclamation mr-1" />
            Trang này chỉ dành cho quản trị viên có thẩm quyền
          </p>
        </div>
      </div>
    </div>
  );
}
