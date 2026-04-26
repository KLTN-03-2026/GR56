import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const sA = (url, method = 'get', data = null) => {
  const token = localStorage.getItem('shipper_login');
  const cfg = { headers: { Authorization: `Bearer ${token}` } };
  return method === 'get' ? api.get(url, cfg) : api.post(url, data, cfg);
};

const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all';
const LABEL = 'block text-sm font-semibold text-gray-600 mb-1.5';

export default function ShipperProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pw, setPw] = useState({ mat_khau_cu: '', mat_khau_moi: '', xac_nhan_mat_khau_moi: '' });
  const [showPw, setShowPw] = useState({ old: false, new: false, re: false });
  const [danhGia, setDanhGia] = useState({ tong: 0, trungBinh: 0, thongKe: {}, danhSach: [] });
  const [tabActive, setTabActive] = useState('info');

  useEffect(() => {
    const token = localStorage.getItem('shipper_login');
    if (!token) { navigate('/shipper/dang-nhap'); return; }
    fetchProfile();
    fetchDanhGia();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try { const r = await sA('/api/shipper/data-login'); if (r.data.status) setUser(r.data.data); }
    catch (e) { if (e?.response?.status === 401) { localStorage.removeItem('shipper_login'); navigate('/shipper/dang-nhap'); } }
    finally { setLoading(false); }
  };

  const fetchDanhGia = async () => {
    try {
      const r = await sA('/api/shipper/danh-gia');
      if (r.data.status) {
        setDanhGia({
          tong: r.data.tong_danh_gia,
          trungBinh: r.data.trung_binh_sao,
          thongKe: r.data.thong_ke_sao,
          danhSach: r.data.danh_sach,
        });
      }
    } catch (e) { /* silent */ }
  };

  const updateProfile = async () => {
    setSaving(true);
    try {
      const r = await sA('/api/shipper/update-profile', 'post', user);
      if (r.data.status == 1) toast.success(r.data.message); else toast.error(r.data.message);
    } catch (e) { Object.values(e?.response?.data?.errors || {}).forEach(v => toast.error(v[0])); }
    finally { setSaving(false); }
  };

  const doiMatKhau = async () => {
    if (!pw.mat_khau_cu || !pw.mat_khau_moi || !pw.xac_nhan_mat_khau_moi) { toast.error('Vui lòng nhập đầy đủ!'); return; }
    if (pw.mat_khau_moi !== pw.xac_nhan_mat_khau_moi) { toast.error('Mật khẩu mới không khớp!'); return; }
    setSavingPw(true);
    try {
      const r = await sA('/api/shipper/doi-mat-khau', 'post', pw);
      if (r.data.status == 1) { toast.success(r.data.message); setPw({ mat_khau_cu: '', mat_khau_moi: '', xac_nhan_mat_khau_moi: '' }); }
      else toast.error(r.data.message);
    } catch (e) { Object.values(e?.response?.data?.errors || {}).forEach(v => toast.error(v[0])); }
    finally { setSavingPw(false); }
  };

  const logout = () => { localStorage.removeItem('shipper_login'); toast.success('Đã đăng xuất!'); navigate('/shipper/dang-nhap'); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f2027, #2c5364)' }}>
      <div className="w-12 h-12 border-4 border-yellow-200 border-t-yellow-400 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="text-white px-4 py-5 mb-8" style={{ background: 'linear-gradient(135deg, #0f2027, #2c5364)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-motorcycle text-2xl text-yellow-400" />
            <div>
              <h1 className="text-xl font-extrabold">Trang Cá Nhân</h1>
              <p className="text-white/50 text-xs">Shipper Dashboard</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/shipper/don-hang" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/20 border border-white/20">
              <i className="fa-solid fa-bag-shopping" />Đơn hàng
            </Link>
            <button onClick={logout} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-300 text-sm font-semibold hover:bg-red-500/30 border border-red-400/30">
              <i className="fa-solid fa-right-from-bracket" />Đăng xuất
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-10">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
              <div className="relative inline-block mb-4">
                <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.ho_va_ten||'S')}&background=f7971e&color=fff&size=200`}
                  alt="" className="w-28 h-28 rounded-full object-cover shadow-lg border-4 border-yellow-100" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{user.ho_va_ten}</h3>
              <p className="text-gray-400 text-sm mb-2">Shipper</p>

              {/* Rating badge */}
              {danhGia.tong > 0 && (
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <span className="text-yellow-400 font-bold text-lg">{danhGia.trungBinh}</span>
                  <i className="fa-solid fa-star text-yellow-400 text-sm" />
                  <span className="text-gray-400 text-xs">({danhGia.tong} đánh giá)</span>
                </div>
              )}

              <div className="flex items-center justify-center gap-1.5 text-green-500 text-sm font-semibold">
                <i className="fa-solid fa-circle text-xs" />Đang hoạt động
              </div>
              <hr className="my-4 border-gray-100" />
              {[
                { icon: 'fa-envelope', label: user.email },
                { icon: 'fa-phone', label: user.so_dien_thoai },
                { icon: 'fa-location-dot', label: user.dia_chi },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0 text-left">
                  <i className={`fa-solid ${item.icon} text-yellow-500 w-5 text-center`} />
                  <span className="text-sm text-gray-600 truncate">{item.label || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab buttons */}
            <div className="flex gap-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
              {[
                { key: 'info', icon: 'fa-user', label: 'Thông tin' },
                { key: 'password', icon: 'fa-lock', label: 'Mật khẩu' },
                { key: 'rating', icon: 'fa-star', label: `Đánh giá${danhGia.tong > 0 ? ` (${danhGia.tong})` : ''}` },
              ].map(t => (
                <button key={t.key} onClick={() => setTabActive(t.key)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    tabActive === t.key
                      ? 'text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                  style={tabActive === t.key ? { background: 'linear-gradient(135deg, #f7971e, #ffd200)' } : {}}>
                  <i className={`fa-solid ${t.icon}`} />{t.label}
                </button>
              ))}
            </div>

            {/* Tab: Thông tin */}
            {tabActive === 'info' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h4 className="font-bold text-yellow-600 text-base mb-5 flex items-center gap-2">
                  <i className="fa-regular fa-user" />Thông tin cá nhân
                </h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label className={LABEL}>Họ và tên</label>
                    <input value={user.ho_va_ten || ''} onChange={e => setUser({ ...user, ho_va_ten: e.target.value })} className={INPUT} /></div>
                  <div><label className={LABEL}>Email</label>
                    <input value={user.email || ''} disabled className={INPUT + ' bg-gray-50 cursor-not-allowed text-gray-400'} /></div>
                  <div><label className={LABEL}>Số điện thoại</label>
                    <input value={user.so_dien_thoai || ''} onChange={e => setUser({ ...user, so_dien_thoai: e.target.value })} className={INPUT} /></div>
                  <div><label className={LABEL}>Địa chỉ</label>
                    <input value={user.dia_chi || ''} onChange={e => setUser({ ...user, dia_chi: e.target.value })} className={INPUT} /></div>
                </div>
                <div className="mt-5 flex justify-end">
                  <button onClick={updateProfile} disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-gray-900 font-bold text-sm disabled:opacity-60 transition-all shadow-md hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #f7971e, #ffd200)' }}>
                    {saving ? <><i className="fa-solid fa-spinner fa-spin" />Đang lưu...</> : <><i className="fa-regular fa-floppy-disk" />Lưu thay đổi</>}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Mật khẩu */}
            {tabActive === 'password' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h4 className="font-bold text-yellow-600 text-base mb-5 flex items-center gap-2">
                  <i className="fa-solid fa-lock" />Đổi Mật Khẩu
                </h4>
                <div className="space-y-4">
                  {[
                    { key: 'old', field: 'mat_khau_cu', label: 'Mật khẩu hiện tại' },
                    { key: 'new', field: 'mat_khau_moi', label: 'Mật khẩu mới' },
                    { key: 're', field: 'xac_nhan_mat_khau_moi', label: 'Xác nhận mật khẩu mới' },
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
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-gray-900 font-bold text-sm disabled:opacity-60 shadow-md hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #f7971e, #ffd200)' }}>
                    {savingPw ? <><i className="fa-solid fa-spinner fa-spin" />Đang đổi...</> : <><i className="fa-solid fa-key" />Đổi Mật Khẩu</>}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Đánh giá */}
            {tabActive === 'rating' && (
              <div className="space-y-4">
                {danhGia.tong === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                    <i className="fa-regular fa-star text-4xl text-gray-200 mb-3 block" />
                    <p className="text-gray-400 font-medium">Bạn chưa có đánh giá nào</p>
                    <p className="text-gray-300 text-sm mt-1">Hãy hoàn thành nhiều đơn hàng để nhận đánh giá từ khách</p>
                  </div>
                ) : (
                  <>
                    {/* Tổng quan */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <h4 className="font-bold text-yellow-600 text-base mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-chart-bar" />Tổng quan đánh giá
                      </h4>
                      <div className="flex items-center gap-6">
                        {/* Điểm trung bình */}
                        <div className="text-center min-w-[90px]">
                          <div className="text-5xl font-extrabold text-yellow-400">{danhGia.trungBinh}</div>
                          <div className="flex justify-center gap-0.5 my-1">
                            {[1,2,3,4,5].map(s => (
                              <i key={s} className={`fa-star text-sm ${s <= Math.round(danhGia.trungBinh) ? 'fa-solid text-yellow-400' : 'fa-regular text-gray-200'}`} />
                            ))}
                          </div>
                          <div className="text-gray-400 text-xs">{danhGia.tong} đánh giá</div>
                        </div>
                        {/* Bar chart */}
                        <div className="flex-1 space-y-2">
                          {[5,4,3,2,1].map(sao => {
                            const info = danhGia.thongKe[sao] || { so_luong: 0, phan_tram: 0 };
                            return (
                              <div key={sao} className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 w-3">{sao}</span>
                                <i className="fa-solid fa-star text-yellow-400 text-xs" />
                                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                  <div className="h-2 rounded-full bg-yellow-400 transition-all"
                                    style={{ width: `${info.phan_tram}%` }} />
                                </div>
                                <span className="text-xs text-gray-400 w-8 text-right">{info.so_luong}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Danh sách bình luận */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <h4 className="font-bold text-yellow-600 text-base mb-4 flex items-center gap-2">
                        <i className="fa-regular fa-comments" />Bình luận của khách hàng
                      </h4>
                      <div className="space-y-4">
                        {danhGia.danhSach.map(dg => (
                          <div key={dg.id} className="flex gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                            <img
                              src={dg.avatar_khach_hang || `https://ui-avatars.com/api/?name=${encodeURIComponent(dg.ten_khach_hang||'K')}&background=f7971e&color=fff&size=80`}
                              alt="" className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-yellow-100" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between flex-wrap gap-1">
                                <span className="font-semibold text-gray-800 text-sm">{dg.ten_khach_hang}</span>
                                <span className="text-gray-400 text-xs">{new Date(dg.created_at).toLocaleDateString('vi-VN')}</span>
                              </div>
                              <div className="flex items-center gap-0.5 my-1">
                                {[1,2,3,4,5].map(s => (
                                  <i key={s} className={`fa-star text-xs ${s <= dg.sao_shipper ? 'fa-solid text-yellow-400' : 'fa-regular text-gray-200'}`} />
                                ))}
                              </div>
                              {dg.nhan_xet_shipper ? (
                                <p className="text-gray-600 text-sm">{dg.nhan_xet_shipper}</p>
                              ) : (
                                <p className="text-gray-300 text-sm italic">Không có nhận xét</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">Đơn hàng: <span className="font-medium text-gray-500">{dg.ma_don_hang}</span></p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
