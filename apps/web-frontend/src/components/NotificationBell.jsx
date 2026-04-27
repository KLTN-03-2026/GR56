import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { rtToast } from './RealtimeToast';

const STATUS_BADGE = {
  cho_xu_ly:       { label: 'Chờ xử lý',      cls: 'bg-yellow-100 text-yellow-700', icon: 'fa-hourglass-half' },
  dang_xu_ly:      { label: 'Đang xử lý',     cls: 'bg-blue-100 text-blue-700',   icon: 'fa-spinner' },
  da_xu_ly:        { label: 'Đã giải quyết',  cls: 'bg-green-100 text-green-700', icon: 'fa-circle-check' },
  order_cancelled: { label: 'Đơn đã bị hủy',  cls: 'bg-red-100 text-red-700',   icon: 'fa-circle-xmark' },
  refund_success:  { label: 'Đã hoàn tiền',   cls: 'bg-emerald-100 text-emerald-700', icon: 'fa-coins' },
};

const ICON_MAP = {
  cho_xu_ly:       { icon: 'fa-hourglass-half', bg: 'bg-yellow-100 text-yellow-600' },
  dang_xu_ly:      { icon: 'fa-arrows-rotate',  bg: 'bg-blue-100 text-blue-600' },
  da_xu_ly:        { icon: 'fa-circle-check',   bg: 'bg-green-100 text-green-600' },
  order_cancelled: { icon: 'fa-circle-xmark',   bg: 'bg-red-100 text-red-600' },
  report_processed:{ icon: 'fa-circle-check',   bg: 'bg-green-100 text-green-600' },
  refund_success:  { icon: 'fa-coins',          bg: 'bg-emerald-100 text-emerald-600' },
  sale:            { icon: 'fa-gift',            bg: 'bg-orange-100 text-orange-600' },
  event:           { icon: 'fa-bullhorn',        bg: 'bg-purple-100 text-purple-600' },
  news:            { icon: 'fa-newspaper',       bg: 'bg-blue-100 text-blue-600' },
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function NotificationBell({ userType, userId, token }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Gọi API lấy thông báo, dùng token được truyền vào
  const fetchNotifications = async (authToken) => {
    try {
      const res = await api.get('/api/notifications', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.data.status) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (e) {
      console.warn('NotificationBell: Error fetching notifications', e);
    }
  };

  const markAsRead = async (id = null) => {
    try {
      const res = await api.post('/api/notifications/mark-read', { id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.status) {
        if (id) {
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
        } else {
          setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
        }
        setUnreadCount(res.data.unread_count ?? 0);
      }
    } catch (e) {
      console.warn('NotificationBell: Error marking as read', e);
    }
  };

  // ── Setup Echo realtime listener ──────────────────────────────────────────
  useEffect(() => {
    // Cần có đủ cả 3 thứ: token, userType, userId mới subscribe
    if (!token || !userType || !userId) return;

    let channelName = '';
    if (userType === 'khach_hang') channelName = `khach-hang.${userId}`;
    else if (userType === 'shipper') channelName = `shipper.${userId}`;
    else if (userType === 'quan_an') channelName = `quan-an.${userId}`;

    if (!channelName) return;

    let echoInstance = null;
    let isCancelled = false;

    const setup = async () => {
      try {
        const { default: echo, updateEchoToken } = await import('../utils/echo');
        if (isCancelled) return;
        updateEchoToken();
        echoInstance = echo;

        // Lấy thông báo cũ từ DB
        await fetchNotifications(token);
        if (isCancelled) return;

        // Subscribe realtime - lưu reference để cleanup đúng cách
        console.log('[NotificationBell] Listening on private channel:', channelName);
        const notifChannel = echo.private(channelName);
        const notifHandler = (notification) => {
          if (isCancelled) return;
          console.log('[NotificationBell] Received notification:', notification);
          setNotifications(prev => [
            {
              id: notification.id || Date.now().toString(),
              data: notification,
              read_at: null,
              created_at: new Date().toISOString()
            },
            ...prev
          ]);
          setUnreadCount(prev => prev + 1);

          // Skip toast nếu là notification hủy đơn (đã show ở ClientLayout)
          if (notification.loai !== 'order_cancelled' && notification.type !== 'order_cancelled') {
            const isRefund = notification.type === 'refund_success';
            const nType = isRefund ? 'success' : (notification.trang_thai === 'da_xu_ly' ? 'success' : 'notification');
            rtToast.show({
              type: nType,
              title: notification.title || (isRefund ? '💸 Hoàn tiền thành công!' : 'Bạn có thông báo mới!'),
              message: notification.message || '',
              duration: isRefund ? 8000 : 6000,
            });
          }
        };
        notifChannel.notification(notifHandler);
        // Lưu để cleanup
        echoInstance.__notifChannel = notifChannel;
        echoInstance.__notifHandler = notifHandler;
      } catch (err) {
        console.error('[NotificationBell] Setup error:', err);
      }
    };

    setup();

    return () => {
      isCancelled = true;
      // KHÔNG dùng echo.leave() vì sẽ phá hủy channel của QuanAnLayout/ShipperLayout/ClientLayout
      // Chỉ dừng lắng nghe notification trên channel này
      if (echoInstance && echoInstance.__notifChannel && echoInstance.__notifHandler) {
        try {
          echoInstance.__notifChannel.stopListening('.notification', echoInstance.__notifHandler);
        } catch {}
      }
    };
  }, [token, userType, userId]);
  // ──────────────────────────────────────────────────────────────────────────

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Khi mở dropdown, mark-as-read chỉ xảy ra khi user chủ động click vào từng item
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
        title="Thông báo"
      >
        <i className="fa-regular fa-bell text-xl"></i>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white shadow-sm animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="p-4 bg-gray-50 border-b flex items-center justify-between sticky top-0 z-10">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <i className="fa-regular fa-bell text-orange-500"></i>
              Thông báo
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px]">
                  {unreadCount}
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAsRead()}
                className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
              >
                <i className="fa-solid fa-check-double"></i>
                Đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto w-full max-h-96">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <i className="fa-regular fa-bell-slash text-4xl mb-3 text-gray-200 block"></i>
                <p className="text-sm">Chưa có thông báo nào</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map(notif => {
                  const d = notif.data || {};
                  // loai: order_cancelled | report_processed | sale | event | news
                  const isBroadcast = d.type === 'broadcast' || d.thong_bao_id !== undefined;
                  const isOrderCancelled = d.loai === 'order_cancelled' || d.type === 'order_cancelled';
                  const isRefundSuccess = d.type === 'refund_success';
                  const statusInfo = ICON_MAP[d.type] || ICON_MAP[d.loai] || ICON_MAP[d.trang_thai] || ICON_MAP['da_xu_ly'];
                  // Badge - ưu tiên theo loại notification
                  const badge = isRefundSuccess
                    ? STATUS_BADGE['refund_success']
                    : isOrderCancelled
                    ? STATUS_BADGE['order_cancelled']
                    : STATUS_BADGE[d.trang_thai];
                  const isUnread = !notif.read_at;
                  
                  const handleClick = () => {
                    if (isUnread) markAsRead(notif.id);
                    if (isRefundSuccess) {
                      window.location.href = d.url || '/khach-hang/don-hang';
                      setOpen(false);
                    } else if (isBroadcast && d.link) {
                      window.location.href = d.link;
                      setOpen(false);
                    }
                  };

                  return (
                    <div
                      key={notif.id}
                      onClick={handleClick}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        isRefundSuccess ? 'bg-emerald-50/50 border-l-2 border-emerald-400' :
                        isOrderCancelled ? 'bg-red-50/50 border-l-2 border-red-300' :
                        isUnread ? 'bg-orange-50/40' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Biểu tượng */}
                        <div className="flex-shrink-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isUnread ? statusInfo.bg : 'bg-gray-100 text-gray-400'}`}>
                            <i className={`fa-solid ${statusInfo.icon} text-base`} />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className={`text-sm font-semibold leading-tight ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>
                              {d.title || 'Thông báo mới'}
                            </span>
                            {isUnread && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500 mt-1.5" />}
                          </div>

                          {/* Nội dung */}
                          <p className={`text-xs leading-relaxed ${isUnread ? 'text-gray-700' : 'text-gray-400'} ${isBroadcast ? 'line-clamp-2' : ''}`}>
                            {d.message}
                          </p>

                          {/* Ảnh banner (nếu có - chỉ dành cho broadcast) */}
                          {isBroadcast && d.hinh_anh && (
                            <div className="mt-2 text-center">
                              <img src={d.hinh_anh.startsWith('http') ? d.hinh_anh : `${import.meta.env.VITE_API_URL}${d.hinh_anh}`} alt="Banner" className="w-full h-auto rounded-xl object-cover border border-gray-100" />
                            </div>
                          )}

                          {/* Badges */}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {badge && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>
                                <i className={`fa-solid ${badge.icon} text-[9px]`} />
                                {badge.label}
                              </span>
                            )}
                            {d.ma_don_hang && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                                <i className="fa-solid fa-bag-shopping text-[9px]" />
                                #{d.ma_don_hang}
                              </span>
                            )}
                            {isBroadcast && d.loai_label && (
                               <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 border border-blue-200 text-blue-600">
                                  {d.loai_label}
                               </span>
                            )}
                          </div>

                          {/* Banner hoàn tiền thành công */}
                          {isRefundSuccess && d.so_tien && (
                            <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center gap-2">
                              <i className="fa-solid fa-coins text-emerald-500 text-sm"/>
                              <div>
                                <div className="text-[10px] text-emerald-600 font-semibold">Đã hoàn vào tài khoản</div>
                                <div className="text-sm font-extrabold text-emerald-700">
                                  +{Number(d.so_tien).toLocaleString('vi-VN')}đ
                                </div>
                                {d.ngan_hang && <div className="text-[10px] text-emerald-600">{d.ngan_hang} - {d.so_tai_khoan}</div>}
                              </div>
                            </div>
                          )}
                          {isRefundSuccess && (
                            <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                              XEM ĐƠN HÀNG <i className="fa-solid fa-arrow-right"/>
                            </div>
                          )}

                          {/* Link đính kèm (broadcast thông thường) */}
                          {!isRefundSuccess && isBroadcast && d.link && (
                            <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-lg">
                              XEM CHI TIẾT <i className="fa-solid fa-arrow-right" />
                            </div>
                          )}

                          {/* Admin note (dành cho reports) */}
                          {!isBroadcast && d.ghi_chu_admin && (
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 mt-2">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 mb-1">
                                <i className="fa-solid fa-comment-dots" />
                                Phản hồi từ Admin:
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed">{d.ghi_chu_admin}</p>
                            </div>
                          )}

                          {/* Time */}
                          <span className="text-[10px] text-gray-400 mt-2 block">
                            {timeAgo(notif.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
