import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatVND } from '../../utils/helpers';

/**
 * Trang này nhận callback từ PayOS sau khi thanh toán
 * URL: /payment/payos/return?orderCode=...&status=...&code=...
 *
 * PayOS sẽ redirect về returnUrl/cancelUrl bạn đã cấu hình
 *
 * Cần thêm route trong router:
 *   { path: '/payment/payos/return', element: <PaymentReturn /> }
 *   { path: '/payment/payos/cancel', element: <PaymentReturn /> }
 */
export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | cancel | error
  const [orderInfo, setOrderInfo] = useState(null);

  // PayOS trả về: ?orderCode=...&status=PAID/CANCELLED&code=00/...&id=...&cancel=false/true
  const orderCode = searchParams.get('orderCode');
  const payosStatus = searchParams.get('status');
  const code = searchParams.get('code');
  const isCancel = searchParams.get('cancel') === 'true';

  useEffect(() => {
    const detectStatus = async () => {
      // Kiểm tra URL path - nếu là /cancel thì tự biết
      const path = window.location.pathname;
      const isOnCancelPage = path.includes('/cancel');

      if (isOnCancelPage || isCancel || payosStatus === 'CANCELLED') {
        setStatus('cancel');
        return;
      }

      if (code === '00' || payosStatus === 'PAID') {
        setStatus('success');
        if (orderCode) {
          try {
            // Hiển thị thông tin
            const resThongTin = await api.get(`/api/payos/thong-tin/${orderCode}`);
            if (resThongTin.data.status) {
              setOrderInfo(resThongTin.data.data);
            }
            
            // TỰ ĐỘNG CHỐNG TỊT WEBHOOK: Gọi thêm 1 request update S2S để chắc chắn Đơn được gạch nợ
            await api.post(`/api/payos/xac-nhan-s2s`, { orderCode });
          } catch {}
        }
      } else {
        setStatus('error');
      }
    };

    detectStatus();
  }, []);

  // Tự redirect về đơn hàng sau 5s nếu thành công
  useEffect(() => {
    if (status === 'success') {
      const t = setTimeout(() => navigate('/khach-hang/don-hang'), 5000);
      return () => clearTimeout(t);
    }
  }, [status]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Loading */}
        {status === 'loading' && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"/>
            <p className="text-gray-500">Đang xác nhận thanh toán...</p>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <div className="p-8 text-center" style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <i className="fa-solid fa-check text-white text-4xl"/>
              </div>
              <h1 className="text-2xl font-bold text-white">Thanh toán thành công!</h1>
              <p className="text-white/70 mt-1 text-sm">Đơn hàng của bạn đã được xác nhận</p>
            </div>
            <div className="p-6 space-y-4">
              {orderInfo && (
                <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mã đơn</span>
                    <code className="text-purple-700 font-bold">#{orderInfo.orderCode}</code>
                  </div>
                  {orderInfo.amount && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Số tiền</span>
                      <span className="font-bold text-green-600">{formatVND(orderInfo.amount)}</span>
                    </div>
                  )}
                  {orderInfo.status && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Trạng thái PayOS</span>
                      <span className="font-semibold text-green-600">{orderInfo.status}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700 flex items-start gap-2">
                <i className="fa-solid fa-circle-check mt-0.5"/>
                <span>Hệ thống đã ghi nhận thanh toán. Đơn hàng sẽ được xử lý ngay!</span>
              </div>

              <p className="text-xs text-gray-400 text-center">
                <i className="fa-solid fa-clock mr-1"/>Tự động chuyển về đơn hàng sau 5 giây...
              </p>

              <Link to="/khach-hang/don-hang"
                className="block w-full py-3 rounded-2xl text-center text-white font-bold hover:opacity-90 transition-all"
                style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
                <i className="fa-solid fa-bag-shopping mr-2"/>Xem đơn hàng ngay
              </Link>
            </div>
          </>
        )}

        {/* Cancel */}
        {status === 'cancel' && (
          <>
            <div className="p-8 text-center bg-gradient-to-br from-gray-600 to-gray-800">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-xmark text-white text-4xl"/>
              </div>
              <h1 className="text-2xl font-bold text-white">Đã huỷ thanh toán</h1>
              <p className="text-white/70 mt-1 text-sm">Bạn đã huỷ quá trình thanh toán</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700 flex items-start gap-2">
                <i className="fa-solid fa-circle-info mt-0.5"/>
                <span>Đơn hàng vẫn còn hiệu lực. Bạn có thể thanh toán lại bất cứ lúc nào.</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/"
                  className="block py-3 rounded-2xl text-center bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-all">
                  <i className="fa-solid fa-home mr-2"/>Trang chủ
                </Link>
                <Link to="/khach-hang/don-hang"
                  className="block py-3 rounded-2xl text-center text-white font-bold hover:opacity-90 transition-all"
                  style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
                  <i className="fa-solid fa-bag-shopping mr-2"/>Đơn hàng
                </Link>
              </div>
            </div>
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div className="p-8 text-center bg-gradient-to-br from-red-500 to-red-700">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-triangle-exclamation text-white text-4xl"/>
              </div>
              <h1 className="text-2xl font-bold text-white">Thanh toán thất bại</h1>
              <p className="text-white/70 mt-1 text-sm">Có lỗi xảy ra trong quá trình thanh toán</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-start gap-2">
                <i className="fa-solid fa-circle-xmark mt-0.5"/>
                <span>Giao dịch không thành công. Tiền của bạn không bị trừ. Vui lòng thử lại.</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/"
                  className="block py-3 rounded-2xl text-center bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-all">
                  <i className="fa-solid fa-home mr-2"/>Trang chủ
                </Link>
                <Link to="/khach-hang/don-hang"
                  className="block py-3 rounded-2xl text-center text-white font-bold hover:opacity-90 transition-all"
                  style={{background:'linear-gradient(135deg,#ef4444,#dc2626)'}}>
                  <i className="fa-solid fa-rotate-right mr-2"/>Thử lại
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
