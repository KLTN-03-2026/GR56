import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import logoFood from '../../assets/logoFood.png';

export default function QuenMatKhau() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);
  const otpRefs = useRef([]);

  const otp = otpDigits.join('');

  useEffect(() => () => clearInterval(timerRef.current), []);

  const startCooldown = () => {
    setCooldown(60);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown(c => { if (c <= 1) { clearInterval(timerRef.current); return 0; } return c - 1; });
    }, 1000);
  };

  const guiMa = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/khach-hang/gui-ma-quen-mat-khau', { email });
      if (res.data.status == 1) {
        toast.success(res.data.message);
        setStep(2);
        startCooldown();
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        toast.error(res.data.message);
      }
    } catch { toast.error('Có lỗi xảy ra, vui lòng thử lại!'); }
    finally { setLoading(false); }
  };

  const datLaiMatKhau = async e => {
    e.preventDefault();
    if (otp.length < 6) { toast.error('Vui lòng nhập đủ 6 chữ số mã xác nhận!'); return; }
    if (newPassword !== confirmPassword) { toast.error('Mật khẩu xác nhận không khớp!'); return; }
    setLoading(true);
    try {
      const res = await api.post('/api/khach-hang/quen-mat-khau', { email, ma_otp: otp, new_password: newPassword });
      if (res.data.status == 1) {
        toast.success(res.data.message);
        setTimeout(() => navigate('/khach-hang/dang-nhap'), 1500);
      } else { toast.error(res.data.message); }
    } catch { toast.error('Có lỗi xảy ra, vui lòng thử lại!'); }
    finally { setLoading(false); }
  };

  const onOtpInput = (i, val) => {
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[i] = cleaned;
    setOtpDigits(next);
    if (cleaned && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const onOtpBackspace = (i, e) => {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) {
      const next = [...otpDigits]; next[i - 1] = '';
      setOtpDigits(next); otpRefs.current[i - 1]?.focus();
    }
  };

  const onOtpPaste = e => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setOtpDigits(Array(6).fill('').map((_, i) => text[i] || ''));
    otpRefs.current[Math.min(text.length, 5)]?.focus();
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}>
      {/* BG decorations */}
      <div className="absolute top-[-150px] right-[-150px] w-[300px] h-[300px] rounded-full bg-white/10 animate-float" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[200px] h-[200px] rounded-full bg-white/10" style={{ animation: 'float 8s ease-in-out infinite reverse' }} />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl border border-white/20 animate-fade-up">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl shadow-lg bg-white p-1">
              <img src={logoFood} className="w-full h-full object-contain" alt="FoodBee Logo" />
            </div>
            <h2 className="text-2xl font-extrabold text-gradient">FoodBee</h2>
            <h3 className="text-xl font-bold text-gray-800 mt-2">Quên Mật Khẩu</h3>
            <p className="text-gray-500 text-sm mt-1">
              {step === 1 ? 'Nhập email để nhận mã xác nhận' : 'Nhập mã xác nhận và mật khẩu mới'}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center mb-8 gap-0">
            {[1, 2].map((s, si) => (
              <div key={s} className="flex items-center">
                {si > 0 && (
                  <div className={`w-12 h-0.5 mx-2 transition-all duration-500 ${step > s - 1 ? '' : 'bg-gray-200'}`}
                    style={step > si ? { background: 'linear-gradient(90deg, #ff6b35, #f7931e)' } : {}} />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-400 ${step > s ? 'bg-green-500 text-white' : step === s ? 'text-white' : 'bg-gray-200 text-gray-400'}`}
                    style={step === s ? { background: 'linear-gradient(135deg, #ff6b35, #f7931e)', boxShadow: '0 4px 12px rgba(255,107,53,0.3)' } : {}}>
                    {step > s ? <i className="fa-solid fa-check text-xs" /> : s}
                  </div>
                  <span className={`text-xs whitespace-nowrap ${step >= s ? 'text-orange-500 font-semibold' : 'text-gray-400'}`}>
                    {s === 1 ? 'Nhập Email' : 'Đặt lại MK'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <form onSubmit={guiMa} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <i className="fa-solid fa-envelope mr-2 text-orange-400" />Email
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com" required className="input-modern" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}>
                {loading ? <><i className="fa-solid fa-spinner fa-spin" />Đang gửi...</> : <><i className="fa-solid fa-paper-plane" />Gửi mã xác nhận</>}
              </button>
            </form>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <form onSubmit={datLaiMatKhau} className="space-y-5">
              {/* Email notice */}
              <div className="flex items-center flex-wrap gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
                <i className="fa-solid fa-circle-check text-green-500" />
                <span>Mã đã gửi tới <strong>{email}</strong></span>
                <button type="button" disabled={cooldown > 0} onClick={() => guiMa()}
                  className={`ml-auto text-xs font-semibold underline ${cooldown > 0 ? 'text-gray-400 cursor-not-allowed no-underline' : 'text-orange-500 hover:text-orange-600'}`}>
                  {cooldown > 0 ? `Gửi lại (${cooldown}s)` : 'Gửi lại'}
                </button>
              </div>

              {/* OTP */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <i className="fa-solid fa-shield-halved mr-2 text-orange-400" />Mã xác nhận (6 số)
                </label>
                <div className="flex gap-2 justify-center" onPaste={onOtpPaste}>
                  {otpDigits.map((d, i) => (
                    <input key={i} ref={el => otpRefs.current[i] = el} type="text" inputMode="numeric"
                      maxLength={1} value={d}
                      onChange={e => onOtpInput(i, e.target.value)}
                      onKeyDown={e => onOtpBackspace(i, e)}
                      className="w-12 h-14 text-center text-2xl font-bold text-orange-500 rounded-xl outline-none transition-all duration-200 border-2 border-gray-200 bg-white/80 focus:border-orange-400 focus:shadow-lg focus:scale-105"
                    />
                  ))}
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <i className="fa-solid fa-lock mr-2 text-orange-400" />Mật khẩu mới
                </label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={newPassword}
                    onChange={e => setNewPassword(e.target.value)} placeholder="Ít nhất 6 ký tự" required minLength={6}
                    className="input-modern pr-12" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"><i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} /></button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <i className="fa-solid fa-lock mr-2 text-orange-400" />Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới" required
                    className={`input-modern pr-12 ${confirmPassword && newPassword !== confirmPassword ? 'border-red-400' : ''}`} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"><i className={`fa-solid ${showConfirm ? 'fa-eye-slash' : 'fa-eye'}`} /></button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-red-500 text-xs mt-1"><i className="fa-solid fa-triangle-exclamation mr-1" />Mật khẩu không khớp!</p>
                )}
              </div>

              <button type="submit" disabled={loading || (confirmPassword && newPassword !== confirmPassword)}
                className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}>
                {loading ? <><i className="fa-solid fa-spinner fa-spin" />Đang xử lý...</> : <><i className="fa-solid fa-key" />Đặt lại mật khẩu</>}
              </button>
            </form>
          )}

          <div className="text-center mt-6">
            <Link to="/khach-hang/dang-nhap"
              className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center justify-center gap-1 transition-all hover:-translate-x-1">
              <i className="fa-solid fa-arrow-left text-xs" />Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
