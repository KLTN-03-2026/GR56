import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function Profile() {
  const { user: authUser, loadUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState({});
  const [listDiaChi, setListDiaChi] = useState([]);
  const [listTinhThanh, setListTinhThanh] = useState([]);
  const [listQuanHuyen, setListQuanHuyen] = useState([]);
  const [diaChi, setDiaChi] = useState({ ten_nguoi_nhan: '', so_dien_thoai: '', id_tinh_thanh: 1, id_quan_huyen: '', dia_chi: '' });
  const [detailDiaChi, setDetailDiaChi] = useState({});
  const [doiMatKhau, setDoiMatKhau] = useState({ old_password: '', password: '', re_password: '' });
  const [modalType, setModalType] = useState(null); // 'add' | 'edit' | 'delete' | 'add-bank'
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [geocoding, setGeocoding] = useState(false); // trạng thái đang geocode

  // ── Tài khoản NH hoàn tiền (MỚI) ───────────────────────────────────────
  const [banks, setBanks] = useState([]);
  const [newBank, setNewBank] = useState({ ten_ngan_hang: '', so_tai_khoan: '', chu_tai_khoan: '', chi_nhanh: '' });

  useEffect(() => {
    // Đọc ?tab= từ URL (ví dụ: ?tab=address&returnUrl=...)
    const tabParam = searchParams.get('tab');
    if (tabParam) setActiveTab(tabParam);

    loadProfile();
    loadDiaChi();
    loadTinhThanh();
    loadQuanHuyen(1);
    setDiaChi(d => ({ ...d, id_tinh_thanh: 1 }));
    loadBanks();
  }, []);

  // ── Bank account functions (MỚI) ──────────────────────────────────────
  const loadBanks = async () => {
    try {
      const res = await api.get('/api/khach-hang/tai-khoan-ngan-hang');
      if (res.data.status) setBanks(res.data.data || []);
    } catch {}
  };

  const addBank = async () => {
    try {
      const res = await api.post('/api/khach-hang/tai-khoan-ngan-hang', newBank);
      if (res.data.status) {
        toast.success(res.data.message);
        loadBanks();
        setModalType(null);
        setNewBank({ ten_ngan_hang: '', so_tai_khoan: '', chu_tai_khoan: '', chi_nhanh: '' });
        // Nếu đến đây từ trang yêu cầu hủy đơn thì tự quay về
        const returnUrl = searchParams.get('returnUrl');
        if (returnUrl) {
          toast('Đang quay về trang đơn hàng để yêu cầu hủy...', { icon: '↩️', duration: 1500 });
          setTimeout(() => navigate(returnUrl), 1600);
        }
      } else toast.error(res.data.message);
    } catch (err) {
      const errs = err?.response?.data?.errors;
      if (errs) Object.values(errs).forEach(v => toast.error(v[0]));
      else toast.error('Thêm tài khoản thất bại!');
    }
  };

  const deleteBank = async (id) => {
    if (!confirm('Xóa tài khoản ngân hàng này?')) return;
    try {
      const res = await api.delete(`/api/khach-hang/tai-khoan-ngan-hang/${id}`);
      if (res.data.status) { toast.success(res.data.message); loadBanks(); }
      else toast.error(res.data.message);
    } catch {}
  };

  const setDefaultBank = async (id) => {
    try {
      const res = await api.post(`/api/khach-hang/tai-khoan-ngan-hang/${id}/default`);
      if (res.data.status) { toast.success(res.data.message); loadBanks(); }
    } catch {}
  };

  const loadProfile = async () => {
    try {
      const res = await api.get('/api/khach-hang/data-login');
      if (res.data.status) setUser(res.data.data);
    } catch {}
  };

  const loadDiaChi = async () => {
    try {
      const res = await api.get('/api/khach-hang/dia-chi/data');
      setListDiaChi(res.data.data || []);
    } catch {}
  };

  const loadTinhThanh = async () => {
    try {
      const res = await api.get('/api/khach-hang/tinh-thanh/data');
      setListTinhThanh(res.data.data || []);
    } catch {}
  };

  const loadQuanHuyen = async (id) => {
    try {
      const res = await api.post('/api/khach-hang/quan-huyen/data', { id_tinh_thanh: id });
      setListQuanHuyen(res.data.data || []);
    } catch {}
  };

  const updateProfile = async () => {
    try {
      const res = await api.post('/api/khach-hang/update-profile', user);
      if (res.data.status) { toast.success(res.data.message); loadProfile(); if (loadUser) loadUser(); }
      else toast.error(res.data.message);
    } catch (err) {
      const errs = err?.response?.data?.errors;
      if (errs) Object.values(errs).forEach(v => toast.error(v[0]));
      else toast.error('Cập nhật thất bại!');
    }
  };

  const doiMatKhauSubmit = async () => {
    try {
      const res = await api.post('/api/khach-hang/update-password', doiMatKhau);
      if (res.data.status) { toast.success(res.data.message); setDoiMatKhau({ old_password: '', password: '', re_password: '' }); }
      else toast.error(res.data.message);
    } catch (err) {
      const errs = err?.response?.data?.errors;
      if (errs) Object.values(errs).forEach(v => toast.error(v[0]));
      else toast.error('Đổi mật khẩu thất bại!');
    }
  };

  const addDiaChi = async () => {
    try {
      const res = await api.post('/api/khach-hang/dia-chi/create', diaChi);
      if (res.data.status) {
        toast.success(res.data.message);
        loadDiaChi();
        setModalType(null);
        // Nếu đến đây từ trang đặt hàng thì tự quay về
        const returnUrl = searchParams.get('returnUrl');
        if (returnUrl) {
          toast('Đang quay về trang đặt hàng...', { icon: '🛒', duration: 1500 });
          setTimeout(() => navigate(returnUrl), 1600);
        }
      } else toast.error(res.data.message);
    } catch (err) {
      const errs = err?.response?.data?.errors;
      if (errs) Object.values(errs).forEach(v => toast.error(v[0]));
    }
  };

  const updateDiaChi = async () => {
    try {
      const res = await api.post('/api/khach-hang/dia-chi/update', detailDiaChi);
      if (res.data.status) { toast.success(res.data.message); loadDiaChi(); setModalType(null); }
      else toast.error(res.data.message);
    } catch {}
  };

  // ── Geocode từ FE dùng Nominatim (OpenStreetMap) ────────────────
  const geocodeFromFE = async (addrObj, setter) => {
    const { dia_chi, id_quan_huyen } = addrObj;
    if (!dia_chi && !id_quan_huyen) return toast('Điền địa chỉ hoặc chọn quận/huyện trước', { icon: '⚠️' });

    setGeocoding(true);
    try {
      const qh = listQuanHuyen.find(q => String(q.id) === String(id_quan_huyen));
      const tt = listTinhThanh.find(t => String(t.id) === String(addrObj.id_tinh_thanh || diaChi.id_tinh_thanh));
      const tenQH = qh?.ten_quan_huyen || '';
      const tenTT = tt?.ten_tinh_thanh || '';

      // Trích xuất tên đường (bỏ số nhà như "63/1", "12B", "số 5"...)
      const extractStreet = (addr) => {
        // Bỏ phần số nhà đầu: "63/1 Lý Tự Trọng" → "Lý Tự Trọng"
        return addr.replace(/^(\d+[\/\-\w]*\s+)/, '').trim();
      };

      const tryGeocode = async (query) => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'vi,en' } });
        const data = await res.json();
        return data.length > 0 ? data[0] : null;
      };

      let result = null;

      // Chiến lược 1: Địa chỉ đầy đủ
      if (dia_chi && tenQH && tenTT) {
        result = await tryGeocode(`${dia_chi}, ${tenQH}, ${tenTT}, Việt Nam`);
      }

      // Chiến lược 2: Tên đường (bỏ số nhà) + quận + tỉnh
      if (!result && dia_chi) {
        const street = extractStreet(dia_chi);
        if (street !== dia_chi) {
          result = await tryGeocode(`${street}, ${tenQH}, ${tenTT}, Việt Nam`);
        }
      }

      // Chiến lược 3: Tên đường + tỉnh (bỏ quận)
      if (!result && dia_chi) {
        const street = extractStreet(dia_chi);
        result = await tryGeocode(`${street}, ${tenTT}, Việt Nam`);
      }

      // Chiến lược 4: Chỉ quận + tỉnh (tọa độ xấp xỉ)
      if (!result && tenQH && tenTT) {
        result = await tryGeocode(`${tenQH}, ${tenTT}, Việt Nam`);
      }

      // Chiến lược 5: Structured search (đường + thành phố)
      if (!result && dia_chi && tenTT) {
        const street = extractStreet(dia_chi);
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&street=${encodeURIComponent(street)}&city=${encodeURIComponent(tenTT)}`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'vi,en' } });
        const data = await res.json();
        if (data.length > 0) result = data[0];
      }

      if (result) {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        setter(d => ({ ...d, lat, lng, toa_do_x: lat, toa_do_y: lng }));
        const note = result.display_name?.substring(0, 60) + '...';
        toast.success(`📍 Đã xác định: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } else {
        toast.error('Không tìm thấy tọa độ. Hãy thử nhập tên đường rõ hơn (ví dụ: "Lý Tự Trọng")');
      }
    } catch (e) {
      toast.error('Lỗi kết nối geocoder');
    } finally {
      setGeocoding(false);
    }
  };

  // ── Dùng GPS browser ──────────────────────────────────
  const useGPS = (setter) => {
    if (!navigator.geolocation) return toast.error('Trình duyệt không hỗ trợ GPS');
    setGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setter(d => ({ ...d, lat, lng, toa_do_x: lat, toa_do_y: lng }));
        toast.success(`📍 Vị trí hiện tại: ${lat}, ${lng}`);
        setGeocoding(false);
      },
      () => { toast.error('Không lấy được vị trí. Kiểm tra quyền GPS!'); setGeocoding(false); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };


  const deleteDiaChi = async () => {
    try {
      const res = await api.post('/api/khach-hang/dia-chi/delete', detailDiaChi);
      if (res.data.status) { toast.success(res.data.message); loadDiaChi(); setModalType(null); }
      else toast.error(res.data.message);
    } catch {}
  };

  const handleAvatarChange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    // Preview
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
    // Upload
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await api.post('/api/khach-hang/update-avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.status) { toast.success(res.data.message); loadProfile(); if (loadUser) loadUser(); }
      else toast.error(res.data.message);
    } catch (err) {
      const errs = err?.response?.data?.errors;
      if (errs) Object.values(errs).forEach(v => toast.error(v[0]));
    }
  };

  const tabs = [
    { key: 'profile', label: 'Thông tin cá nhân', icon: 'fa-user' },
    { key: 'address', label: 'Địa chỉ nhận hàng', icon: 'fa-location-dot' },
    { key: 'password', label: 'Đổi mật khẩu', icon: 'fa-lock' },
    { key: 'bank', label: 'Tài khoản hoàn tiền', icon: 'fa-building-columns' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="flex overflow-x-auto">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${activeTab === t.key ? 'border-orange-500 text-orange-500 bg-orange-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                <i className={`fa-solid ${t.icon}`} />{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Avatar card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
              <div className="relative inline-block mb-4">
                <img src={avatarPreview || user.avatar || `https://ui-avatars.com/api/?name=${user.ho_va_ten}&background=ff6b35&color=fff`}
                  alt="" className="w-28 h-28 rounded-full object-cover border-4 border-orange-100" />
                <label htmlFor="avatarInput" className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border-2 border-orange-500 flex items-center justify-center cursor-pointer shadow-lg hover:bg-orange-50 transition-colors">
                  <i className="fa-solid fa-camera text-orange-500 text-xs" />
                </label>
                <input id="avatarInput" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <h2 className="text-lg font-bold text-gray-800">{user.ho_va_ten}</h2>
              <div className="mt-2 flex justify-center">
                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                  user.hang_thanh_vien === 'Kim cương' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                  user.hang_thanh_vien === 'Vàng' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                  user.hang_thanh_vien === 'Bạc' ? 'bg-gray-200 text-gray-700 border border-gray-300' :
                  user.hang_thanh_vien === 'Đồng' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                  'bg-blue-50 text-blue-600 border border-blue-100'
                }`}>
                  <i className={`mr-1.5 fa-solid ${
                    user.hang_thanh_vien === 'Kim cương' ? 'fa-gem' :
                    user.hang_thanh_vien === 'Vàng' ? 'fa-crown' :
                    user.hang_thanh_vien === 'Bạc' ? 'fa-star' :
                    user.hang_thanh_vien === 'Đồng' ? 'fa-medal' :
                    'fa-user'
                  }`}></i>
                  Hạng {user.hang_thanh_vien || 'Thành viên'}
                </span>
              </div>
              <div className="mt-4 pt-4 border-t text-sm text-gray-600 space-y-2">
                <div><i className="fa-solid fa-envelope mr-2 text-orange-400" />{user.email}</div>
                {user.so_dien_thoai && <div><i className="fa-solid fa-phone mr-2 text-orange-400" />{user.so_dien_thoai}</div>}
                {user.diem_xu !== undefined && (
                  <div className="mt-3 px-4 py-2 bg-yellow-50 rounded-xl">
                    <i className="fa-solid fa-coins text-yellow-500 mr-2" />
                    <span className="font-bold text-yellow-700">{user.diem_xu || 0}</span> xu
                  </div>
                )}
              </div>
            </div>

            {/* Edit form */}
            <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Thông tin cá nhân</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { key: 'ho_va_ten', label: 'Họ và tên', type: 'text', placeholder: 'Nhập họ và tên' },
                  { key: 'email', label: 'Email', type: 'email', placeholder: 'Email', disabled: true },
                  { key: 'so_dien_thoai', label: 'Số điện thoại', type: 'tel', placeholder: '0123 456 789' },
                  { key: 'ngay_sinh', label: 'Ngày sinh', type: 'date', placeholder: '' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{f.label}</label>
                    <input type={f.type} value={user[f.key] || ''} disabled={f.disabled}
                      onChange={e => setUser(u => ({ ...u, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className={`input-modern ${f.disabled ? 'bg-gray-50 cursor-not-allowed opacity-70' : ''}`} />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">CCCD</label>
                  <input type="text" value={user.cccd || ''} onChange={e => setUser(u => ({ ...u, cccd: e.target.value }))}
                    placeholder="Số chứng minh nhân dân" className="input-modern" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={loadProfile} className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors">Huỷ</button>
                <button onClick={updateProfile}
                  className="px-6 py-2.5 rounded-xl text-white font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}>Lưu thay đổi</button>
              </div>
            </div>
          </div>
        )}

        {/* Address Tab */}
        {activeTab === 'address' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">Địa chỉ nhận hàng</h3>
              <button onClick={() => { setDiaChi({ ten_nguoi_nhan: '', so_dien_thoai: '', id_tinh_thanh: 1, id_quan_huyen: '', dia_chi: '' }); setModalType('add'); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm transition-all hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}>
                <i className="fa-solid fa-plus" />Thêm địa chỉ
              </button>
            </div>

            {listDiaChi.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
                <i className="fa-solid fa-map-location-dot text-5xl text-gray-200 mb-4 block" />
                <p className="text-gray-400 font-medium">Chưa có địa chỉ nhận hàng</p>
                <p className="text-gray-400 text-sm">Thêm địa chỉ để đặt hàng nhanh hơn!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {listDiaChi.map((dc, i) => (
                  <div key={i} className="p-4 rounded-2xl border-2 border-orange-100 bg-orange-50 flex items-start justify-between gap-4">
                    <div>
                      <div className="font-bold text-gray-800 mb-1"><i className="fa-solid fa-user mr-2 text-orange-400" />{dc.ten_nguoi_nhan}</div>
                      <div className="text-gray-600 text-sm mb-1"><i className="fa-solid fa-phone mr-2 text-orange-400" />{dc.so_dien_thoai}</div>
                      <div className="text-gray-500 text-sm"><i className="fa-solid fa-map-pin mr-2 text-orange-400" />{dc.dia_chi}, {dc.ten_quan_huyen}, {dc.ten_tinh_thanh}</div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => { setDetailDiaChi({ ...dc }); setModalType('edit'); }}
                        className="w-9 h-9 rounded-xl bg-white border border-orange-200 text-orange-500 hover:bg-orange-100 transition-colors flex items-center justify-center">
                        <i className="fa-solid fa-pen text-sm" />
                      </button>
                      <button onClick={() => { setDetailDiaChi({ ...dc }); setModalType('delete'); }}
                        className="w-9 h-9 rounded-xl bg-white border border-red-200 text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center">
                        <i className="fa-solid fa-trash text-sm" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Đổi mật khẩu</h3>
            <div className="space-y-4">
              {[
                { key: 'old_password', label: 'Mật khẩu hiện tại', placeholder: 'Nhập mật khẩu hiện tại' },
                { key: 'password', label: 'Mật khẩu mới', placeholder: 'Nhập mật khẩu mới' },
                { key: 're_password', label: 'Xác nhận mật khẩu mới', placeholder: 'Nhập lại mật khẩu mới' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{f.label}</label>
                  <input type="password" value={doiMatKhau[f.key]} onChange={e => setDoiMatKhau(d => ({ ...d, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} className="input-modern" />
                </div>
              ))}
              <button onClick={doiMatKhauSubmit}
                className="w-full py-3 rounded-xl text-white font-bold mt-2 transition-all hover:shadow-lg hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}>
                <i className="fa-solid fa-key mr-2" />Cập nhật mật khẩu
              </button>
            </div>
          </div>
        )}

        {/* Bank Account Tab (MỚI) */}
        {activeTab === 'bank' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Tài khoản nhận hoàn tiền</h3>
                <p className="text-sm text-gray-500 mt-1">Khi đơn hàng bị hủy, tiền sẽ tự động chuyển vào tài khoản mặc định của bạn.</p>
              </div>
              <button onClick={() => { setNewBank({ ten_ngan_hang: '', so_tai_khoan: '', chu_tai_khoan: '', chi_nhanh: '' }); setModalType('add-bank'); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm"
                style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}>
                <i className="fa-solid fa-plus" />Thêm tài khoản
              </button>
            </div>

            {banks.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-orange-100 rounded-2xl bg-orange-50/30">
                <i className="fa-solid fa-building-columns text-5xl text-orange-200 mb-4 block" />
                <p className="text-gray-500 font-medium">Chưa có tài khoản ngân hàng</p>
                <p className="text-gray-400 text-sm mt-1">Thêm tài khoản để nhận hoàn tiền tự động khi đơn bị hủy!</p>
                <div className="mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl inline-block text-left">
                  <p className="text-amber-700 text-xs font-medium"><i className="fa-solid fa-triangle-exclamation mr-1" />Chưa có tài khoản = không nhận được hoàn tiền tự động</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {banks.map((bank) => (
                  <div key={bank.id} className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all ${bank.is_default ? 'border-orange-300 bg-orange-50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bank.is_default ? 'bg-orange-100' : 'bg-gray-100'}`}>
                        <i className={`fa-solid fa-building-columns text-xl ${bank.is_default ? 'text-orange-500' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{bank.ten_ngan_hang}</span>
                          {bank.is_default == 1 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-600">Mặc định</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{bank.so_tai_khoan} &mdash; {bank.chu_tai_khoan}</p>
                        {bank.chi_nhanh && <p className="text-xs text-gray-400">{bank.chi_nhanh}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {bank.is_default != 1 && (
                        <button onClick={() => setDefaultBank(bank.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-orange-200 text-orange-500 hover:bg-orange-50 transition-colors">
                          Đặt mặc định
                        </button>
                      )}
                      <button onClick={() => deleteBank(bank.id)}
                        className="w-8 h-8 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 flex items-center justify-center transition-colors">
                        <i className="fa-solid fa-trash text-xs" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-blue-700 text-xs"><i className="fa-solid fa-info-circle mr-1" />Tiền hoàn sẽ được chuyển vào tài khoản <strong>mặc định</strong> trong vòng vài phút sau khi đơn bị hủy.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Address Modal */}
      {modalType === 'add' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalType(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-800">Thêm địa chỉ mới</h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark text-xl" /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'ten_nguoi_nhan', label: 'Họ và tên', type: 'text', placeholder: 'Nguyễn Văn A' },
                { key: 'so_dien_thoai', label: 'Số điện thoại', type: 'tel', placeholder: '0123456789' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{f.label}</label>
                  <input type={f.type} value={diaChi[f.key] || ''} placeholder={f.placeholder}
                    onChange={e => setDiaChi(d => ({ ...d, [f.key]: e.target.value }))} className="input-modern" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tỉnh/Thành phố</label>
                <select value={diaChi.id_tinh_thanh} onChange={e => { const id = e.target.value; setDiaChi(d => ({ ...d, id_tinh_thanh: id })); loadQuanHuyen(id); }}
                  className="input-modern">
                  {listTinhThanh.map(t => <option key={t.id} value={t.id}>{t.ten_tinh_thanh}</option>)}
                </select>
              </div>
              {diaChi.id_tinh_thanh && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Quận/Huyện</label>
                  <select value={diaChi.id_quan_huyen} onChange={e => setDiaChi(d => ({ ...d, id_quan_huyen: e.target.value }))} className="input-modern">
                    <option value="">-- Chọn quận/huyện --</option>
                    {listQuanHuyen.map(q => <option key={q.id} value={q.id}>{q.ten_quan_huyen}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Địa chỉ chi tiết</label>
                <input type="text" value={diaChi.dia_chi || ''} placeholder="Số nhà, tên đường..."
                  onChange={e => setDiaChi(d => ({ ...d, dia_chi: e.target.value }))} className="input-modern" />
              </div>

              {/* Nút geocode + GPS */}
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => geocodeFromFE(diaChi, setDiaChi)} disabled={geocoding}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all border ${
                    geocoding ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'}`}>
                  <i className={`fa-solid ${geocoding ? 'fa-spinner fa-spin' : 'fa-map-marker-alt'}`} />
                  {geocoding ? 'Đang xác định...' : 'Tìm tọa độ'}
                </button>
                <button type="button" onClick={() => useGPS(setDiaChi)} disabled={geocoding}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-all">
                  <i className="fa-solid fa-location-crosshairs" />
                  Dùng GPS
                </button>
                {diaChi.lat && (
                  <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-3 py-1.5 rounded-full font-mono">
                    <i className="fa-solid fa-check-circle mr-1" />{diaChi.lat?.toFixed(4)}, {diaChi.lng?.toFixed(4)}
                  </span>
                )}
              </div>
            </div>
            <div className="p-4 border-t flex gap-3 justify-end">
              <button onClick={() => setModalType(null)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200">Đóng</button>
              <button onClick={addDiaChi} className="px-6 py-2 rounded-xl text-white font-bold" style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}>Thêm mới</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Address Modal */}
      {modalType === 'edit' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalType(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-800">Cập nhật địa chỉ</h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark text-xl" /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'ten_nguoi_nhan', label: 'Họ và tên', type: 'text' },
                { key: 'so_dien_thoai', label: 'Số điện thoại', type: 'tel' },
                { key: 'dia_chi', label: 'Địa chỉ chi tiết', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{f.label}</label>
                  <input type={f.type} value={detailDiaChi[f.key] || ''}
                    onChange={e => setDetailDiaChi(d => ({ ...d, [f.key]: e.target.value }))} className="input-modern" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Quận/Huyện</label>
                <select value={detailDiaChi.id_quan_huyen || ''} onChange={e => setDetailDiaChi(d => ({ ...d, id_quan_huyen: e.target.value }))} className="input-modern">
                  {listQuanHuyen.map(q => <option key={q.id} value={q.id}>{q.ten_quan_huyen}</option>)}
                </select>
              </div>

              {/* Nút geocode + GPS cho form edit */}
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => geocodeFromFE(detailDiaChi, setDetailDiaChi)} disabled={geocoding}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all border ${
                    geocoding ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'}`}>
                  <i className={`fa-solid ${geocoding ? 'fa-spinner fa-spin' : 'fa-map-marker-alt'}`} />
                  {geocoding ? 'Đang xác định...' : 'Tìm tọa độ'}
                </button>
                <button type="button" onClick={() => useGPS(setDetailDiaChi)} disabled={geocoding}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-all">
                  <i className="fa-solid fa-location-crosshairs" />
                  Dùng GPS
                </button>
                {detailDiaChi.lat && (
                  <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-3 py-1.5 rounded-full font-mono">
                    <i className="fa-solid fa-check-circle mr-1" />{parseFloat(detailDiaChi.lat).toFixed(4)}, {parseFloat(detailDiaChi.lng || detailDiaChi.toa_do_y).toFixed(4)}
                  </span>
                )}
              </div>
            </div>
            <div className="p-4 border-t flex gap-3 justify-end">
              <button onClick={() => setModalType(null)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200">Đóng</button>
              <button onClick={updateDiaChi} className="px-6 py-2 rounded-xl text-white font-bold" style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Address Modal */}
      {modalType === 'delete' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalType(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <i className="fa-solid fa-trash text-red-500 text-2xl" />
              </div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">Xóa địa chỉ</h3>
              <p className="text-gray-500 text-sm">Bạn có chắc chắn muốn xóa địa chỉ <strong>{detailDiaChi.dia_chi}, {detailDiaChi.ten_quan_huyen}, {detailDiaChi.ten_tinh_thanh}</strong>?</p>
            </div>
            <div className="p-4 border-t flex gap-3 justify-center">
              <button onClick={() => setModalType(null)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200">Hủy</button>
              <button onClick={deleteDiaChi} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors">Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Bank Account Modal (MỚI) */}
      {modalType === 'add-bank' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalType(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-gray-800">Thêm tài khoản ngân hàng</h3>
                <p className="text-sm text-gray-500">Dùng để nhận hoàn tiền tự động</p>
              </div>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark text-xl" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Dropdown ngân hàng */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tên ngân hàng <span className="text-red-500">*</span></label>
                <select
                  value={newBank.ten_ngan_hang}
                  onChange={e => setNewBank(b => ({ ...b, ten_ngan_hang: e.target.value }))}
                  className="input-modern">
                  <option value="">-- Chọn ngân hàng --</option>
                  {[
                    'Vietcombank', 'VietinBank', 'BIDV', 'Agribank', 'MBBank',
                    'Techcombank', 'ACB', 'VPBank', 'HDBank', 'TPBank',
                    'Sacombank', 'VIB', 'OCB', 'SHB', 'MSB',
                    'SeABank', 'LienVietPostBank', 'BacABank', 'NCB', 'PVcomBank',
                    'Eximbank', 'NamABank', 'KienLongBank', 'PGBank', 'DongABank',
                    'BaoVietBank', 'BVBank', 'PublicBank', 'HSBC', 'Standard Chartered',
                    'Shinhan Bank', 'Woori Bank', 'UOB', 'CIMB', 'VietBank',
                  ].map(bank => <option key={bank} value={bank}>{bank}</option>)}
                </select>
              </div>

              {/* Số tài khoản */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Số tài khoản <span className="text-red-500">*</span></label>
                <input type="text" value={newBank.so_tai_khoan} placeholder="Nhập số tài khoản"
                  onChange={e => setNewBank(b => ({ ...b, so_tai_khoan: e.target.value }))}
                  className="input-modern" />
              </div>

              {/* Chủ tài khoản */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Chủ tài khoản <span className="text-red-500">*</span></label>
                <input type="text" value={newBank.chu_tai_khoan} placeholder="NGUYEN VAN A (viết hoa không dấu)"
                  onChange={e => setNewBank(b => ({ ...b, chu_tai_khoan: e.target.value.toUpperCase() }))}
                  className="input-modern" />
              </div>

              {/* Chi nhánh */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Chi nhánh (không bắt buộc)</label>
                <input type="text" value={newBank.chi_nhanh} placeholder="VD: CN Đà Nẵng"
                  onChange={e => setNewBank(b => ({ ...b, chi_nhanh: e.target.value }))}
                  className="input-modern" />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-amber-700 text-xs"><i className="fa-solid fa-triangle-exclamation mr-1" />Đảm bảo thông tin tài khoản chính xác. FoodBee không chịu trách nhiệm nếu thông tin sai.</p>
              </div>
            </div>
            <div className="p-4 border-t flex gap-3 justify-end">
              <button onClick={() => setModalType(null)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200">Đóng</button>
              <button onClick={addBank} className="px-6 py-2 rounded-xl text-white font-bold" style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}>Thêm tài khoản</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

