import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { formatVND } from '../../utils/helpers';

/**
 * Trang nhận callback từ PayOS khi thanh toán qua chatbot Bee.
 * Sau khi xử lý xong → mở lại chatbot widget với thông báo thành công/thất bại.
 *
 * BE gọi PayOSService::taoLinkThanhToan() với returnUrl = BASE/chatbot/payment/return
 * → PayOS redirect về đây → xác nhận → quay lại chatbot.
 */
export default function ChatbotPaymentReturn() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | cancel | error
  const [orderInfo, setOrderInfo] = useState(null);

  const orderCode = searchParams.get('orderCode');
  const payosStatus = searchParams.get('status');
  const code = searchParams.get('code');
  const isCancel = searchParams.get('cancel') === 'true';
  const isOnCancelPath = window.location.pathname.includes('/cancel');

  const openFoodBeeApp = useCallback((targetStatus = status) => {
    const path = targetStatus === 'cancel' ? 'cancel' : 'success';
    const params = new URLSearchParams({
      source: 'chatbot',
      ...(orderCode ? { orderCode } : {}),
      ...(orderInfo?.amount ? { amount: String(orderInfo.amount) } : {}),
    });
    window.location.href = `foodbee://payos/${path}?${params.toString()}`;
  }, [orderCode, orderInfo, status]);

  useEffect(() => {
    const detect = async () => {
      try {
        if (isOnCancelPath || isCancel || payosStatus === 'CANCELLED') {
          setStatus('cancel');
          sessionStorage.setItem('chatbot_pay_result', JSON.stringify({ status: 'cancel' }));
          return;
        }

        if (code === '00' || payosStatus === 'PAID') {
          setStatus('success');
          if (orderCode) {
            try {
              const resThongTin = await api.get(`/api/payos/thong-tin/${orderCode}`);
              const info = resThongTin.data.status ? resThongTin.data.data : null;
              if (info) setOrderInfo(info);
              sessionStorage.setItem('chatbot_pay_result', JSON.stringify({
                status: 'success',
                orderCode,
                amount: info?.amount || 0,
              }));
              await api.post(`/api/payos/xac-nhan-s2s`, { orderCode });
            } catch {
              sessionStorage.setItem('chatbot_pay_result', JSON.stringify({
                status: 'success',
                orderCode,
                amount: 0,
              }));
            }
          } else {
            sessionStorage.setItem('chatbot_pay_result', JSON.stringify({ status: 'success' }));
          }
        } else {
          setStatus('error');
          sessionStorage.setItem('chatbot_pay_result', JSON.stringify({ status: 'error' }));
        }
      } catch {
        setStatus('error');
        sessionStorage.setItem('chatbot_pay_result', JSON.stringify({ status: 'error' }));
      }
    };

    detect();
  }, [code, isCancel, isOnCancelPath, orderCode, payosStatus]);

  // Auto-close sau 5s (mobile-friendly)
  useEffect(() => {
    if (status !== 'loading') {
      const openAppTimer = setTimeout(() => {
        openFoodBeeApp(status);
      }, 700);
      const t = setTimeout(() => {
        // Mở chatbot widget & quay về trang chủ
        window.sessionStorage.removeItem('chatbot_pay_result');
        window.location.href = '/';
      }, status === 'success' ? 5000 : 8000);
      return () => {
        clearTimeout(openAppTimer);
        clearTimeout(t);
      };
    }
  }, [openFoodBeeApp, status]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* ── Loading ── */}
        {status === 'loading' && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 border-4 border-green-100 border-t-green-500 rounded-full animate-spin mx-auto mb-4"/>
            <p className="text-gray-500 font-medium">Đang xác nhận thanh toán PayOS...</p>
            <p className="text-xs text-gray-400 mt-2">Vui lòng chờ trong giây lát</p>
          </div>
        )}

        {/* ── Success ── */}
        {status === 'success' && (
          <>
            <div className="p-8 text-center" style={{background:'linear-gradient(135deg,#059669,#10b981)'}}>
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <i className="fa-solid fa-check text-white text-4xl"/>
              </div>
              <h1 className="text-2xl font-bold text-white">Thanh toán thành công!</h1>
              <p className="text-white/80 mt-1 text-sm">Bee đã nhận được thanh toán của bạn 🎉</p>
            </div>
            <div className="p-6 space-y-4">
              {orderInfo && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 space-y-2 text-sm border border-green-100">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mã đơn</span>
                    <code className="text-green-700 font-bold">#{orderInfo.orderCode}</code>
                  </div>
                  {orderInfo.amount && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Số tiền</span>
                      <span className="font-bold text-green-600">{formatVND(orderInfo.amount)}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 flex items-start gap-2">
                <i className="fa-solid fa-circle-check mt-0.5 flex-shrink-0"/>
                <span>Đơn hàng đã được xác nhận! Shipper sẽ liên hệ giao hàng sớm nhất.</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 flex items-center gap-2">
                <i className="fa-solid fa-robot mt-0.5 flex-shrink-0"/>
                <span>Bee sẽ cập nhật trạng thái đơn cho bạn tự động nhé!</span>
              </div>
              <p className="text-xs text-gray-400 text-center">
                <i className="fa-solid fa-clock mr-1"/>Tự động quay về trang chính sau 5s...
              </p>
              <button type="button"
                onClick={() => openFoodBeeApp('success')}
                className="block w-full py-3 rounded-2xl text-center text-white font-bold hover:opacity-90 transition-all"
                style={{background:'linear-gradient(135deg,#059669,#10b981)'}}>
                <i className="fa-solid fa-robot mr-2"/>Quay lại chat với Bee 🐝
              </button>
            </div>
          </>
        )}

        {/* ── Cancel ── */}
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
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-700 flex items-start gap-2">
                <i className="fa-solid fa-circle-info mt-0.5 flex-shrink-0"/>
                <span>Đơn hàng vẫn còn hiệu lực. Bạn có thể thanh toán lại trong mục <strong>Đơn hàng</strong> nhé!</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-600 flex items-start gap-2">
                <i className="fa-solid fa-robot mt-0.5 flex-shrink-0 text-purple-500"/>
                <span>Quay lại chat với Bee để tiếp tục đặt hàng hoặc chọn thanh toán khác.</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/"
                  className="block py-3 rounded-2xl text-center bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-all">
                  <i className="fa-solid fa-home mr-2"/>Trang chủ
                </Link>
                <button type="button"
                  onClick={() => openFoodBeeApp('cancel')}
                  className="block py-3 rounded-2xl text-center text-white font-bold hover:opacity-90 transition-all"
                  style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
                  <i className="fa-solid fa-robot mr-2"/>Chat Bee
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Error ── */}
        {status === 'error' && (
          <>
            <div className="p-8 text-center bg-gradient-to-br from-red-500 to-red-700">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-triangle-exclamation text-white text-4xl"/>
              </div>
              <h1 className="text-2xl font-bold text-white">Thanh toán thất bại</h1>
              <p className="text-white/70 mt-1 text-sm">Giao dịch không thành công</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
                <i className="fa-solid fa-circle-xmark mt-0.5 flex-shrink-0"/>
                <span>Tiền của bạn <strong>không bị trừ</strong>. Vui lòng thử lại hoặc chọn thanh toán khác.</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/"
                  className="block py-3 rounded-2xl text-center bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-all">
                  <i className="fa-solid fa-home mr-2"/>Trang chủ
                </Link>
                <Link to="/"
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
