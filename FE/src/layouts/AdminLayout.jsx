import { useState, useEffect, useCallback } from 'react';
import { Link, NavLink, useNavigate, Outlet } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import logoFood from '../assets/logoFood.png';

const adm = (url) => api.get(url, { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` } });

// ── Hệ thống thông báo real-time admin ─────────────────────────────────────
const ALERT_CONFIG = {
  yeu_cau_huy:  { icon: 'fa-triangle-exclamation', color: 'text-red-500',    bg: 'bg-red-50 border-red-200',    label: 'Yêu cầu hủy đơn',    navTo: '/admin/reports' },
  bao_cao_moi:  { icon: 'fa-flag',                color: 'text-orange-500',  bg: 'bg-orange-50 border-orange-200', label: 'Báo cáo / khiếu nại', navTo: '/admin/reports' },
  refund_failed:{ icon: 'fa-rotate-left',          color: 'text-rose-500',    bg: 'bg-rose-50 border-rose-200',  label: 'Hoàn tiền thất bại',  navTo: '/admin/rut-tien' },
};

// Global event bus — các tab admin subscribe để biết khi nào cần reload
const adminEventBus = {
  _listeners: {},
  on(event, fn)  { if (!this._listeners[event]) this._listeners[event] = []; this._listeners[event].push(fn); },
  off(event, fn) { this._listeners[event] = (this._listeners[event] || []).filter(f => f !== fn); },
  emit(event, data) { (this._listeners[event] || []).forEach(fn => fn(data)); },
};
export { adminEventBus };

function AdminAlertPanel({ alerts, onClear, onClearAll, onNavigate }) {
  if (alerts.length === 0) return null;
  return (
    <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <span className="font-bold text-gray-800 text-sm flex items-center gap-2">
          <i className="fa-solid fa-bell text-red-500"/>Cảnh báo Admin
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{alerts.length}</span>
        </span>
        <button onClick={onClearAll} className="text-xs text-gray-400 hover:text-gray-600">Xóa tất cả</button>
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
        {alerts.map((a, i) => {
          const cfg = ALERT_CONFIG[a.loai] || ALERT_CONFIG['bao_cao_moi'];
          return (
            <div key={i} onClick={() => { onNavigate(cfg.navTo, a.loai); onClear(i); }}
              className={`px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-start gap-3`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.bg}`}>
                <i className={`fa-solid ${cfg.icon} ${cfg.color} text-sm`}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-700">{cfg.label}</div>
                {a.data?.nguoi_gui && <div className="text-xs text-gray-500 truncate">{a.data.nguoi_gui}</div>}
                {a.data?.ma_don_hang && <div className="text-xs text-gray-400">Đơn: <span className="font-semibold text-gray-600">#{a.data.ma_don_hang}</span></div>}
                {a.data?.ly_do && <div className="text-xs text-red-500 truncate">{a.data.ly_do}</div>}
                <div className="text-[10px] text-gray-300 mt-0.5">{new Date(a.time).toLocaleTimeString('vi-VN')}</div>
              </div>
              <button onClick={e => { e.stopPropagation(); onClear(i); }} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
                <i className="fa-solid fa-xmark text-xs"/>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const [sideOpen, setSideOpen] = useState(true);
  const [admin, setAdmin] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('nhan_vien_login');
    if (!token) { navigate('/admin/dang-nhap'); return; }
    adm('/api/admin/profile').then(r => { if (r.data.status) setAdmin(r.data.data); }).catch(() => {});
  }, []);

  // ── Setup real-time admin-alerts channel ──────────────────────────────────
  useEffect(() => {
    let channel = null;
    let isCancelled = false;

    const setup = async () => {
      try {
        const { default: echo } = await import('../utils/echo');
        if (isCancelled) return;

        // Public channel — không cần auth token
        channel = echo.channel('admin-alerts');
        channel.listen('.admin.alert', (payload) => {
          if (isCancelled) return;
          const { loai, data, time } = payload;
          const cfg = ALERT_CONFIG[loai] || ALERT_CONFIG['bao_cao_moi'];

          // Show toast ngay lập tức
          const toastMsg = loai === 'yeu_cau_huy'
            ? `🚨 Yêu cầu hủy đơn từ ${data?.nguoi_gui || 'người dùng'}!`
            : loai === 'refund_failed'
            ? `⚠️ Hoàn tiền thất bại: Đơn #${data?.ma_don_hang || ''}`
            : `📋 Báo cáo mới từ ${data?.nguoi_gui || 'người dùng'}`;

          toast(toastMsg, {
            icon: loai === 'yeu_cau_huy' ? '🚨' : loai === 'refund_failed' ? '⚠️' : '📋',
            duration: 8000,
            style: {
              background: loai === 'yeu_cau_huy' ? '#fef2f2' : loai === 'refund_failed' ? '#fff1f2' : '#fffbeb',
              border: `1px solid ${loai === 'yeu_cau_huy' ? '#fecaca' : loai === 'refund_failed' ? '#fecdd3' : '#fde68a'}`,
              color: '#1f2937',
              fontWeight: '600',
              cursor: 'pointer',
            },
            onClick: () => navigate(cfg.navTo),
          });

          // Thêm vào panel alerts
          setAlerts(prev => [{ loai, data, time }, ...prev].slice(0, 20));
          setShowAlerts(true);

          // Emit event cho các trang admin reload data
          adminEventBus.emit('admin_alert', { loai, data });
          if (loai === 'yeu_cau_huy' || loai === 'bao_cao_moi') {
            adminEventBus.emit('reload_reports', { loai, data });
          }
          if (loai === 'refund_failed') {
            adminEventBus.emit('reload_refunds', { data });
          }
        });
      } catch (e) {
        console.error('[AdminLayout] Echo setup error:', e);
      }
    };

    setup();
    return () => {
      isCancelled = true;
      try { if (channel) channel.stopListening('.admin.alert'); } catch {}
    };
  }, []);
  // ──────────────────────────────────────────────────────────────────────────

  const logout = () => {
    localStorage.removeItem('nhan_vien_login');
    toast.success('Đã đăng xuất!');
    navigate('/admin/dang-nhap');
  };

  const handleAlertNavigate = (navTo, loai) => {
    navigate(navTo);
    setShowAlerts(false);
  };
// hihihi
  const NAV = [
    { to: '/admin/dashboard', icon: 'fa-gauge-high', label: 'Dashboard' },
    { to: '/admin/khach-hang', icon: 'fa-users', label: 'Khách Hàng' },
    { to: '/admin/quan-an', icon: 'fa-store', label: 'Quán Ăn' },
    { to: '/admin/shipper', icon: 'fa-motorcycle', label: 'Shipper' },
    { to: '/admin/don-hang', icon: 'fa-bag-shopping', label: 'Đơn Đặt' },
    { to: '/admin/thong-tin-don-hang', icon: 'fa-file-invoice-dollar', label: 'TT Đơn Hàng' },
    { to: '/admin/mon-an', icon: 'fa-bowl-food', label: 'Món Ăn' },
    { to: '/admin/danh-muc', icon: 'fa-tags', label: 'Danh Mục' },
    { to: '/admin/client-menu', icon: 'fa-list', label: 'Menu Giao Diện' },
    { to: '/admin/voucher', icon: 'fa-ticket', label: 'Voucher' },
    { to: '/admin/rut-tien', icon: 'fa-money-bill-transfer', label: 'Ví Tài Chính' },
    { to: '/admin/nhan-vien', icon: 'fa-user-tie', label: 'Nhân Viên' },
    { to: '/admin/phan-quyen', icon: 'fa-shield-halved', label: 'Phân Quyền' },
    { to: '/admin/thong-ke', icon: 'fa-chart-line', label: 'Thống Kê' },
    { to: '/admin/cau-hinh-he-thong', icon: 'fa-gears', label: 'Cấu Hình Nền Tảng' },
    { to: '/admin/reports', icon: 'fa-flag', label: 'Báo Cáo / Khiếu Nại' },
    { to: '/admin/danh-gia', icon: 'fa-star', label: 'Đánh Giá' },
    { to: '/admin/thong-bao', icon: 'fa-bullhorn', label: 'Gửi Thông Báo' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`flex-shrink-0 flex flex-col transition-all duration-300 z-30 ${sideOpen ? 'w-64' : 'w-16'}`}
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f3460 100%)' }}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          {sideOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                <img src={logoFood} className="w-full h-full object-contain drop-shadow" alt="Logo" />
              </div>
              <span className="font-extrabold text-white text-base">FoodBee Admin</span>
            </div>
          )}
          {!sideOpen && <div className="w-8 h-8 flex items-center justify-center mx-auto">
            <img src={logoFood} className="w-full h-full object-contain drop-shadow" alt="Logo" />
          </div>}
          <button onClick={() => setSideOpen(!sideOpen)} className="text-white/50 hover:text-white ml-auto transition-colors p-1 rounded">
            <i className={`fa-solid ${sideOpen ? 'fa-angles-left' : 'fa-angles-right'} text-xs`} />
          </button>
        </div>

        {/* Admin info */}
        {sideOpen && (
          <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
            <img src={admin.avatar || logoFood}
              alt="" className="w-10 h-10 rounded-full object-contain flex-shrink-0 ring-2 ring-red-500/50 bg-white p-1" />
            <div className="min-w-0">
              <div className="font-bold text-white text-sm truncate">{admin.ho_va_ten || 'Admin'}</div>
              <div className="text-white/40 text-xs truncate">{admin.email || ''}</div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive
                  ? 'bg-white/15 text-white shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
                }`
              }>
              <i className={`fa-solid ${item.icon} w-4 text-center flex-shrink-0`} />
              {sideOpen && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-white/10 space-y-1">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/8 text-sm font-semibold transition-colors">
            <i className="fa-solid fa-house w-4 text-center flex-shrink-0" />
            {sideOpen && <span>Trang chủ</span>}
          </Link>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-300 hover:bg-red-500/15 text-sm font-semibold transition-colors">
            <i className="fa-solid fa-right-from-bracket w-4 text-center flex-shrink-0" />
            {sideOpen && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <i className="fa-solid fa-house" />
            <i className="fa-solid fa-chevron-right text-xs" />
            <span className="font-semibold text-gray-800">Admin Dashboard</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Alert Bell */}
            <div className="relative">
              <button
                onClick={() => setShowAlerts(v => !v)}
                className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
                title="Cảnh báo Admin"
              >
                <i className={`fa-solid fa-bell text-xl ${alerts.length > 0 ? 'text-red-500' : 'text-gray-400'}`}/>
                {alerts.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full border border-white animate-bounce">
                    {alerts.length > 9 ? '9+' : alerts.length}
                  </span>
                )}
              </button>
              {showAlerts && (
                <AdminAlertPanel
                  alerts={alerts}
                  onClear={(i) => setAlerts(prev => prev.filter((_, idx) => idx !== i))}
                  onClearAll={() => { setAlerts([]); setShowAlerts(false); }}
                  onNavigate={handleAlertNavigate}
                />
              )}
            </div>

            {/* Admin profile */}
            <Link to="/admin/profile" className="flex items-center gap-3 hover:bg-gray-100 p-1.5 rounded-xl transition-colors cursor-pointer">
              <div className="text-xs text-gray-400">Xin chào, <b className="text-gray-700">{admin.ho_va_ten || 'Admin'}</b></div>
              <img src={admin.avatar || logoFood}
                alt="" className="w-8 h-8 rounded-full object-contain ring-2 ring-red-100 bg-white p-0.5" />
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <Outlet />
        </main>
      </div>

      {/* Click outside to close alerts */}
      {showAlerts && <div className="fixed inset-0 z-40" onClick={() => setShowAlerts(false)}/>}
    </div>
  );
}
