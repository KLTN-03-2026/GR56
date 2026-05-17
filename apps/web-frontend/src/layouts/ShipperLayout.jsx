import { Outlet, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { rtToast } from '../components/RealtimeToast';
import logoFood from '../assets/logoFood.png';
import ChatBox from '../components/ChatBox';
import NotificationBell from '../components/NotificationBell';

export default function ShipperLayout({ children }) {
  const token = localStorage.getItem('shipper_login');
  if (!token) return <Navigate to="/shipper/dang-nhap" replace />;

  const [shipper, setShipper] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [chatOrder, setChatOrder] = useState(null);

  useEffect(() => {
    api.get('/api/shipper/data-login', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { 
        if (res.data.status) {
          setShipper(res.data.data); 
          localStorage.setItem('shipper_is_open', res.data.data.is_open);
        }
      })
      .catch(err => { if (err?.response?.status === 401) { localStorage.removeItem('shipper_login'); navigate('/shipper/dang-nhap'); } });
  }, []);

  useEffect(() => {
    document.title = "FOODBEE-SHIPPER";
  }, []);

  // ─── Global real-time: new order notification (đơn được gửi cho MÌNH) ───
  useEffect(() => {
    if (!shipper?.id) return;  // Chờ shipper.id load xong mới subscribe
    let channel = null;
    let onNewOrder = null;
    let isCancelled = false;

    const setup = async () => {
      try {
        const { getEchoInstance } = await import('../utils/echo');
        if (isCancelled) return;
        const echoToken = localStorage.getItem('shipper_login') || '';
        const echo = getEchoInstance('shipper', echoToken);
        if (!echo) return;
        // Lắng nghe kênh cá nhân — chỉ TÔI nhận được đơn này
        channel = echo.private(`shipper.${shipper.id}`);
        onNewOrder = (data) => {
          const isOpen = localStorage.getItem('shipper_is_open');
          if (isOpen == '0') return;

          const order = data.order || data || {};
          console.log('[Echo] dispatch.candidate (personal) received:', data);
          rtToast.show({
            type: 'order',
            title: '🛵 Có đơn hàng mới cho bạn!',
            message: `Đơn #${order.ma_don_hang || data.ma_don_hang || ''} đang chờ bạn nhận. Bấm để xem!`,
            orderCode: order.ma_don_hang || data.ma_don_hang,
            duration: 10000,
            onClick: () => navigate('/shipper/don-hang'),
          });

          if (!window.location.pathname.startsWith('/shipper/don-hang')) {
            navigate('/shipper/don-hang');
          }
        };
        channel.listen('.dispatch.candidate', onNewOrder);
      } catch (e) { console.error(e); }
    };

    setup();
    return () => {
      isCancelled = true;
      if (channel && onNewOrder) {
        try { channel.stopListening('.dispatch.candidate', onNewOrder); } catch (e) { console.error(e); }
      }
    };
  }, [shipper?.id]);  // Re-subscribe khi shipper.id thay đổi

  // ─── Global real-time chat for Shipper ──────────────────────────────────
  useEffect(() => {
    if (!shipper?.id) return;
    let channel = null;
    let isCancelled = false;

    const setupChat = async () => {
      try {
        const { getEchoInstance } = await import('../utils/echo');
        if (isCancelled) return;
        const echoToken = localStorage.getItem('shipper_login') || '';
        const echo = getEchoInstance('shipper', echoToken);
        if (!echo) return;
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

        // Quán đang chế biến — tinh_trang = 2
        channel.listen('.don-hang.dang-lam', (data) => {
          const dh = data.don_hang || data || {};
          rtToast.show({
            type: 'order',
            title: '🍳 Quán đã nhận đơn!',
            message: `Quán đang chuẩn bị đơn #${dh.ma_don_hang || ''}. Bạn có thể đến lấy hàng.`,
            orderCode: dh.ma_don_hang,
            duration: 8000,
            onClick: () => navigate('/shipper/don-hang'),
          });
        });

        // Quán chuẩn bị xong — tinh_trang = 3
        channel.listen('.don-hang.da-xong', (data) => {
          const dh = data.don_hang || data || {};
          rtToast.show({
            type: 'order',
            title: '✅ Quán đã xong! Đến lấy hàng ngay',
            message: `Đơn #${dh.ma_don_hang || ''} đã sẵn sàng. Hãy đến lấy ngay!`,
            orderCode: dh.ma_don_hang,
            duration: 8000,
            onClick: () => navigate('/shipper/don-hang'),
          });
        });

        // Giao hàng thành công — tinh_trang = 4
        channel.listen('.don-hang.hoan-thanh', (data) => {
          const dh = data.don_hang || data || {};
          rtToast.show({
            type: 'success',
            title: '🎉 Giao hàng thành công!',
            message: `Đơn #${dh.ma_don_hang || ''} đã được giao.`,
            orderCode: dh.ma_don_hang,
            duration: 6000,
          });
        });
      } catch (e) { console.error(e); }
    };

    setupChat();
    return () => {
      isCancelled = true;
      if (channel) {
        try { channel.stopListening('.tin-nhan.moi'); } catch (e) { console.error(e); }
        try { channel.stopListening('.don-hang.da-huy'); } catch (e) { console.error(e); }
        try { channel.stopListening('.don-hang.dang-lam'); } catch (e) { console.error(e); }
        try { channel.stopListening('.don-hang.da-xong'); } catch (e) { console.error(e); }
        try { channel.stopListening('.don-hang.hoan-thanh'); } catch (e) { console.error(e); }
      }
    };
  }, [shipper?.id]);
  // ─────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  const toggleStatus = async () => {
    try {
      const res = await api.post('/api/shipper/toggle-status', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.status) {
        setShipper(prev => ({ ...prev, is_open: res.data.is_open }));
        localStorage.setItem('shipper_is_open', res.data.is_open);
        toast.success(res.data.message);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error('Có lỗi xảy ra khi cập nhật trạng thái');
    }
  };

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
    { path: '/shipper/bao-cao', icon: 'fa-triangle-exclamation', label: 'Báo Cáo Sự Cố' },
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
            <div className="flex items-center gap-3 mr-2">
              <span className={`text-sm font-medium ${shipper.is_open ? 'text-green-600' : 'text-gray-500'} hidden sm:block`}>
                {shipper.is_open ? 'Sẵn sàng' : 'Nghỉ'}
              </span>
              <button
                onClick={toggleStatus}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${shipper.is_open ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${shipper.is_open ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <NotificationBell userType="shipper" userId={shipper?.id} token={token} />
            <Link to="/" className="w-10 h-10 rounded-xl bg-gray-50 text-gray-600 hover:bg-orange-50 hover:text-orange-600 flex items-center justify-center transition-colors shadow-sm" title="Về trang khách">
              <i className="fa-solid fa-house" />
            </Link>
            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right">
                <div className="text-sm font-bold text-gray-800">{shipper.ho_va_ten || 'Shipper'}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50 relative">
          {shipper.is_open === 0 && location.pathname !== '/shipper/profile' && location.pathname !== '/shipper/vi-tien' && location.pathname !== '/shipper/bao-cao' ? (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                <div className="p-6 bg-white rounded-2xl shadow-xl text-center max-w-sm border border-orange-100">
                   <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                     <i className="fa-solid fa-power-off"></i>
                   </div>
                   <h3 className="text-xl font-bold text-gray-800 mb-2">Bạn đang ngoại tuyến</h3>
                   <p className="text-gray-500 mb-6 text-sm">Vui lòng bật hoạt động để có thể nhận đơn hàng mới và sử dụng các tính năng giao hàng.</p>
                   <button onClick={toggleStatus} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors">
                     Bật Hoạt Động Ngay
                   </button>
                </div>
             </div>
          ) : null}
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
