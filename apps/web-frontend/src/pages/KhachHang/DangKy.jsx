import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import logoFood from '../../assets/logoFood.png';

const AuthBg = () => (
  <div className="fixed inset-0 -z-10" style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' }}>
    <div className="absolute top-[-150px] right-[-150px] w-[300px] h-[300px] rounded-full bg-white/10 animate-float" />
    <div className="absolute bottom-[-100px] left-[-100px] w-[200px] h-[200px] rounded-full bg-white/10" style={{ animation: 'float 8s ease-in-out infinite reverse' }} />
    {['fa-utensils', 'fa-pizza-slice', 'fa-burger', 'fa-mug-hot'].map((icon, i) => (
      <div key={i} className="absolute text-3xl text-white/10 pointer-events-none"
        style={{ top: `${[20, 60, 70, 40][i]}%`, left: `${[10, 80, 15, 85][i]}%`, animation: `float ${8 + i * 2}s ease-in-out infinite`, animationDelay: `${i * 2}s` }}>
        <i className={`fa-solid ${icon}`} />
      </div>
    ))}
  </div>
);

export default function DangKy() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ho_va_ten: '', email: '', so_dien_thoai: '', ngay_sinh: '', password: '', re_password: '' });
  const [showPass, setShowPass] = useState(false);
  const [showRePass, setShowRePass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.password !== form.re_password) { toast.error('Mật khẩu xác nhận không khớp!'); return; }
    setLoading(true);
    try {
      const res = await api.post('/api/khach-hang/dang-ky', form);
      if (res.data.status) {
        toast.success(res.data.message);
        navigate('/khach-hang/dang-nhap');
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      const errors = err?.response?.data?.errors;
      if (errors) Object.values(errors).forEach(v => toast.error(v[0]));
      else toast.error(err?.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại!');
    } finally { setLoading(false); }
  };

  const fields = [
    { name: 'ho_va_ten', label: 'Họ và Tên', icon: 'fa-user', type: 'text', placeholder: 'Nguyễn Văn A' },
    { name: 'email', label: 'Email', icon: 'fa-envelope', type: 'email', placeholder: 'example@email.com' },
    { name: 'so_dien_thoai', label: 'Số Điện Thoại', icon: 'fa-phone', type: 'tel', placeholder: '0123456789' },
    { name: 'ngay_sinh', label: 'Ngày Sinh', icon: 'fa-calendar-days', type: 'date', placeholder: '' },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center py-8">
      <AuthBg />
      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl border border-white/20 animate-fade-up">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl shadow-lg bg-white p-1">
              <img src={logoFood} className="w-full h-full object-contain" alt="FoodBee Logo" />
            </div>
            <h2 className="text-2xl font-extrabold text-gradient">FoodBee</h2>
            <h3 className="text-xl font-bold text-gray-800 mt-2">Tạo Tài Khoản</h3>
            <p className="text-gray-500 text-sm mt-1">Tham gia ngay để thưởng thức những món ăn tuyệt vời!</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic fields */}
            {fields.map(f => (
              <div key={f.name}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <i className={`fa-solid ${f.icon} mr-2 text-orange-400`} />{f.label}
                </label>
                <input type={f.type} name={f.name} value={form[f.name]} onChange={handleChange}
                  placeholder={f.placeholder} required className="input-modern" />
              </div>
            ))}

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <i className="fa-solid fa-lock mr-2 text-orange-400" />Mật khẩu
              </label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} name="password" value={form.password}
                  onChange={handleChange} placeholder="Ít nhất 6 ký tự" required className="input-modern pr-12" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <i className="fa-solid fa-lock-open mr-2 text-orange-400" />Xác nhận mật khẩu
              </label>
              <div className="relative">
                <input type={showRePass ? 'text' : 'password'} name="re_password" value={form.re_password}
                  onChange={handleChange} placeholder="Nhập lại mật khẩu" required
                  className={`input-modern pr-12 ${form.re_password && form.password !== form.re_password ? 'border-red-400' : ''}`} />
                <button type="button" onClick={() => setShowRePass(!showRePass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <i className={`fa-solid ${showRePass ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
              {form.re_password && form.password !== form.re_password && (
                <p className="text-red-500 text-xs mt-1"><i className="fa-solid fa-triangle-exclamation mr-1" />Mật khẩu không khớp!</p>
              )}
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-xl text-white font-bold text-base transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}>
              {loading ? <><i className="fa-solid fa-spinner fa-spin" />Đang xử lý...</> : <><i className="fa-solid fa-user-plus" />Đăng Ký</>}
            </button>

            <div className="text-center">
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-4 text-gray-400 text-sm">Đã có tài khoản?</span></div>
              </div>
              <Link to="/khach-hang/dang-nhap" className="text-orange-500 hover:text-orange-600 text-sm font-semibold flex items-center justify-center gap-1 transition-colors">
                <i className="fa-solid fa-sign-in-alt text-xs" />Đăng nhập ngay
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
