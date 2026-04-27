import { Outlet, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { rtToast } from '../components/RealtimeToast';
import logoFood from '../assets/logoFood.png';
import ChatBox from '../components/ChatBox';
import NotificationBell from '../components/NotificationBell';

export default function ShipperLayout({ children }) {
  const [shipper, setShipper] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [chatOrder, setChatOrder] = useState(null);

  const token = localStorage.getItem('shipper_login');
  if (!token) return <Navigate to="/shipper/dang-nhap" replace />;

  useEffect(() => {
    api.get('/api/shipper/data-login', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (res.data.status) setShipper(res.data.data); })
      .catch(err => { if (err?.response?.status === 401) { localStorage.removeItem('shipper_login'); navigate('/shipper/dang-nhap'); } });
  }, []);

  // ─── Global real-time: new order notification from ANY page ───────────────
  useEffect(() => {
    if (!token) return;
    let channel = null;
    let onNewOrder = null;
    let isCancelled = false;

    const setup = async () => {
      try {
        const { default: echo, updateEchoToken } = await import('../utils/echo');
        if (isCancelled) return;
        updateEchoToken();
        channel = echo.private('all-shippers');
        onNewOrder = (data) => {
          if (window.location.pathname.startsWith('/shipper/don-hang')) return;
          const dh = data.don_hang || data || {};
          rtToast.show({
            type: 'order',
            title: 'Có đơn hàng mới!',
            message: `Đơn #${dh.ma_don_hang || ''} cần được giao. Bấm để nhận!`,
            orderCode: dh.ma_don_hang,
            duration: 8000,
            onClick: () => navigate('/shipper/don-hang')
          });
          navigate('/shipper/don-hang');
        };
        channel.listen('.don-hang.moi', onNewOrder);
      } catch { }
    };

    setup();
    return () => {
      isCancelled = true;
      if (channel && onNewOrder) {
        try { channel.stopListening('.don-hang.moi', onNewOrder); } catch { }
      }
    };
  }, [location.pathname]);

  // ─── Global real-time chat for Shipper ──────────────────────────────────
  useEffect(() => {
    if (!shipper?.id) return;
    let channel = null;
    let isCancelled = false;

    const setupChat = async () => {
      try {
        const { default: echo, updateEchoToken } = await import('../utils/echo');
        if (isCancelled) return;
        updateEchoToken();
        channel = echo.private(`shipper.${shipper.id}`);
        channel.listen('.tin-nhan.moi', (data) => {
          const msg = data.tin_nhan;
          // Chỉ mở tự động nếu người gửi là khách hàng
          if (msg.loai_nguoi_gui === 'khach_hang') {
            setChatOrder(prev => {
              if (prev?.id === msg.id_don_hang) return prev;
              return { id: msg.id_don_hang, ten_nguoi_nhan: 'Khách hàng' };
            });
          }
        });

        // Lắng nghe khi đơn hàng bị hủy bởi admin
        channel.listen('.don-hang.da-huy', (data) => {
          const dh = data.don_hang || data || {};
          rtToast.show({
            type: 'cancel',
            title: 'Đơn hàng đã bị hủy!',
            message: `Đơn #${dh.ma_don_hang || ''} đã bị admin hủy theo yêu cầu khách hàng.`,
            orderCode: dh.ma_don_hang,
            duration: 8000,
            onClick: () => navigate('/shipper/don-hang'),
          });
        });
      } catch { }
    };

    setupChat();
    return () => {
      isCancelled = true;
      if (channel) {
        try { channel.stopListening('.tin-nhan.moi'); } catch { }
        try { channel.stopListening('.don-hang.da-huy'); } catch { }
      }
    };
  }, [shipper?.id]);
  // ─────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  const logout = () => {
    localStorage.removeItem('shipper_login');
    toast.success('Đã đăng xuất!');
    navigate('/shipper/dang-nhap');
  };

  const links = [
    { path: '/shipper/don-hang', icon: 'fa-box', label: 'Quản Lý Đơn Hàng' },
    { path: '/shipper/vi-tri-hien-tai', icon: 'fa-location-crosshairs', label: 'Vị Trí Hiện Tại' },
    { path: '/shipper/vi-tien', icon: 'fa-wallet', label: 'Ví Tiền' },
    { path: '/shipper/thong-ke', icon: 'fa-chart-column', label: 'Thống Kê' },
    { path: '/shipper/profile', icon: 'fa-user', label: 'Cá Nhân' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:flex lg:flex-col`}>
        {/* Brand */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1 shadow-lg shadow-orange-500/30">
              <img src={logoFood} className="w-full h-full object-contain drop-shadow" alt="Logo" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide">FoodBee</div>
              <div className="text-slate-400 text-xs font-medium">Đối Tác Giao Hàng</div>
            </div>
          </div>
        </div>

        {/* Profile */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img src={shipper.avatar || logoFood}
              alt="" className="w-12 h-12 rounded-xl object-contain flex-shrink-0 border-2 border-slate-700 bg-white p-1" />
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{shipper.ho_va_ten || 'Shipper'}</div>
              <div className="text-slate-400 text-xs truncate">{shipper.so_dien_thoai}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map(l => {
            const active = location.pathname.startsWith(l.path);
            return (
              <Link key={l.path} to={l.path} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <i className={`fa-solid ${l.icon} w-5 text-center ${active ? 'text-white' : 'text-slate-400'}`} />
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-slate-800">
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all">
            <i className="fa-solid fa-right-from-bracket w-5 text-center" />Đăng xuất
          </button>
        </div>
      </aside>

      {/* Overlay on mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main Container */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 z-30 px-4 h-16 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-10 h-10 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors">
              <i className="fa-solid fa-bars" />
            </button>
            <div className="font-bold text-gray-800 text-lg hidden sm:block">
              {links.find(l => location.pathname.startsWith(l.path))?.label || 'Dashboard'}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell userType="shipper" userId={shipper?.id} token={token} />
            <Link to="/" className="w-10 h-10 rounded-xl bg-gray-50 text-gray-600 hover:bg-orange-50 hover:text-orange-600 flex items-center justify-center transition-colors shadow-sm" title="Về trang khách">
              <i className="fa-solid fa-house" />
            </Link>
            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right">
                <div className="text-sm font-bold text-gray-800">{shipper.ho_va_ten || 'Shipper'}</div>
                <div className="text-xs text-gray-500 font-medium">Online</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50 relative">
          {children || <Outlet />}
        </main>

        {chatOrder && (
          <ChatBox
            orderId={chatOrder.id}
            currentUserType="shipper"
            onClose={() => setChatOrder(null)}
            otherPartyName={chatOrder.ten_nguoi_nhan || 'Khách hàng'}
          />
        )}
      </div>
    </div>
  );
}
