import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const qA = (url, method = 'get', data = null) => {
  const token = localStorage.getItem('quan_an_login');
  const cfg = { headers: { Authorization: `Bearer ${token}` } };
  return method === 'get' ? api.get(url, cfg) : api.post(url, data, cfg);
};

const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all';
const LABEL = 'block text-sm font-semibold text-gray-600 mb-1.5';

export default function QuanAnProfile() {
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pw, setPw] = useState({ old_password: '', password: '', re_password: '' });
  const [showPw, setShowPw] = useState({ old: false, new: false, re: false });
  const avatarRef = useRef();

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const r = await qA('/api/quan-an/data-login');
      if (r.data.status) setUser(r.data.data);
    } catch {}
    finally { setLoading(false); }
  };

  const updateProfile = async () => {
    setSaving(true);
    try {
      const r = await qA('/api/quan-an/update-profile', 'post', user);
      if (r.data.status == 1) toast.success(r.data.message);
      else toast.error(r.data.message);
    } catch (e) { Object.values(e?.response?.data?.errors || {}).forEach(v => toast.error(v[0])); }
    finally { setSaving(false); }
  };

  const doiMatKhau = async () => {
    if (!pw.old_password || !pw.password || !pw.re_password) { toast.error('Vui lòng nhập đầy đủ!'); return; }
    if (pw.password !== pw.re_password) { toast.error('Mật khẩu mới không khớp!'); return; }
    setSavingPw(true);
    try {
      const r = await qA('/api/quan-an/update-password', 'post', pw);
      if (r.data.status == 1) { toast.success(r.data.message); setPw({ old_password: '', password: '', re_password: '' }); }
      else toast.error(r.data.message);
    } catch (e) { Object.values(e?.response?.data?.errors || {}).forEach(v => toast.error(v[0])); }
    finally { setSavingPw(false); }
  };

  const InfoRow = ({ label, value }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100">
      <span className="text-sm font-semibold text-gray-500">{label}</span>
      <span className="text-sm text-gray-800">{value || '—'}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6"><i className="fa-solid fa-store mr-3 text-blue-500" />Thông Tin Quán Ăn</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            {/* Avatar */}
            <div className="relative inline-block mb-4">
              <img src={user.hinh_anh || `https://ui-avatars.com/api/?name=${user.ten_quan_an || 'QA'}&background=3b82f6&color=fff&size=200`}
                alt="" className="w-28 h-28 rounded-2xl object-cover shadow-lg border-4 border-blue-100" />
              <div className="absolute bottom-0 right-0 w-9 h-9 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-md">
                <i className="fa-solid fa-camera text-sm" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900">{user.ten_quan_an}</h3>
            <p className="text-gray-400 text-sm mb-1">Quán Ăn</p>
            <div className="flex items-center justify-center gap-1.5 text-green-500 text-sm font-semibold">
              <i className="fa-solid fa-circle text-xs" />Đang hoạt động
            </div>
            <hr className="my-4 border-gray-100" />
            <div className="text-left space-y-1">
              <InfoRow label={<><i className="fa-solid fa-envelope text-blue-400 mr-2" />Email</>} value={user.email} />
              <InfoRow label={<><i className="fa-solid fa-phone text-blue-400 mr-2" />Điện thoại</>} value={user.so_dien_thoai} />
              <InfoRow label={<><i className="fa-solid fa-location-dot text-blue-400 mr-2" />Địa chỉ</>} value={user.dia_chi} />
              <InfoRow label={<><i className="fa-regular fa-clock text-blue-400 mr-2" />Giờ mở</>} value={user.gio_mo_cua ? `${user.gio_mo_cua} – ${user.gio_dong_cua}` : null} />
            </div>
          </div>
        </div>

        {/* Right: Edit forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Thông tin quán */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h4 className="font-bold text-blue-600 text-base mb-5 flex items-center gap-2">
              <i className="fa-regular fa-user" />Thông tin cơ bản
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Tên quán ăn</label>
                <input value={user.ten_quan_an || ''} onChange={e => setUser({ ...user, ten_quan_an: e.target.value })} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Email</label>
                <input value={user.email || ''} disabled className={INPUT + ' bg-gray-50 cursor-not-allowed text-gray-400'} />
              </div>
              <div>
                <label className={LABEL}>Số điện thoại</label>
                <input value={user.so_dien_thoai || ''} onChange={e => setUser({ ...user, so_dien_thoai: e.target.value })} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Địa chỉ</label>
                <input value={user.dia_chi || ''} onChange={e => setUser({ ...user, dia_chi: e.target.value })} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Giờ mở cửa</label>
                <input type="time" value={user.gio_mo_cua || ''} onChange={e => setUser({ ...user, gio_mo_cua: e.target.value })} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Giờ đóng cửa</label>
                <input type="time" value={user.gio_dong_cua || ''} onChange={e => setUser({ ...user, gio_dong_cua: e.target.value })} className={INPUT} />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL}>Hình ảnh (URL)</label>
                <input value={user.hinh_anh || ''} onChange={e => setUser({ ...user, hinh_anh: e.target.value })} className={INPUT} placeholder="https://..." />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button onClick={updateProfile} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-md hover:shadow-lg">
                {saving ? <><i className="fa-solid fa-spinner fa-spin" />Đang lưu...</> : <><i className="fa-regular fa-floppy-disk" />Lưu thay đổi</>}
              </button>
            </div>
          </div>

          {/* Đổi mật khẩu */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h4 className="font-bold text-blue-600 text-base mb-5 flex items-center gap-2">
              <i className="fa-solid fa-lock" />Đổi Mật Khẩu
            </h4>
            <div className="space-y-4">
              {[
                { key: 'old', field: 'old_password', label: 'Mật khẩu hiện tại' },
                { key: 'new', field: 'password', label: 'Mật khẩu mới' },
                { key: 're', field: 're_password', label: 'Xác nhận mật khẩu mới' },
              ].map(({ key, field, label }) => (
                <div key={key}>
                  <label className={LABEL}>{label}</label>
                  <div className="relative">
                    <input type={showPw[key] ? 'text' : 'password'} value={pw[field]} onChange={e => setPw({ ...pw, [field]: e.target.value })}
                      placeholder={label} className={INPUT + ' pr-11'} />
                    <button type="button" onClick={() => setShowPw(p => ({ ...p, [key]: !p[key] }))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <i className={`fa-solid ${showPw[key] ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button onClick={doiMatKhau} disabled={savingPw}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-md">
                {savingPw ? <><i className="fa-solid fa-spinner fa-spin" />Đang đổi...</> : <><i className="fa-solid fa-key" />Đổi Mật Khẩu</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
