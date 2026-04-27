import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { rtToast } from '../components/RealtimeToast';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ChatbotWidget from '../components/ChatbotWidget';
import { useAuth } from '../context/AuthContext';
import ChatBox from '../components/ChatBox';
import { useState } from 'react';

export default function ClientLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [chatOrder, setChatOrder] = useState(null);

  // ─── Global real-time: order status from ANY customer page ───────────────
  useEffect(() => {
    if (!user?.id) return;
    let channel = null;
    let handlers = {};
    let isCancelled = false;

    const setup = async () => {
      try {
        const { default: echo, updateEchoToken } = await import('../utils/echo');
        if (isCancelled) return;
        updateEchoToken();
        channel = echo.private(`khach-hang.${user.id}`);

        const goToOrders = (tab) => (data) => {
          const dh = data.don_hang || data || {};
          const configs = {
            '1': { title: 'Shipper đã nhận đơn!', message: `Shipper đang trên đường đến quán lấy đơn #${dh.ma_don_hang || ''}.`, type: 'order' },
            '2': { title: 'Quán đang nấu món!', message: `Đơn #${dh.ma_don_hang || ''} đang được chuẩn bị.`, type: 'order' },
            '3': { title: 'Đơn đang trên đường giao!', message: `Shipper đang giao đơn #${dh.ma_don_hang || ''} đến bạn.`, type: 'order' },
            '4': { title: 'Giao hàng thành công!', message: `Đơn #${dh.ma_don_hang || ''} đã đến tay bạn. Cảm ơn!`, type: 'success' },
            '5': { title: 'Đơn hàng đã bị hủy', message: `Yêu cầu hủy đơn #${dh.ma_don_hang || ''} đã được admin duyệt.`, type: 'cancel' },
          };
          const cfg = configs[tab] || { title: 'Cập nhật đơn hàng', message: '', type: 'order' };
          // Luôn show toast, chỉ skip navigate nếu đang ở trang đơn hàng
          rtToast.show({ ...cfg, orderCode: dh.ma_don_hang, duration: 6000, onClick: () => navigate('/khach-hang/don-hang', { state: { tab } }) });
          if (!window.location.pathname.startsWith('/khach-hang/don-hang')) {
            navigate('/khach-hang/don-hang', { state: { tab } });
          }
        };

        handlers = {
          '.don-hang.da-nhan': goToOrders('1'),
          '.don-hang.dang-lam': goToOrders('2'),
          '.don-hang.da-xong': goToOrders('3'),
          '.don-hang.hoan-thanh': goToOrders('4'),
          '.don-hang.da-huy': (data) => {
            const dh = data.don_hang || data || {};
            const isAutoCancel = dh.ly_do === 'auto_cancel';
            const tien = dh.tong_tien ? new Intl.NumberFormat('vi-VN').format(dh.tong_tien) + 'đ' : '';
            const msg = isAutoCancel
              ? `Đơn #${dh.ma_don_hang || ''} bị hủy tự động do không có shipper nhận.${tien ? ' Hoàn tiền ' + tien + ' đang xử lý.' : ''}`
              : `Yêu cầu hủy đơn #${dh.ma_don_hang || ''} đã được admin duyệt.`;
            rtToast.show({
              title: isAutoCancel ? '⏱️ Đơn bị hủy tự động' : '❌ Đơn hàng đã bị hủy',
              message: msg,
              type: 'cancel',
              orderCode: dh.ma_don_hang,
              duration: 8000,
              onClick: () => navigate('/khach-hang/don-hang', { state: { tab: '5' } })
            });
            if (!window.location.pathname.startsWith('/khach-hang/don-hang')) {
              navigate('/khach-hang/don-hang', { state: { tab: '5' } });
            }
          },
          '.tin-nhan.moi': (data) => {
            const msg = data.tin_nhan;
            // Chỉ mở tự động nếu người gửi không phải là chính mình (đã lọc ở backend nhưng double check)
            if (msg.loai_nguoi_gui !== 'khach_hang') {
              // Nếu đang nhắn đơn khác hoặc chưa mở chat, tự động mở đơn mới nhắn
              setChatOrder(prev => {
                if (prev?.id === msg.id_don_hang) return prev;
                return { id: msg.id_don_hang, ho_va_ten_shipper: 'Shipper' };
              });
            }
          }
        };
        Object.entries(handlers).forEach(([evt, fn]) => channel.listen(evt, fn));
      } catch { }
    };

    setup();
    return () => {
      isCancelled = true;
      if (channel) {
        Object.entries(handlers).forEach(([evt, fn]) => {
          try { channel.stopListening(evt, fn); } catch { }
        });
        // Không leave channel ở đây vì KhachHang/DonHang.jsx cùng dùng
      }
    };
  }, [user?.id]); // Chỉ re-run khi user thay đổi, KHÔNG phụ thuộc location.pathname
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1" style={{ paddingTop: '70px' }}>
        <Outlet />
      </main>
      <Footer />
      <ChatbotWidget />

      {chatOrder && (
        <ChatBox
          orderId={chatOrder.id}
          currentUserType="khach_hang"
          onClose={() => setChatOrder(null)}
          otherPartyName={chatOrder.ho_va_ten_shipper || 'Shipper'}
        />
      )}
    </div>
  );
}

