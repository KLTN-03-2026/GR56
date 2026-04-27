import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { rtToast } from '../../components/RealtimeToast';
import { useAuth } from '../../context/AuthContext';
import { formatVND } from '../../utils/helpers';
import OrderTracking from '../../components/OrderTracking';
import ChatBox from '../../components/ChatBox';

const STATUS_MAP = {
  0: { label: 'Chờ shipper', color: 'bg-gray-100 text-gray-500', icon: 'fa-user-clock' },
  1: { label: 'Chờ quán nhận', color: 'bg-yellow-100 text-yellow-800', icon: 'fa-bell' },
  2: { label: 'Đang nấu', color: 'bg-orange-100 text-orange-800', icon: 'fa-fire-burner' },
  3: { label: 'Đang giao', color: 'bg-blue-100 text-blue-800', icon: 'fa-motorcycle' },
  4: { label: 'Hoàn tất', color: 'bg-green-100 text-green-800', icon: 'fa-circle-check' },
  5: { label: 'Đã hủy', color: 'bg-red-100 text-red-800', icon: 'fa-circle-xmark' },
};

const TABS = [
  { key: '', label: 'Tất cả' },
  { key: '1', label: 'Chờ quán nhận' },
  { key: '2', label: 'Đang nấu' },
  { key: '3', label: 'Đang giao' },
  { key: '4', label: 'Hoàn tất' },
  { key: '5', label: 'Đã hủy' },
];

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)}>
          <i className={`fa-star text-2xl ${s <= value ? 'fa-solid text-yellow-400' : 'fa-regular text-gray-300'}`} />
        </button>
      ))}
    </div>
  );
}

export default function DonHang() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modal, setModal] = useState(null); // 'detail' | 'payment' | 'rating' | 'payos'
  const [rating, setRating] = useState({ sao_quan_an: 5, nhan_xet_quan_an: '', sao_shipper: 5, nhan_xet_shipper: '' });
  const [payosLoading, setPayosLoading] = useState(false);
  const [payosData, setPayosData] = useState(null);
  const [chatOrder, setChatOrder] = useState(null);
  const [detailTab, setDetailTab] = useState('info'); // 'info' | 'map'
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [mapUnlocked, setMapUnlocked] = useState(false);
  const trackPollRef = useRef(null);
  const [reportOrder, setReportOrder] = useState(null);
  const [reportForm, setReportForm] = useState({ tieu_de: '', noi_dung: '', hinh_anh: null, yeu_cau_huy: false, ly_do_huy: '' });
  const [reportLoading, setReportLoading] = useState(false);
  const [checkingBank, setCheckingBank] = useState(false);

  useEffect(() => {
    // Nếu navigate từ trang đặt hàng kèm tab, áp dụng ngay
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }

    let unmountEcho = null;
    loadOrders(true).then(cleanup => {
       if (typeof cleanup === 'function') unmountEcho = cleanup;
    });
    return () => {
       if (unmountEcho) unmountEcho();
    };
  }, []);

  const loadOrders = async (fromMount = false) => {
    if (fromMount) setLoading(true); // Chỉ hiện spinner lần đầu
    let cleanupFunc = null;
    try {
      const res = await api.get('/api/khach-hang/don-hang/data');
      setOrders(res.data.data || []);
      
      // Realtime setup ONLY on initial load
      if (fromMount === true) {
        if (res.data.id_khach_hang) {
          cleanupFunc = await setupRealtime(res.data.id_khach_hang);
        } else {
          const userRes = await api.get('/api/khach-hang/data-login');
          if (userRes.data?.data?.id) cleanupFunc = await setupRealtime(userRes.data.data.id);
        }
      }
    } catch { if (fromMount) toast.error('Không thể tải đơn hàng!'); }
    finally { if (fromMount) setLoading(false); }
    return cleanupFunc;
  };

  const setupRealtime = async (userId) => {
     const { default: echo, updateEchoToken } = await import('../../utils/echo');
     updateEchoToken();
     
     const channelName = `khach-hang.${userId}`;
     const channel = echo.private(channelName);
     
     // ClientLayout đã xử lý toast toàn cục - ở đây chỉ cần update UI
     const h1 = () => { setActiveTab('1'); setTimeout(() => loadOrders(false), 500); };
     const h2 = () => { setActiveTab('2'); setTimeout(() => loadOrders(false), 500); };
     const h3 = () => { setActiveTab('3'); setTimeout(() => loadOrders(false), 500); };
     const h4 = () => { setActiveTab('4'); setTimeout(() => loadOrders(false), 500); };
     const h5 = () => { setActiveTab('5'); setTimeout(() => loadOrders(false), 500); };
     channel.listen('.don-hang.da-nhan', h1);
     channel.listen('.don-hang.dang-lam', h2);
     channel.listen('.don-hang.da-xong', h3);
     channel.listen('.don-hang.hoan-thanh', h4);
     channel.listen('.don-hang.da-huy', h5);

     // KHÔNG echo.leave() - chỉ stopListening để giữ channel cho ClientLayout/NotificationBell
     return () => {
       try { channel.stopListening('.don-hang.da-nhan', h1); } catch {}
       try { channel.stopListening('.don-hang.dang-lam', h2); } catch {}
       try { channel.stopListening('.don-hang.da-xong', h3); } catch {}
       try { channel.stopListening('.don-hang.hoan-thanh', h4); } catch {}
       try { channel.stopListening('.don-hang.da-huy', h5); } catch {}
     };
  };

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q || [o.ma_don_hang, o.ten_quan_an, o.ho_va_ten_shipper, o.ten_nguoi_nhan, o.so_dien_thoai]
      .some(v => String(v || '').toLowerCase().includes(q));
    const matchTab = activeTab === '' || String(o.tinh_trang) === activeTab;
    return matchSearch && matchTab;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentOrders = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when tab or search changes
  useEffect(() => { setCurrentPage(1); }, [activeTab, search]);

  const openDetail = async (order) => {
    setSelectedOrder(order);
    setDetailLoading(true);
    setModal('detail');
    setDetailTab('info');
    setTrackingData(null);
    setMapUnlocked(false);
    if (trackPollRef.current) clearInterval(trackPollRef.current);
    try {
      const res = await api.post('/api/khach-hang/don-hang/data-chi-tiet', order);
      if (res.data.status) { setOrderDetail(res.data.don_hang); setOrderItems(res.data.chi_tiet_mon_an || []); }
    } catch { toast.error('Không thể tải chi tiết!'); }
    finally { setDetailLoading(false); }
  };

  const openPayment = async (order) => {
    setSelectedOrder(order);
    setDetailLoading(true);
    setModal('payment');
    try {
      const res = await api.post('/api/khach-hang/don-hang/data-chi-tiet', order);
      if (res.data.status) { setOrderDetail(res.data.don_hang); }
    } catch { } finally { setDetailLoading(false); }
  };

  const openRating = (order) => {
    setSelectedOrder(order);
    setRating({ id_don_hang: order.id, ma_don_hang: order.ma_don_hang, sao_quan_an: 5, nhan_xet_quan_an: '', sao_shipper: 5, nhan_xet_shipper: '', ten_quan_an: order.ten_quan_an, ho_va_ten_shipper: order.ho_va_ten_shipper });
    setModal('rating');
  };

  const sendRating = async () => {
    try {
      const res = await api.post('/api/khach-hang/don-hang/danh-gia', rating);
      if (res.data.status) { toast.success(res.data.message); setModal(null); loadOrders(); }
      else toast.error(res.data.message);
    } catch { toast.error('Không thể gửi đánh giá!'); }
  };

  // Tạo link thanh toán PayOS
  const openPayOS = async (order) => {
    toast.loading('Đang chuyển hướng sang cổng thanh toán đa kênh PayOS...', { id: 'go_payos' });
    try {
      const res = await api.post(`/api/payos/tao-link/${order.id}`);
      toast.dismiss('go_payos');

      // Nếu là Localhost/Webhook rớt mà backend báo đã thanh toán xong
      if (res.data.is_paid) {
        toast.success(res.data.message, { icon: '✅' });
        loadOrders(false); // Cập nhật danh sách đơn hàng ngay
        return;
      }

      if (res.data.status && res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        toast.error(res.data.message);
      }
    } catch (e) {
      toast.dismiss('go_payos');
      toast.error('Lỗi kết nối PayOS. Vui lòng thử lại sau.');
    }
  };

  // Kiểm tra bank trước khi cho phép yêu cầu hủy đơn thanh toán online
  const handleToggleYeuCauHuy = async (order) => {
    // Nếu đang tắt checkbox → cho tắt luôn
    if (reportForm.yeu_cau_huy) {
      setReportForm(f => ({ ...f, yeu_cau_huy: false, ly_do_huy: '' }));
      return;
    }
    // Kiểm tra xem đơn có thanh toán online không (phương thức != tiền mặt)
    const isOnlinePayment = order?.phuong_thuc_thanh_toan && order.phuong_thuc_thanh_toan !== 'tien_mat';
    if (!isOnlinePayment) {
      // Đơn tiền mặt → không cần kiểm tra bank
      setReportForm(f => ({ ...f, yeu_cau_huy: true }));
      return;
    }
    // Đơn online → kiểm tra bank account
    setCheckingBank(true);
    try {
      const res = await api.get('/api/khach-hang/tai-khoan-ngan-hang');
      const banks = res.data.data || [];
      if (banks.length === 0) {
        // Chưa có bank → redirect sang Profile
        setReportOrder(null); // Đóng modal
        const returnUrl = location.pathname;
        toast('Bạn cần thêm tài khoản ngân hàng để nhận hoàn tiền khi hủy đơn online!', {
          icon: '🏦',
          duration: 3500,
        });
        navigate(`/khach-hang/profile?tab=bank&returnUrl=${encodeURIComponent(returnUrl)}`);
      } else {
        // Đã có bank → cho tick bình thường
        setReportForm(f => ({ ...f, yeu_cau_huy: true }));
      }
    } catch {
      // Nếu lỗi API thì vẫn cho tiếp tục
      setReportForm(f => ({ ...f, yeu_cau_huy: true }));
    } finally {
      setCheckingBank(false);
    }
  };

  const sendReport = async () => {
    if (!reportForm.tieu_de.trim() || !reportForm.noi_dung.trim()) {
      toast.error('Vui lòng nhập tiêu đề và nội dung báo cáo!');
      return;
    }
    if (reportForm.yeu_cau_huy && !reportForm.ly_do_huy.trim()) {
      toast.error('Vui lòng nhập lý do yêu cầu hủy đơn!');
      return;
    }
    setReportLoading(true);
    try {
      const fd = new FormData();
      fd.append('tieu_de', reportForm.tieu_de);
      fd.append('noi_dung', reportForm.noi_dung);
      if (reportOrder?.id) fd.append('id_don_hang', reportOrder.id);
      if (reportForm.hinh_anh) fd.append('hinh_anh', reportForm.hinh_anh);
      if (reportForm.yeu_cau_huy) { fd.append('yeu_cau_huy', '1'); fd.append('ly_do_huy', reportForm.ly_do_huy); }
      const res = await api.post('/api/khach-hang/reports/create', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.status) {
        if (reportForm.yeu_cau_huy) {
          rtToast.show({
            type: 'notification',
            title: 'Yêu cầu hủy đã được ghi nhận!',
            message: 'Admin sẽ xem xét và phản hồi yêu cầu hủy đơn của bạn sớm nhất.',
            duration: 7000,
          });
        } else {
          toast.success(res.data.message);
        }
        setReportOrder(null);
        setReportForm({ tieu_de: '', noi_dung: '', hinh_anh: null, yeu_cau_huy: false, ly_do_huy: '' });
      } else toast.error(res.data.message);
    } catch { toast.error('Lỗi gửi báo cáo!'); }
    finally { setReportLoading(false); }
  };

  const handleReorder = async (order) => {
    const loadId = toast.loading('Đang chuẩn bị lại món ăn cho bạn...');
    try {
      const res = await api.post('/api/khach-hang/don-hang/reorder', { id: order.id });
      if (res.data.status) {
        toast.success(res.data.message, { id: loadId });
        window.dispatchEvent(new CustomEvent('cart-updated'));
        navigate(`/khach-hang/quan-an/${res.data.id_quan_an}`);
      } else {
        toast.error(res.data.message, { id: loadId });
      }
    } catch (e) {
      toast.error('Lỗi kết nối hệ thống. Vui lòng thử lại sau.', { id: loadId });
    }
  };

  const formatDT = (dt) => {
    if (!dt) return '';
    const d = new Date(dt);
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900"><i className="fa-solid fa-bag-shopping mr-3 text-orange-500" />Đơn hàng của tôi</h1>
          <p className="text-gray-500 mt-1">Theo dõi và quản lý tất cả đơn hàng của bạn</p>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === t.key ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  style={activeTab === t.key ? { background: 'linear-gradient(135deg, #ff6b35, #f7931e)' } : {}}>
                  {t.label}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="relative w-full lg:w-64">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Tìm mã đơn, quán, shipper..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            </div>
          </div>
        </div>

        {/* Orders grid */}
        {loading ? (
          <div className="text-center py-20"><i className="fa-solid fa-spinner fa-spin text-4xl text-orange-500 mb-4 block" /><p className="text-gray-500">Đang tải đơn hàng...</p></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <i className="fa-solid fa-box-open text-6xl text-gray-200 mb-4 block" />
            <h3 className="text-lg font-semibold text-gray-500">Không có đơn hàng nào</h3>
            <p className="text-gray-400 text-sm mt-1">Thử thay đổi bộ lọc hoặc đặt hàng ngay!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentOrders.map((o, i) => {
                const st = STATUS_MAP[o.tinh_trang] || STATUS_MAP[4];
                return (
                  <div key={o.id || i} className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                    <div className="p-5">
                      {/* Top */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center font-black text-xs shadow-inner">#</div>
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase font-black tracking-tighter leading-none mb-1">Mã đơn</div>
                            <div className="font-black text-gray-900 leading-none tracking-tight">#{o.ma_don_hang}</div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border ${st.color.replace('bg-', 'border-').replace('100', '200')} ${st.color}`}>
                          <i className={`fa-solid ${st.icon}`} />{st.label}
                        </span>
                      </div>

                      {/* Restaurant info container */}
                      <div className="relative group/res mb-5">
                        <div className="flex gap-4 p-3 rounded-2xl bg-gray-50/50 border border-transparent group-hover/res:bg-white group-hover/res:border-orange-100 transition-all duration-300">
                          <div className="relative">
                            {o.hinh_anh_quan
                              ? <img src={o.hinh_anh_quan} alt={o.ten_quan_an} className="w-16 h-16 rounded-2xl object-cover shadow-soft ring-2 ring-white" />
                              : <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center shadow-soft"><i className="fa-solid fa-store text-gray-400 text-xl" /></div>}
                            <div className="absolute -bottom-2 -right-2 bg-white rounded-lg px-1.5 py-0.5 shadow-md border border-gray-100 text-[10px] font-black text-orange-500 text-center min-w-[32px]">
                              {o.so_mon}
                              <div className="text-[6px] uppercase leading-none opacity-50">Món</div>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="font-black text-gray-900 mb-1 truncate leading-tight group-hover/res:text-orange-500 transition-colors">{o.ten_quan_an}</div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><i className="fa-regular fa-calendar" />{formatDT(o.created_at).split(' ')[0]}</span>
                              <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><i className="fa-regular fa-clock" />{formatDT(o.created_at).split(' ')[1]}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Price Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-5 px-1">
                        <div className="p-3 bg-gray-50/30 rounded-2xl border border-gray-100">
                          <div className="text-[9px] font-black text-gray-400 uppercase mb-1">Tiền hàng</div>
                          <div className="font-bold text-gray-700 text-sm">{formatVND(o.tien_hang)}</div>
                        </div>
                        <div className="p-3 bg-gray-50/30 rounded-2xl border border-gray-100 text-right">
                          <div className="text-[9px] font-black text-gray-400 uppercase mb-1">Phí vận chuyển</div>
                          <div className="font-bold text-gray-700 text-sm">{formatVND(o.phi_ship)}</div>
                        </div>
                        
                        {(o.tien_hang + o.phi_ship - o.tong_tien) > 0 && (
                          <div className="col-span-2 p-2.5 bg-green-50/80 rounded-xl border border-green-100/80 flex justify-between items-center shadow-sm shadow-green-100/30">
                            <div className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1.5"><i className="fa-solid fa-tags" />Đã giảm giá</div>
                            <div className="font-black text-green-700 text-sm tracking-tighter">-{formatVND(o.tien_hang + o.phi_ship - o.tong_tien)}</div>
                          </div>
                        )}

                        <div className="col-span-2 p-3 bg-red-50/50 rounded-2xl border border-red-100/50 flex justify-between items-center shadow-sm shadow-red-100/20">
                          <div className="text-[10px] font-black text-red-400 uppercase tracking-widest">Tổng thanh toán</div>
                          <div className="font-black text-red-600 text-lg tracking-tighter">{formatVND(o.tong_tien)}</div>
                        </div>
                      </div>

                      {/* ── Trạng thái hoàn tiền (MỚI) ── chỉ hiện khi đơn hủy + đã thanh toán PayOS */}
                      {o.tinh_trang == 5 && o.is_thanh_toan == 1 && o.phuong_thuc_thanh_toan == 3 && (() => {
                        const rs = o.refund_status;
                        if (rs === 'success') return (
                          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-bold">
                            <i className="fa-solid fa-circle-check" />
                            <span>Đã hoàn tiền {o.refund_at ? `lúc ${new Date(o.refund_at).toLocaleString('vi-VN')}` : ''}</span>
                          </div>
                        );
                        if (rs === 'pending') return (
                          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                            <i className="fa-solid fa-clock-rotate-left fa-spin" />
                            <span>Đang xử lý hoàn tiền...</span>
                          </div>
                        );
                        if (rs === 'failed') return (
                          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                            <i className="fa-solid fa-triangle-exclamation" />
                            <span>Hoàn tiền thất bại — vui lòng liên hệ hỗ trợ</span>
                          </div>
                        );
                        // null = chưa xử lý (đang chờ trong queue)
                        return (
                          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                            <i className="fa-solid fa-hourglass-half" />
                            <span>Hoàn tiền tự động đang chờ xử lý...</span>
                          </div>
                        );
                      })()}

                      {/* Actions with professional glassmorphism buttons */}
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {o.tinh_trang > 0 && o.tinh_trang < 4 && (o.id_shipper || o.ho_va_ten_shipper) && (
                          <button onClick={() => setChatOrder(o)}
                            className="col-span-2 px-4 py-2.5 rounded-2xl bg-blue-100 text-blue-700 text-sm font-black hover:bg-blue-200 transition-all flex items-center justify-center gap-2 shadow-sm border border-blue-200">
                            <i className="fa-solid fa-comments text-lg" /> NHẮN TIN CHO SHIPPER
                          </button>
                        )}

                        <button onClick={() => openDetail(o)}
                          className="px-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-600 text-xs font-black hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2 shadow-sm">
                          <i className="fa-solid fa-receipt opacity-50" />CHI TIẾT
                        </button>
                        
                        {o.is_thanh_toan == 0 ? (
                          <div className="flex gap-1">
                            <button onClick={() => openPayOS(o)}
                              className="flex-1 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[10px] font-black hover:shadow-lg hover:shadow-indigo-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0 border-b-2 border-indigo-700/50">
                              <i className="fa-solid fa-bolt mr-1" />PAYOS
                            </button>
                            <button onClick={() => openPayment(o)}
                              className="w-10 rounded-2xl bg-red-50 text-red-600 border border-red-100 text-[10px] font-black flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm">
                              MB
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-green-50/80 border border-green-100 text-green-600 text-[10px] font-black uppercase tracking-widest shadow-sm">
                            <i className="fa-solid fa-shield-check text-xs" />ĐÃ THANH TOÁN
                          </div>
                        )}
                        
                        {o.tinh_trang == 4 && !o.da_danh_gia && (
                          <button onClick={() => openRating(o)}
                            className="col-span-2 mt-1 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-black hover:shadow-lg hover:shadow-orange-200 transition-all flex items-center justify-center gap-2 border-b-2 border-orange-600/50">
                            <i className="fa-solid fa-star" />ĐÁNH GIÁ ĐƠN HÀNG
                          </button>
                        )}

                        {/* Button Đặt lại cho đơn hoàn tất hoặc đã hủy */}
                        {(o.tinh_trang == 4 || o.tinh_trang == 5) && (
                          <button onClick={() => handleReorder(o)}
                            className="col-span-2 mt-1 px-4 py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 hover:shadow-lg transition-all flex items-center justify-center gap-2">
                            <i className="fa-solid fa-rotate-left" /> ĐẶT LẠI ĐƠN NÀY
                          </button>
                        )}

                        {/* Báo cáo sự cố / yêu cầu hủy khi đơn đang active (kể cả Chờ Shipper) */}
                        {[0,1,2,3].includes(o.tinh_trang) && (
                          <button onClick={() => { setReportOrder(o); setReportForm({ tieu_de: '', noi_dung: '', hinh_anh: null, yeu_cau_huy: false, ly_do_huy: '' }); }}
                            className="col-span-2 mt-1 px-4 py-2 rounded-2xl bg-orange-50 border border-orange-200 text-orange-700 text-xs font-black hover:bg-orange-100 transition-all flex items-center justify-center gap-2">
                            <i className="fa-solid fa-triangle-exclamation" />BÁO SỰ CỐ / YÊU CẦU HỦY
                          </button>
                        )}
                        {(o.tinh_trang == 4 || o.tinh_trang == 5) && (
                          <button onClick={() => { setReportOrder(o); setReportForm({ tieu_de: '', noi_dung: '', hinh_anh: null, yeu_cau_huy: false, ly_do_huy: '' }); }}
                            className="col-span-2 mt-1 px-4 py-2 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-black hover:bg-red-100 transition-all flex items-center justify-center gap-2">
                            <i className="fa-solid fa-flag" />BÁO CÁO / KHIẾU NẠI
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12 mb-6">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white text-gray-400 hover:text-orange-500 hover:bg-orange-50 disabled:opacity-50 transition-all shadow-sm border border-gray-100"
                >
                  <i className="fa-solid fa-chevron-left text-xs" />
                </button>
                <div className="flex items-center gap-1.5">
                  {[...Array(totalPages)].map((_, idx) => {
                    const page = idx + 1;
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 flex items-center justify-center rounded-2xl font-black text-xs transition-all shadow-sm ${currentPage === page ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-orange-200' : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-orange-500 border border-gray-100'}`}
                        >
                          {page}
                        </button>
                      );
                    }
                    if (page === currentPage - 2 || page === currentPage + 2) return <span key={`dots-${page}`} className="w-4 text-center text-gray-300">...</span>;
                    return null;
                  })}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white text-gray-400 hover:text-orange-500 hover:bg-orange-50 disabled:opacity-50 transition-all shadow-sm border border-gray-100"
                >
                  <i className="fa-solid fa-chevron-right text-xs" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {modal === 'detail' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setModal(null); if (trackPollRef.current) clearInterval(trackPollRef.current); }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 p-5 flex items-center justify-between z-10 rounded-t-3xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
              <div>
                <h3 className="text-lg font-bold text-white"><i className="fa-solid fa-receipt mr-2" />Chi tiết đơn hàng</h3>
                <div className="text-white/70 text-sm mt-1">Mã đơn: #{orderDetail?.ma_don_hang || selectedOrder?.ma_don_hang}</div>
              </div>
              <button onClick={() => { setModal(null); if (trackPollRef.current) clearInterval(trackPollRef.current); }} className="text-white/80 hover:text-white text-xl"><i className="fa-solid fa-xmark" /></button>
            </div>

            {/* Tabs — chỉ hiện tab bản đồ khi đơn đang giao */}
            {orderDetail?.tinh_trang == 3 && (
              <div className="flex gap-1 px-5 pt-3 pb-0 flex-shrink-0 bg-white border-b border-gray-100">
                {[{ key: 'info', label: 'Chi Tiết', icon: 'fa-receipt' }, { key: 'map', label: 'Theo Dõi Bản Đồ', icon: 'fa-map-location-dot' }].map(t => (
                  <button key={t.key} onClick={async () => {
                    setDetailTab(t.key);
                    if (t.key === 'map' && orderDetail?.id) {
                      setTrackingLoading(true);
                      try {
                        const r = await api.post('/api/khach-hang/don-hang/theo-doi-don-hang', { id: orderDetail.id });
                        if (r.data.status) setTrackingData(r.data.order);
                      } catch {} finally { setTrackingLoading(false); }
                      if (trackPollRef.current) clearInterval(trackPollRef.current);
                      trackPollRef.current = setInterval(async () => {
                        try {
                          const r = await api.post('/api/khach-hang/don-hang/theo-doi-don-hang', { id: orderDetail.id });
                          if (r.data.status) setTrackingData(r.data.order);
                        } catch {}
                      }, 10000);
                    } else {
                      if (trackPollRef.current) { clearInterval(trackPollRef.current); trackPollRef.current = null; }
                    }
                  }}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl border-b-2 transition-all -mb-px ${
                      detailTab === t.key ? 'border-purple-600 text-purple-600 bg-purple-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}>
                    <i className={`fa-solid ${t.icon}`} />{t.label}
                  </button>
                ))}
              </div>
            )}

            {/* TAB: BẢN ĐỒ */}
            {detailTab === 'map' && orderDetail?.tinh_trang == 3 && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {trackingLoading ? (
                  <div className="flex-1 flex items-center justify-center"><div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>
                ) : trackingData ? (() => {
                  const sl = trackingData.shipper_lat; const sln = trackingData.shipper_lng;
                  const ql = trackingData.restaurant_lat || trackingData.quan_lat; const qln = trackingData.restaurant_lng || trackingData.quan_lng;
                  const mapSrc = sl && sln
                    ? `https://www.google.com/maps/embed/v1/directions?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY&origin=${sl},${sln}&destination=${ql},${qln}&mode=driving`
                    : ql ? `https://maps.google.com/maps?q=${ql},${qln}&t=m&z=16&output=embed` : null;
                  return (
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center gap-3 p-3 bg-blue-50 border-b border-blue-100 text-sm flex-shrink-0">
                        <i className="fa-solid fa-motorcycle text-blue-500 text-lg" />
                        <div>
                          <span className="font-bold text-blue-800">Shipper: {trackingData.ten_shipper || trackingData.shipper_name || 'Đang cập nhật'}</span>
                          <div className="text-xs text-blue-600 mt-0.5">
                            {sl ? <><i className="fa-solid fa-location-dot mr-1" />Vị trí cập nhật mỗi 10 giây</> : 'Chưa có tọa độ shipper, đang hiển thị vị trí quán'}
                          </div>
                        </div>
                        <div className="ml-auto flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-bold">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />LIVE
                        </div>
                      </div>
                      {!mapUnlocked ? (
                        <div className="flex-1 relative flex items-center justify-center bg-gray-100">
                          <div className="absolute inset-0 bg-gray-200" style={{ backgroundImage: 'url(https://maps.googleapis.com/maps/api/staticmap?center=16.0471,108.2068&zoom=13&size=800x600&key=)' }} />
                          <div className="relative z-10 text-center bg-white/95 p-6 rounded-2xl shadow-xl max-w-xs">
                            <i className="fa-solid fa-map-location-dot text-4xl text-purple-500 mb-3 block" />
                            <h4 className="font-bold text-gray-800 mb-2">Theo Dõi Shipper Real-time</h4>
                            <p className="text-gray-500 text-sm mb-4">Bấm để xem bản đồ và theo dõi shipper đang giao đơn của bạn</p>
                            <button onClick={() => setMapUnlocked(true)}
                              className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg transition-all">
                              <i className="fa-solid fa-location-dot mr-2" />Mở Bản Đồ
                            </button>
                          </div>
                        </div>
                      ) : mapSrc ? (
                        <iframe src={mapSrc} className="flex-1 w-full" style={{ border: 0 }} allowFullScreen loading="lazy" />
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                          <div className="text-center"><i className="fa-solid fa-map text-5xl text-gray-200 mb-3 block" /><p>Chưa có dữ liệu vị trí</p></div>
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center"><i className="fa-solid fa-satellite-dish text-5xl text-gray-200 mb-3 block" /><p>Không thể tải dữ liệu vị trí</p></div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: CHI TIẾT */}
            <div className={`overflow-y-auto flex-1 ${detailTab !== 'info' ? 'hidden' : ''}`}>
              {detailLoading ? (
                <div className="py-20 text-center"><i className="fa-solid fa-spinner fa-spin text-3xl text-purple-500" /></div>
              ) : orderDetail && (
                <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-800"><i className="fa-solid fa-clock-rotate-left mr-2 text-purple-500" />Trạng thái</h4>
                  {(() => { const st = STATUS_MAP[orderDetail.tinh_trang] || STATUS_MAP[4]; return <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold ${st.color}`}><i className={`fa-solid ${st.icon}`} />{st.label}</span>; })()}
                </div>
                <p className="text-sm text-gray-400"><i className="fa-regular fa-calendar mr-1" />{formatDT(orderDetail.created_at)}</p>

                {/* Tracking Radar */}
                <OrderTracking orderId={orderDetail.id || selectedOrder.id} />

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Restaurant */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Quán ăn</h4>
                    <div className="flex gap-3">
                      <img src={orderDetail.hinh_anh_quan} alt="" className="w-12 h-12 rounded-full object-cover" />
                      <div>
                        <div className="font-semibold">{orderDetail.ten_quan_an}</div>
                        {orderDetail.sdt_quan && <div className="text-sm text-gray-500"><i className="fa-solid fa-phone text-green-500 mr-1" />{orderDetail.sdt_quan}</div>}
                        {orderDetail.dia_chi_quan && <div className="text-sm text-gray-500"><i className="fa-solid fa-map-pin text-red-500 mr-1" />{orderDetail.dia_chi_quan}</div>}
                      </div>
                    </div>
                    <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider mt-4">Người nhận</h4>
                    <div className="flex gap-3">
                      <img src={orderDetail.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                      <div>
                        <div className="font-semibold">{orderDetail.ten_nguoi_nhan}</div>
                        <div className="text-sm text-gray-500"><i className="fa-solid fa-phone text-green-500 mr-1" />{orderDetail.sdt_nguoi_nhan}</div>
                        <div className="text-sm text-gray-500"><i className="fa-solid fa-map-pin text-red-500 mr-1" />{orderDetail.dia_chi}, {orderDetail.ten_quan_huyen}, {orderDetail.ten_tinh_thanh}</div>
                      </div>
                    </div>
                    {orderDetail.ho_va_ten_shipper && (
                      <>
                        <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider mt-4">Shipper</h4>
                        <div className="flex gap-3">
                          <img src={orderDetail.hinh_anh_shipper} alt="" className="w-12 h-12 rounded-full object-cover" />
                          <div className="flex-1">
                            <div className="font-semibold">{orderDetail.ho_va_ten_shipper}</div>
                            {orderDetail.sdt_shipper && <div className="text-sm text-gray-500"><i className="fa-solid fa-phone text-green-500 mr-1" />{orderDetail.sdt_shipper}</div>}
                          </div>
                          {orderDetail.tinh_trang > 0 && orderDetail.tinh_trang < 4 && (
                            <button 
                              onClick={() => setChatOrder(orderDetail)}
                              className="px-4 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/30 flex items-center gap-1 self-start"
                            >
                              <i className="fa-solid fa-comments" /> Chat
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Items & Total */}
                  <div>
                    <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-3">Món đã đặt ({orderItems.length})</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {orderItems.map((it, i) => (
                        <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-50 border-l-4 border-purple-400">
                          {it.hinh_anh ? <img src={it.hinh_anh} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                            : <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0"><i className="fa-solid fa-utensils text-gray-400" /></div>}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">{it.ten_mon_an}{it.ten_size && <span className="ml-1 text-orange-500 text-xs">(Size {it.ten_size})</span>}</div>
                            <div className="text-xs text-gray-500">{formatVND(it.don_gia)} × {it.so_luong}</div>
                            {it.ghi_chu && <div className="flex flex-wrap gap-1 mt-1">{it.ghi_chu.split(',').map((t, i) => <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">+{t.trim()}</span>)}</div>}
                          </div>
                          <div className="font-bold text-purple-600 text-sm">{formatVND(it.thanh_tien)}</div>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                      <div className="flex justify-between text-gray-500"><span>Tiền hàng</span><span>{formatVND(orderDetail.tien_hang)}</span></div>
                      <div className="flex justify-between text-gray-500"><span>Phí vận chuyển</span><span>{formatVND(orderDetail.phi_ship)}</span></div>
                      {(orderDetail.tien_hang + orderDetail.phi_ship - orderDetail.tong_tien - (orderDetail.tien_giam_tu_xu || 0)) > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span><i className="fa-solid fa-tag mr-1" />{orderDetail.ma_code ? `Voucher (${orderDetail.ma_code})` : 'Voucher'}</span>
                          <span>-{formatVND(orderDetail.tien_hang + orderDetail.phi_ship - orderDetail.tong_tien - (orderDetail.tien_giam_tu_xu || 0))}</span>
                        </div>
                      )}
                      {orderDetail.tien_giam_tu_xu > 0 && <div className="flex justify-between text-green-600"><span><i className="fa-solid fa-coins text-yellow-500 mr-1" />Đã dùng Xu</span><span>-{formatVND(orderDetail.tien_giam_tu_xu)}</span></div>}
                      <div className="flex justify-between items-center p-3 rounded-xl text-white font-bold" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                        <div>
                          <div>Tổng cộng</div>
                          {orderDetail.xu_tich_luy > 0 && <div className="text-xs font-normal opacity-75">Sẽ nhận {orderDetail.xu_tich_luy} xu</div>}
                        </div>
                        <div className="text-lg">{formatVND(orderDetail.tong_tien)}</div>
                      </div>
                      <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${orderDetail.is_thanh_toan == 1 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        <i className={`fa-solid ${orderDetail.is_thanh_toan == 1 ? 'fa-circle-check' : 'fa-circle-info'}`} />
                        {orderDetail.is_thanh_toan == 1 ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </div>
                    </div>

                    {orderDetail.anh_giao_hang && (
                      <div className="bg-gray-50 rounded-2xl p-4 mt-4">
                        <h4 className="font-bold text-gray-700 text-sm mb-3"><i className="fa-solid fa-camera mr-2 text-blue-500" />Ảnh xác nhận giao hàng</h4>
                        <img src={orderDetail.anh_giao_hang.startsWith('http') ? orderDetail.anh_giao_hang : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${orderDetail.anh_giao_hang}`} alt="Proof" className="w-full h-auto max-h-64 object-contain rounded-xl border border-gray-200" />
                      </div>
                    )}
                  </div>
                </div>

                {orderDetail.tinh_trang == 4 && (
                  <button onClick={() => { setModal(null); setTimeout(() => openRating(orderDetail), 100); }}
                    className="w-full py-3 rounded-xl bg-yellow-400 text-yellow-900 font-bold hover:bg-yellow-500 transition-colors">
                    <i className="fa-solid fa-star mr-2" />Đánh giá đơn hàng ngay
                  </button>
                )}
              </div>
            )}
            </div>{/* end tab info */}
          </div>
        </div>
      )}

      {/* Payment Modal (QR MB Bank cũ) */}
      {modal === 'payment' && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full">QR</span>
                  <h3 className="font-bold text-lg">Thanh toán đơn #{selectedOrder.ma_don_hang}</h3>
                </div>
                <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark text-xl" /></button>
              </div>
            </div>
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 text-sm text-blue-800">
                <i className="fa-solid fa-circle-info mr-2" />Quét mã QR để thanh toán. Đơn hàng sẽ được xác nhận sau khi thanh toán thành công!
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-2xl">
                  <img src="https://img.vietqr.io/image/MB-0394425076-qr_only.png" alt="QR" className="w-44 mx-auto mb-3" />
                  <div className="text-sm text-gray-600 font-semibold">Mã: #{selectedOrder.ma_don_hang}</div>
                  <div className="text-xl font-bold text-red-500 mt-1">{formatVND(selectedOrder.tong_tien)}</div>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs uppercase font-semibold mb-2">Thông tin nhận hàng</div>
                    <div className="font-semibold">{orderDetail?.ten_nguoi_nhan || selectedOrder.ten_nguoi_nhan}</div>
                    <div className="text-gray-500">{orderDetail?.sdt_nguoi_nhan || selectedOrder.sdt_nguoi_nhan}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs uppercase font-semibold mb-2">Chi tiết thanh toán</div>
                    <div className="flex justify-between"><span className="text-gray-500">Tiền hàng</span><span>{formatVND(selectedOrder.tien_hang)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Phí ship</span><span>{formatVND(selectedOrder.phi_ship)}</span></div>
                    {(selectedOrder.tien_hang + selectedOrder.phi_ship - selectedOrder.tong_tien) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span><i className="fa-solid fa-tags mr-1"></i>Đã giảm giá</span>
                        <span>-{formatVND(selectedOrder.tien_hang + selectedOrder.phi_ship - selectedOrder.tong_tien)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t mt-2 pt-2 font-bold">
                      <span>Tổng</span><span className="text-red-500">{formatVND(selectedOrder.tong_tien)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button onClick={() => setModal(null)} className="px-6 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {modal === 'rating' && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5 bg-yellow-400 rounded-t-3xl flex items-center justify-between">
              <h3 className="font-bold text-lg text-yellow-900"><i className="fa-solid fa-star mr-2" />Đánh giá #{rating.ma_don_hang}</h3>
              <button onClick={() => setModal(null)} className="text-yellow-900/60 hover:text-yellow-900"><i className="fa-solid fa-xmark text-xl" /></button>
            </div>
            <div className="p-6 space-y-6">
              {/* Restaurant rating */}
              <div className="text-center">
                <h4 className="font-bold text-gray-800 mb-3">Quán: <span className="text-blue-600">{rating.ten_quan_an}</span></h4>
                <StarRating value={rating.sao_quan_an} onChange={v => setRating(r => ({ ...r, sao_quan_an: v }))} />
                <textarea value={rating.nhan_xet_quan_an} onChange={e => setRating(r => ({ ...r, nhan_xet_quan_an: e.target.value }))}
                  rows={2} placeholder="Chia sẻ cảm nhận về món ăn..."
                  className="w-full mt-3 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 resize-none" />
              </div>

              {/* Shipper rating */}
              {rating.ho_va_ten_shipper && (
                <div className="text-center border-t pt-6">
                  <h4 className="font-bold text-gray-800 mb-3">Shipper: <span className="text-blue-600">{rating.ho_va_ten_shipper}</span></h4>
                  <StarRating value={rating.sao_shipper} onChange={v => setRating(r => ({ ...r, sao_shipper: v }))} />
                  <textarea value={rating.nhan_xet_shipper} onChange={e => setRating(r => ({ ...r, nhan_xet_shipper: e.target.value }))}
                    rows={2} placeholder="Thái độ shipper như thế nào?"
                    className="w-full mt-3 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 resize-none" />
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200">Hủy</button>
              <button onClick={sendRating}
                className="px-6 py-2 rounded-xl bg-yellow-400 text-yellow-900 font-bold hover:bg-yellow-500 transition-colors">Gửi đánh giá</button>
            </div>
          </div>
        </div>
      )}

      {chatOrder && (
          <ChatBox 
            orderId={chatOrder.id} 
            currentUserType="khach_hang" 
            onClose={() => setChatOrder(null)}
            otherPartyName={chatOrder.ho_va_ten_shipper || 'Shipper'}
          />
      )}

      {/* Report Modal */}
      {reportOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReportOrder(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className={`p-5 rounded-t-3xl flex items-center justify-between ${reportForm.yeu_cau_huy ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
              <div>
                <h3 className="font-bold text-white text-base">
                  <i className={`fa-solid ${reportForm.yeu_cau_huy ? 'fa-circle-stop' : 'fa-flag'} mr-2`} />
                  {reportForm.yeu_cau_huy ? 'Yêu cầu hủy đơn hàng' : 'Báo cáo / Khiếu nại'}
                </h3>
                <p className="text-white/70 text-xs mt-0.5">Đơn #{reportOrder.ma_don_hang} · {reportOrder.ten_quan_an}</p>
              </div>
              <button onClick={() => setReportOrder(null)} className="text-white/70 hover:text-white"><i className="fa-solid fa-xmark text-xl" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Yêu cầu hủy - chỉ hiện khi đơn đang active */}
              {[0,1,2,3].includes(reportOrder.tinh_trang) && (
                <div className={`rounded-2xl border-2 p-4 transition-all cursor-pointer ${reportForm.yeu_cau_huy ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50 hover:border-orange-200'} ${checkingBank ? 'opacity-60 pointer-events-none' : ''}`}
                  onClick={() => handleToggleYeuCauHuy(reportOrder)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${reportForm.yeu_cau_huy ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                      {checkingBank
                        ? <i className="fa-solid fa-spinner fa-spin text-orange-500 text-xs" />
                        : reportForm.yeu_cau_huy && <i className="fa-solid fa-check text-white text-xs" />}
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 text-sm">⚠️ Yêu cầu hủy đơn hàng</div>
                      {reportOrder?.phuong_thuc_thanh_toan && reportOrder.phuong_thuc_thanh_toan !== 'tien_mat'
                        ? <div className="text-xs text-orange-600 mt-0.5 font-medium">
                            <i className="fa-solid fa-building-columns mr-1" />
                            Đơn thanh toán online — cần tài khoản ngân hàng để nhận hoàn tiền.
                          </div>
                        : <div className="text-xs text-gray-500 mt-0.5">Admin sẽ xem xét và hủy đơn nếu hợp lệ. Tiền sẽ được hoàn lại nếu bạn đã thanh toán online.</div>
                      }
                    </div>
                  </div>
                  {reportForm.yeu_cau_huy && (
                    <div className="mt-3" onClick={e => e.stopPropagation()}>
                      <label className="block text-xs font-bold text-orange-700 mb-1.5">Lý do yêu cầu hủy <span className="text-red-400">*</span></label>
                      <textarea rows={2} value={reportForm.ly_do_huy} onChange={e => setReportForm(f => ({ ...f, ly_do_huy: e.target.value }))}
                        placeholder="VD: Shipper không liên hệ được, sự cố cá nhân không thể nhận hàng..."
                        className="w-full px-3 py-2 rounded-xl border border-orange-300 text-sm focus:outline-none focus:border-orange-500 bg-white resize-none" />
                    </div>
                  )}
                </div>
              )}


              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tiêu đề <span className="text-red-400">*</span></label>
                <input value={reportForm.tieu_de} onChange={e => setReportForm(f => ({ ...f, tieu_de: e.target.value }))}
                  placeholder={reportForm.yeu_cau_huy ? 'VD: Yêu cầu hủy đơn vì sự cố' : 'VD: Đơn hàng giao thiếu món, shipper thái độ...'}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nội dung chi tiết <span className="text-red-400">*</span></label>
                <textarea rows={3} value={reportForm.noi_dung} onChange={e => setReportForm(f => ({ ...f, noi_dung: e.target.value }))}
                  placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ảnh đính kèm (nếu có)</label>
                <input type="file" accept="image/*" onChange={e => setReportForm(f => ({ ...f, hinh_anh: e.target.files[0] }))}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-red-50 file:text-red-700 file:font-semibold hover:file:bg-red-100 cursor-pointer" />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setReportOrder(null)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Đóng</button>
              <button onClick={sendReport} disabled={reportLoading}
                className={`px-6 py-2 rounded-xl text-white font-bold text-sm disabled:opacity-60 flex items-center gap-2 transition-colors ${reportForm.yeu_cau_huy ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-500 hover:bg-red-600'}`}>
                {reportLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className={`fa-solid ${reportForm.yeu_cau_huy ? 'fa-circle-stop' : 'fa-paper-plane'}`} />}
                {reportForm.yeu_cau_huy ? 'Gửi yêu cầu hủy' : 'Gửi báo cáo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
