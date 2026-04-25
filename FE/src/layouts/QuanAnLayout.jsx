import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { rtToast } from '../components/RealtimeToast';
import logoFood from '../assets/logoFood.png';
import NotificationBell from '../components/NotificationBell';

export default function QuanAnLayout() {
  const [quanAn, setQuanAn] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const token = localStorage.getItem('quan_an_login');
  if (!token) return <Navigate to="/quan-an/dang-nhap" replace />;

  useEffect(() => {
    api.get('/api/quan-an/data-login', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (res.data.status) setQuanAn(res.data.data); })
      .catch(err => { if (err?.response?.status === 401) { localStorage.removeItem('quan_an_login'); navigate('/quan-an/dang-nhap'); } });
  }, []);

  // ─── Global real-time: new order notification from ANY page ───────────────
  useEffect(() => {
    if (!token || !quanAn.id) return;
    let channel = null;
    let onNewOrder = null;
    let onOrderCancelled = null;
    let isCancelled = false;
    // Dedup: chặn fire duplicate events (React StrictMode double-invoke)
    const firedKeys = new Set();

    const setup = async () => {
      try {
        const { default: echo, updateEchoToken } = await import('../utils/echo');
        if (isCancelled) return;
        updateEchoToken();
        channel = echo.private(`quan-an.${quanAn.id}`);

        // Đơn hàng mới (chỉ hiện toast nếu không đang ở trang đơn hàng)
        onNewOrder = (data) => {
          if (isCancelled) return;
          if (window.location.pathname.startsWith('/quan-an/don-hang')) return;
          const dh = data.don_hang || data || {};
          rtToast.show({
            type: 'order',
            title: 'Có đơn hàng mới!',
            message: `Đơn #${dh.ma_don_hang || ''} đang chờ quán xác nhận. Bấm để xử lý!`,
            orderCode: dh.ma_don_hang,
            duration: 8000,
            onClick: () => navigate('/quan-an/don-hang')
          });
          navigate('/quan-an/don-hang');
        };
        channel.listen('.don-hang.moi', onNewOrder);

        // Đơn hàng bị hủy (admin duyệt) - hiện toast LUÔN, bất kể trang nào
        onOrderCancelled = (data) => {
          if (isCancelled) return;
          const dh = data.don_hang || data || {};
          const key = `huy-${dh.id || dh.ma_don_hang}`;
          if (firedKeys.has(key)) return; // Dedup: chỉ show 1 lần
          firedKeys.add(key);
          setTimeout(() => firedKeys.delete(key), 5000);
          rtToast.show({
            type: 'cancel',
            title: 'Đơn hàng đã bị hủy!',
            message: `Đơn #${dh.ma_don_hang || ''} đã được admin duyệt hủy.`,
            orderCode: dh.ma_don_hang,
            duration: 8000,
            onClick: () => navigate('/quan-an/don-hang'),
          });
        };
        channel.listen('.don-hang.da-huy', onOrderCancelled);
      } catch { }
    };

    setup();
    return () => {
      isCancelled = true;
      if (channel && onNewOrder) {
        try { channel.stopListening('.don-hang.moi', onNewOrder); } catch { }
      }
      if (channel && onOrderCancelled) {
        try { channel.stopListening('.don-hang.da-huy', onOrderCancelled); } catch { }
      }
    };
  }, [quanAn.id]); // Chỉ re-run khi quanAn.id thay đổi, KHÔNG phụ thuộc location.pathname
  // ─────────────────────────────────────────────────────────────────────────

  const logout = () => {
    localStorage.removeItem('quan_an_login');
    toast.success('Đã đăng xuất!');
    navigate('/quan-an/dang-nhap');
  };

  const links = [
    { path: '/quan-an/profile', icon: 'fa-store', label: 'Thông tin cá nhân' },
    { path: '/quan-an/cau-hinh', icon: 'fa-map-location-dot', label: 'Cấu hình quán ăn' },
    { path: '/quan-an/don-hang', icon: 'fa-bag-shopping', label: 'Đơn hàng' },
    { path: '/quan-an/mon-an', icon: 'fa-bowl-food', label: 'Món ăn' },
    { path: '/quan-an/danh-muc', icon: 'fa-tags', label: 'Danh mục' },
    { path: '/quan-an/voucher', icon: 'fa-ticket', label: 'Voucher' },
    { path: '/quan-an/thong-ke/doanh-thu', icon: 'fa-chart-line', label: 'Thống kê doanh thu' },
    { path: '/quan-an/thong-ke/mon-an', icon: 'fa-chart-pie', label: 'Thống kê món ăn' },
    { path: '/quan-an/vi-tien', icon: 'fa-wallet', label: 'Ví tiền' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-blue-900 text-white shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:flex lg:flex-col`}>
        {/* Brand */}
        <div className="p-5 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1">
              <img src={logoFood} className="w-full h-full object-contain drop-shadow" alt="Logo" />
            </div>
            <div>
              <div className="font-bold text-sm">FoodBee</div>
              <div className="text-blue-300 text-xs">Cổng Quán Ăn</div>
            </div>
          </div>
        </div>

        {/* Profile */}
        <div className="p-4 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <img src={quanAn.hinh_anh || logoFood}
              alt="" className="w-12 h-12 rounded-xl object-contain flex-shrink-0 bg-white p-1" />
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{quanAn.ten_quan_an || 'Quán ăn'}</div>
              <div className="text-blue-300 text-xs truncate">{quanAn.email}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map(l => (
            <Link key={l.path} to={l.path} onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${location.pathname.startsWith(l.path) ? 'bg-blue-700 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`}>
              <i className={`fa-solid ${l.icon} w-5 text-center`} />{l.label}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-blue-800">
          <Link to="/" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-blue-200 hover:bg-blue-800 hover:text-white transition-all mb-1">
            <i className="fa-solid fa-house w-5 text-center" />Trang khách hàng
          </Link>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-all">
            <i className="fa-solid fa-right-from-bracket w-5 text-center" />Đăng xuất
          </button>
        </div>
      </aside>

      {/* Overlay on mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="bg-white shadow-sm sticky top-0 z-30 px-4 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-gray-600 hover:text-gray-800">
            <i className="fa-solid fa-bars text-xl" />
          </button>
          <div className="font-semibold text-gray-700 capitalize">
            {links.find(l => location.pathname.startsWith(l.path))?.label || 'Dashboard'}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell userType="quan_an" userId={quanAn?.id} token={token} />
            <span className="text-sm text-gray-500 hidden md:block">{quanAn.ten_quan_an}</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
