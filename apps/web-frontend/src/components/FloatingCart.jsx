import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function FloatingCart() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState({ count: 0, id_quan_an: null });
  const [show, setShow] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await api.get('/api/khach-hang/gio-hang/summary');
      if (res.data.status && res.data.count > 0) {
        setCart({ count: res.data.count, id_quan_an: res.data.id_quan_an });
        setShow(true);
      } else {
        setShow(false);
      }
    } catch {
      setShow(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchCart();
    window.addEventListener('cart-updated', fetchCart);
    return () => window.removeEventListener('cart-updated', fetchCart);
  }, [fetchCart]);

  if (!isLoggedIn || !show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] animate-bounce-subtle">
      <button
        onClick={() => cart.id_quan_an ? navigate(`/khach-hang/quan-an/${cart.id_quan_an}`) : toast.error('Giỏ hàng trống!')}
        className="flex items-center gap-3 px-6 py-4 rounded-full bg-orange-500 text-white shadow-2xl hover:bg-orange-600 transition-all transform hover:scale-110 active:scale-95 group"
      >
        <div className="relative">
          <i className="fa-solid fa-cart-shopping text-xl"></i>
          <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white ring-2 ring-white shadow-sm">
            {cart.count}
          </span>
        </div>
        <div className="flex flex-col items-start leading-none pr-1">
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Giỏ hàng của bạn</span>
          <span className="text-sm font-black">XEM NGAY & THANH TOÁN</span>
        </div>
        <i className="fa-solid fa-chevron-right text-xs group-hover:translate-x-1 transition-transform"></i>
      </button>
      
      {/* Subtle pulse ring around the button */}
      <div className="absolute inset-0 rounded-full animate-ping bg-orange-500 opacity-20 pointer-events-none"></div>
    </div>
  );
}
