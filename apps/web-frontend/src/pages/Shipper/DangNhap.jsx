import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import logoFood from '../../assets/logoFood.png';

export default function ShipperDangNhap() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/shipper/dang-nhap', form);
      if (res.data.status === 1) {
        localStorage.setItem('shipper_login', res.data.token);
        toast.success(res.data.message);
        navigate('/shipper/don-hang');
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
      style={{ background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' }}>
      {/* Floating icons */}
      {[
        { icon: 'fa-motorcycle', top: '10%', left: '5%', delay: '0s' },
        { icon: 'fa-box', top: '70%', left: '8%', delay: '1.5s' },
        { icon: 'fa-location-dot', top: '20%', right: '6%', delay: '0.8s' },
        { icon: 'fa-star', top: '75%', right: '5%', delay: '2s' },
      ].map((item, i) => (
        <div key={i} className="absolute text-4xl text-white/5 pointer-events-none"
          style={{ top: item.top, left: item.left, right: item.right, animation: `float 8s ease-in-out infinite`, animationDelay: item.delay }}>
          <i className={`fa-solid ${item.icon}`} />
        </div>
      ))}

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl border border-white/20 animate-fade-up">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-3xl shadow-lg bg-white p-2">
              <img src={logoFood} className="w-full h-full object-contain" alt="FoodBee Logo" />
            </div>
            <h2 className="text-3xl font-extrabold text-white">FoodBee</h2>
            <h3 className="text-xl font-bold text-white/80 mt-1">Cổng Shipper</h3>
            <p className="text-white/40 text-sm mt-1">Đăng nhập để nhận và giao đơn hàng</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2">
                <i className="fa-solid fa-envelope mr-2" />Email
              </label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@shipper.com" required
                className="w-full px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 focus:bg-white/20 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2">
                <i className="fa-solid fa-lock mr-2" />Mật khẩu
              </label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Nhập mật khẩu" required
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 focus:bg-white/20 transition-all" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                  <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-xl text-white font-bold text-base transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #f7971e, #ffd200)', color: '#1a1a1a' }}>
              {loading ? <><i className="fa-solid fa-spinner fa-spin" />Đăng nhập...</> : <><i className="fa-solid fa-sign-in-alt" />Đăng Nhập</>}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link to="/shipper/quen-mat-khau" className="text-yellow-400/70 hover:text-yellow-400 text-sm block mb-2 font-medium">
              Quên mật khẩu?
            </Link>
            <p className="text-white/50 text-sm">
              Chưa có tài khoản?{' '}
              <Link to="/shipper/dang-ky" className="text-yellow-300 hover:text-yellow-200 font-semibold">Đăng ký</Link>
            </p>
            <Link to="/khach-hang/dang-nhap" className="text-white/30 hover:text-white/50 text-xs block">
              <i className="fa-solid fa-user mr-1" />Đăng nhập khách hàng
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
