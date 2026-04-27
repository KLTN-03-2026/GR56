import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatVND } from '../../utils/helpers';

const quanAnApi = (url, method = 'get', data = null) => {
  const token = localStorage.getItem('quan_an_login');
  const config = { headers: { Authorization: `Bearer ${token}` } };
  return method === 'get' ? api.get(url, config) : api.post(url, data, config);
};

export default function DonHang() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [chiTiet, setChiTiet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const currentOrders = orders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [reportOrder, setReportOrder] = useState(null);
  const [reportForm, setReportForm] = useState({ tieu_de: '', noi_dung: '', hinh_anh: null });
  const [reportLoading, setReportLoading] = useState(false);

  const [cancelRequestOrder, setCancelRequestOrder] = useState(null);
  const [cancelForm, setCancelForm] = useState({ ly_do: '' });
  const [cancelLoading, setCancelLoading] = useState(false);
  
  const unmountEchoRef = useRef(null);
  const handledEventsRef = useRef(new Set());
  const subscriptionBusyRef = useRef(false);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OSdTgwOUKfk8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUrgc7y2Yk2CBtpvfDknU4MDlCn5PC2YxwGOJHX8sx5LAUkd8fw3ZBAC');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch {}
  };

  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
       const cleanup = await loadData();
       if (isMounted && cleanup) unmountEchoRef.current = cleanup;
    };
    
    init();
    
    return () => {
       isMounted = false;
       if (unmountEchoRef.current) {
          unmountEchoRef.current();
          unmountEchoRef.current = null;
       }
    };
  }, []);

  // Chỉ dùng cho mount lần đầu và nút "Làm mới" (hiện loading + tái thiết websocket)
  const loadData = async () => {
    if (subscriptionBusyRef.current) return;
    subscriptionBusyRef.current = true;

    setLoading(true);
    if (unmountEchoRef.current) {
       unmountEchoRef.current();
       unmountEchoRef.current = null;
    }

    try {
      const res = await quanAnApi('/api/quan-an/don-hang/data');
      setOrders(res.data.data || []);
      
      let userId = res.data.id_quan_an;
      if (!userId) {
         const userRes = await quanAnApi('/api/quan-an/data-login');
         userId = userRes.data?.data?.id;
      }
      
      if (userId) {
         const cleanup = await setupRealtime(userId);
         subscriptionBusyRef.current = false;
         return cleanup;
      }
    } catch (err) {
      if (err?.response?.status === 401) { toast.error('Phiên đăng nhập hết hạn!'); navigate('/quan-an/dang-nhap'); }
    } finally { 
       setLoading(false);
       subscriptionBusyRef.current = false;
    }
    return null;
  };

  // Chỉ cập nhật data trong nền, không đụng Echo/loading (dùng trong real-time handlers)
  const refreshOrders = async () => {
    try {
      const res = await quanAnApi('/api/quan-an/don-hang/data');
      setOrders(res.data.data || []);
    } catch {}
  };

  const setupRealtime = async (userId) => {
    const { default: echo, updateEchoToken } = await import('../../utils/echo');
    updateEchoToken();
    
    const channelName = `quan-an.${userId}`;
    const channel = echo.private(channelName);
    
    const h1 = (data) => {
       const dh = data.don_hang || data || {};
       const eventKey = `moi-${dh.id}`;
       if (handledEventsRef.current.has(eventKey)) return;
       handledEventsRef.current.add(eventKey);
       toast(`🔔 Có đơn hàng mới: #${dh.ma_don_hang}`, { id: `toast-moi-${dh.id}`, icon: '✨', duration: 10000 });
       playNotificationSound();
       setOrders(current => {
          const exists = current.find(o => o.id === dh.id);
          if (exists) return current.map(o => o.id === dh.id ? { ...o, ...dh } : o);
          return [dh, ...current];
       });
       setTimeout(refreshOrders, 1500);
    };
    const h2 = (data) => {
       const dh = data.don_hang || data || {};
       const eventKey = `da-nhan-${dh.id}`;
       if (handledEventsRef.current.has(eventKey)) return;
       handledEventsRef.current.add(eventKey);
       toast.success(`🚚 Shipper đã nhận đơn: #${dh.ma_don_hang}`, { id: `toast-dn-${dh.id}`, duration: 8000 });
       playNotificationSound();
       setOrders(current => {
          const exists = current.find(o => o.id === dh.id);
          if (exists) return current.map(o => o.id === dh.id ? { ...o, ...dh, tinh_trang: 1 } : o);
          return [dh, ...current];
       });
       setTimeout(refreshOrders, 1500);
    };
    const h3 = (data) => {
       const dh = data.don_hang || data || {};
       const eventKey = `hoan-thanh-${dh.id}`;
       if (handledEventsRef.current.has(eventKey)) return;
       handledEventsRef.current.add(eventKey);
       toast.success(`✅ Đơn #${dh.ma_don_hang || ''} đã giao thành công`, { id: `toast-ht-${dh.id}`, duration: 8000 });
       playNotificationSound();
       setOrders(current => current.map(o => o.id === dh.id ? { ...o, ...dh, tinh_trang: 4 } : o));
       setTimeout(refreshOrders, 1500);
    };

    channel.listen('.don-hang.moi', h1);
    channel.listen('.don-hang.da-nhan', h2);
    channel.listen('.don-hang.hoan-thanh', h3);

    // 4. Đơn đã bị hủy (admin duyệt hủy)
    // QuanAnLayout đã show toast - ở đây chỉ cần cập nhật data
    const h4 = (data) => {
       const dh = data.don_hang || data || {};
       const eventKey = `da-huy-${dh.id}`;
       if (handledEventsRef.current.has(eventKey)) return;
       handledEventsRef.current.add(eventKey);
       setOrders(current => current.map(o => o.id === dh.id ? { ...o, ...dh, tinh_trang: 5 } : o));
       setTimeout(refreshOrders, 1500);
    };
    channel.listen('.don-hang.da-huy', h4);

    // KHÔNG echo.leave() - chỉ stopListening để giữ channel cho NotificationBell
    return () => {
      try { channel.stopListening('.don-hang.moi', h1); } catch {}
      try { channel.stopListening('.don-hang.da-nhan', h2); } catch {}
      try { channel.stopListening('.don-hang.hoan-thanh', h3); } catch {}
      try { channel.stopListening('.don-hang.da-huy', h4); } catch {}
    };
  };

  const loadChiTiet = async (order) => {
    setSelectedOrder(order);
    setShowModal(true);
    try {
      const res = await quanAnApi('/api/quan-an/don-hang/chi-tiet', 'post', order);
      if (res.data.status) setChiTiet(res.data.data || []);
    } catch { toast.error('Không thể tải chi tiết!'); }
  };

  const nhanDon = async (order) => {
    try {
      const res = await quanAnApi('/api/quan-an/don-hang/nhan-don', 'post', order);
      if (res.data.status) { toast.success(res.data.message); refreshOrders(); }
      else toast.error(res.data.message);
    } catch { toast.error('Lỗi hệ thống!'); }
  };

  const daXong = async (order) => {
    try {
      const res = await quanAnApi('/api/quan-an/don-hang/da-xong', 'post', order);
      if (res.data.status) { toast.success(res.data.message); refreshOrders(); }
      else toast.error(res.data.message);
    } catch { toast.error('Lỗi!'); }
  };

  const formatDT = (dt) => {
    if (!dt) return '';
    const d = new Date(dt);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const sendCancelRequest = async () => {
    if (!cancelForm.ly_do.trim()) { toast.error('Vui lòng nhập lý do hủy đơn!'); return; }
    setCancelLoading(true);
    try {
      const token = localStorage.getItem('quan_an_login');
      const res = await import('../../utils/api').then(m => m.default.post(
        '/api/quan-an/reports/create',
        {
          tieu_de: `Yêu cầu hủy đơn #${cancelRequestOrder.ma_don_hang}`,
          noi_dung: cancelForm.ly_do,
          id_don_hang: cancelRequestOrder.id,
          yeu_cau_huy: 1,
          ly_do_huy: cancelForm.ly_do,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      ));
      if (res.data.status) {
        toast.success(res.data.message);
        setCancelRequestOrder(null);
        setCancelForm({ ly_do: '' });
      } else {
        toast.error(res.data.message);
      }
    } catch { toast.error('Lỗi gửi yêu cầu hủy!'); }
    finally { setCancelLoading(false); }
  };

  const sendReport = async () => {
    if (!reportForm.tieu_de.trim() || !reportForm.noi_dung.trim()) { toast.error('Vui lòng nhập tiêu đề và nội dung!'); return; }
    setReportLoading(true);
    try {
      const fd = new FormData();
      fd.append('tieu_de', reportForm.tieu_de);
      fd.append('noi_dung', reportForm.noi_dung);
      if (reportOrder?.id) fd.append('id_don_hang', reportOrder.id);
      if (reportForm.hinh_anh) fd.append('hinh_anh', reportForm.hinh_anh);
      const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem('quan_an_login')}`, 'Content-Type': 'multipart/form-data' } };
      const res = await import('../../utils/api').then(m => m.default.post('/api/quan-an/reports/create', fd, cfg));
      if (res.data.status) { toast.success(res.data.message); setReportOrder(null); }
      else toast.error(res.data.message);
    } catch { toast.error('Lỗi gửi báo cáo!'); }
    finally { setReportLoading(false); }
  };

  const STATUS_MAP = {
    0: { label: 'Chờ shipper', color: 'bg-gray-100 text-gray-500', icon: 'fa-user-clock' },
    1: { label: 'Chờ quán nhận', color: 'bg-yellow-100 text-yellow-800', icon: 'fa-bell' },
    2: { label: 'Đang nấu', color: 'bg-orange-100 text-orange-800', icon: 'fa-fire-burner' },
    3: { label: 'Đang giao', color: 'bg-blue-100 text-blue-800', icon: 'fa-motorcycle' },
    4: { label: 'Hoàn tất', color: 'bg-green-100 text-green-800', icon: 'fa-circle-check' },
    5: { label: 'Đã hủy', color: 'bg-red-100 text-red-800', icon: 'fa-circle-xmark' },
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900"><i className="fa-solid fa-bag-shopping mr-3 text-blue-500" />Danh Sách Đơn Hàng</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý và xử lý đơn hàng của quán</p>
        </div>
        <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-100 text-blue-700 font-semibold text-sm hover:bg-blue-200 transition-colors">
          <i className="fa-solid fa-refresh" />Làm mới
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
          <i className="fa-solid fa-box-open text-6xl text-gray-200 mb-4 block" />
          <h3 className="text-lg font-semibold text-gray-400">Chưa có đơn hàng nào</h3>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-semibold text-xs uppercase">
                  <th className="px-4 py-3 text-center">#</th>
                  <th className="px-4 py-3 text-left">Thời gian</th>
                  <th className="px-4 py-3 text-center">Mã đơn</th>
                  <th className="px-4 py-3 text-left">Khách hàng</th>
                  <th className="px-4 py-3 text-left">Shipper</th>
                  <th className="px-4 py-3 text-right">Tiền hàng</th>
                  <th className="px-4 py-3 text-right">Voucher</th>
                  <th className="px-4 py-3 text-right">Quán nhận</th>
                  <th className="px-4 py-3 text-center">Chi tiết</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentOrders.map((o, i) => {
                  const st = STATUS_MAP[o.tinh_trang] || STATUS_MAP[0];
                  const stOrder = (currentPage - 1) * itemsPerPage + i + 1;
                  return (
                    <tr key={o.id || i} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-4 py-4 text-center text-gray-400 font-medium">{stOrder}</td>
                      <td className="px-4 py-4 text-gray-500 whitespace-nowrap text-xs">{formatDT(o.created_at)}</td>
                      <td className="px-4 py-4 text-center"><span className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">#{o.ma_don_hang}</span></td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-gray-800">{o.ten_nguoi_nhan}</div>
                        <div className="text-[10px] text-gray-400 max-w-[150px] truncate" title={o.dia_chi_khach}>{o.dia_chi_khach}</div>
                      </td>
                      <td className="px-4 py-4">
                        {o.ho_va_ten_shipper ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold shadow-sm">{o.ho_va_ten_shipper.charAt(0)}</div>
                            <span className="text-gray-700 font-medium truncate max-w-[100px]">{o.ho_va_ten_shipper}</span>
                          </div>
                        ) : <span className="text-gray-300 italic text-xs">Chờ shipper...</span>}
                      </td>
                      <td className="px-4 py-4 text-right font-black text-gray-900">{formatVND(o.tien_hang)}</td>
                      <td className="px-4 py-4 text-right">
                        {o.chiet_khau_voucher > 0
                          ? <div><span className="text-red-500 font-bold">-{formatVND(o.chiet_khau_voucher)}</span>{o.ma_voucher && <div className="text-[10px] text-gray-400">Code: {o.ma_voucher}</div>}</div>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-black text-blue-600">{formatVND(o.tien_quan_an > 0 ? o.tien_quan_an : o.tien_hang * 0.85)}</span>
                        {!o.da_doi_soat && <div className="text-[10px] text-blue-400 animate-pulse">(Chờ đối soát)</div>}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button onClick={() => loadChiTiet(o)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-600 hover:text-white transition-all border border-blue-100 shadow-sm">
                          <i className="fa-solid fa-receipt mr-1.5" />Món ăn
                        </button>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {o.tinh_trang == 1 ? (
                          <button onClick={() => nhanDon(o)}
                            className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-black hover:shadow-lg transition-all border border-blue-400 shadow-md transform hover:-translate-y-0.5 active:translate-y-0">
                            <i className="fa-solid fa-check-double mr-1.5" />NHẬN ĐƠN
                          </button>
                        ) : o.tinh_trang == 2 ? (
                          <button onClick={() => daXong(o)}
                            className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 text-white text-xs font-black hover:shadow-lg transition-all border border-orange-300 shadow-md transform hover:-translate-y-0.5 active:translate-y-0">
                            <i className="fa-solid fa-fire-burner mr-1.5" />ĐÃ XONG
                          </button>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border ${st.color.replace('bg-', 'border-').replace('100', '200')} ${st.color}`}>
                            <i className={`fa-solid ${st.icon}`} />{st.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {(o.tinh_trang == 4 || o.tinh_trang == 5) ? (
                          <button onClick={() => { setReportOrder(o); setReportForm({ tieu_de: '', noi_dung: '', hinh_anh: null }); }}
                            className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 border border-red-100 transition-all">
                            <i className="fa-solid fa-flag mr-1" />Báo cáo
                          </button>
                        ) : [1,2,3].includes(o.tinh_trang) ? (
                          <button onClick={() => { setCancelRequestOrder(o); setCancelForm({ ly_do: '' }); }}
                            className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 text-xs font-bold hover:bg-orange-100 border border-orange-200 transition-all">
                            <i className="fa-solid fa-ban mr-1" />Hủy đơn
                          </button>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-5 border-t border-gray-100 flex items-center justify-between bg-white bg-gradient-to-r from-white to-blue-50/30">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Hiển thị <span className="text-blue-600">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="text-blue-600">{Math.min(currentPage * itemsPerPage, orders.length)}</span> / {orders.length} đơn hàng
              </p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-9 h-9 flex items-center justify-center rounded-2xl bg-white text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-all shadow-sm border border-gray-100"
                >
                  <i className="fa-solid fa-chevron-left text-xs" />
                </button>
                <div className="flex items-center gap-1.5">
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-9 h-9 flex items-center justify-center rounded-2xl font-black text-xs transition-all shadow-sm ${currentPage === page ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-blue-600 border border-gray-100'}`}
                        >
                          {page}
                        </button>
                      );
                    }
                    if (page === currentPage - 2 || page === currentPage + 2) return <span key={`dots-${page}`} className="w-6 text-center text-gray-300">...</span>;
                    return null;
                  })}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-9 h-9 flex items-center justify-center rounded-2xl bg-white text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-all shadow-sm border border-gray-100"
                >
                  <i className="fa-solid fa-chevron-right text-xs" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 bg-blue-600 rounded-t-3xl flex items-center justify-between">
              <h3 className="font-bold text-white"><i className="fa-solid fa-list-ul mr-2" />Chi tiết đơn #{selectedOrder?.ma_don_hang}</h3>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white"><i className="fa-solid fa-xmark text-xl" /></button>
            </div>
            <div className="p-5">
              {chiTiet.length === 0
                ? <div className="text-center py-8 text-gray-400"><i className="fa-solid fa-spinner fa-spin text-3xl mb-3 block" /></div>
                : <div className="space-y-2">
                    {chiTiet.map((item, i) => (
                      <div key={i} className="flex items-start justify-between p-3 rounded-xl bg-gray-50">
                        <div className="flex-1">
                          <span className="font-semibold text-gray-800 mr-2">{item.ten_mon_an}{item.ten_size && <span className="ml-1 text-orange-500 text-xs">(Size {item.ten_size})</span>}</span>
                          <span className="text-gray-400">× {item.so_luong}</span>
                          {item.ghi_chu && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.ghi_chu.split(',').map((t, j) => (
                                <span key={j} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{t.trim()}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-gray-500 text-sm font-semibold ml-2">×{item.so_luong}</span>
                      </div>
                    ))}
                  </div>
              }
            </div>
            <div className="p-4 border-t flex justify-end">
              <button onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700">Đóng</button>
            </div>
          </div>
        </div>
      )}
      {reportOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReportOrder(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5 bg-gradient-to-r from-red-500 to-red-600 rounded-t-3xl flex items-center justify-between">
              <h3 className="font-bold text-white"><i className="fa-solid fa-flag mr-2" />Báo cáo / Khiếu nại</h3>
              <button onClick={() => setReportOrder(null)} className="text-white/70 hover:text-white"><i className="fa-solid fa-xmark text-xl" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <i className="fa-solid fa-circle-info mr-2" />Báo cáo đơn hàng <b>#{reportOrder.ma_don_hang}</b>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tiêu đề <span className="text-red-400">*</span></label>
                <input value={reportForm.tieu_de} onChange={e => setReportForm(f => ({ ...f, tieu_de: e.target.value }))}
                  placeholder="VD: Shipper khó tính, hệ thống lỗi..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nội dung <span className="text-red-400">*</span></label>
                <textarea rows={4} value={reportForm.noi_dung} onChange={e => setReportForm(f => ({ ...f, noi_dung: e.target.value }))}
                  placeholder="Mô tả chi tiết vấn đề..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ảnh đính kèm</label>
                <input type="file" accept="image/*" onChange={e => setReportForm(f => ({ ...f, hinh_anh: e.target.files[0] }))}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-red-50 file:text-red-700 file:font-semibold hover:file:bg-red-100 cursor-pointer" />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setReportOrder(null)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button>
              <button onClick={sendReport} disabled={reportLoading}
                className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 disabled:opacity-60 flex items-center gap-2">
                {reportLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-paper-plane" />}
                Gửi báo cáo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal yêu cầu hủy đơn */}
      {cancelRequestOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCancelRequestOrder(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5 bg-gradient-to-r from-orange-500 to-red-500 rounded-t-3xl flex items-center justify-between">
              <h3 className="font-bold text-white"><i className="fa-solid fa-ban mr-2" />Yêu cầu hủy đơn</h3>
              <button onClick={() => setCancelRequestOrder(null)} className="text-white/70 hover:text-white"><i className="fa-solid fa-xmark text-xl" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-700">
                <i className="fa-solid fa-triangle-exclamation mr-2" />
                Gửi yêu cầu hủy đơn <b>#{cancelRequestOrder.ma_don_hang}</b>. Admin sẽ xem xét và phê duyệt.
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Lý do hủy đơn <span className="text-red-400">*</span></label>
                <textarea
                  rows={4}
                  value={cancelForm.ly_do}
                  onChange={e => setCancelForm(f => ({ ...f, ly_do: e.target.value }))}
                  placeholder="VD: Hết nguyên liệu, bếp gặp sự cố, cần hủy gấp..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none"
                />
              </div>
              <p className="text-xs text-gray-400"><i className="fa-solid fa-circle-info mr-1" />Khách hàng và shipper sẽ được thông báo cáo sau khi admin phê duyệt.</p>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setCancelRequestOrder(null)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Bỏ qua</button>
              <button onClick={sendCancelRequest} disabled={cancelLoading}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm hover:opacity-90 disabled:opacity-60 flex items-center gap-2">
                {cancelLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-paper-plane" />}
                Gửi yêu cầu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
