import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ─── Toast Store (singleton) ─────────────────────────────────────────────────
let _listeners = [];
let _toasts = [];
let _idCounter = 0;
// Dedup: lưu key gần đây để tránh hiện trùng lặp
const _recentKeys = new Map(); // key → timestamp
const DEDUP_WINDOW_MS = 5000;  // 5 giây - chặn duplicate cùng loại trong 5s

function notify(listeners, toasts) {
  listeners.forEach(fn => fn([...toasts]));
}

export const rtToast = {
  /**
   * @param {object} options
   * @param {string} options.type - 'order' | 'cancel' | 'notification' | 'success' | 'error' | 'info'
   * @param {string} options.title
   * @param {string} options.message
   * @param {string} [options.orderCode] - Mã đơn hàng
   * @param {number} [options.duration] - ms, default 6000
   * @param {Function} [options.onClick]
   */
  show(options) {
    // Deduplication: nếu cùng type+orderCode trong DEDUP_WINDOW_MS thì bỏ qua
    const dedupKey = `${options.type}__${options.orderCode || options.title}`;
    const now = Date.now();
    if (_recentKeys.has(dedupKey) && now - _recentKeys.get(dedupKey) < DEDUP_WINDOW_MS) {
      return null; // Duplicate - bỏ qua
    }
    _recentKeys.set(dedupKey, now);
    // Dọn dẹp keys cũ sau 5 giây
    setTimeout(() => _recentKeys.delete(dedupKey), DEDUP_WINDOW_MS + 2000);

    const id = ++_idCounter;
    const toast = { id, ...options, duration: options.duration ?? 6000 };
    _toasts = [toast, ..._toasts.slice(0, 4)]; // max 5 toasts
    notify(_listeners, _toasts);
    setTimeout(() => rtToast.dismiss(id), toast.duration);
    return id;
  },
  dismiss(id) {
    _toasts = _toasts.filter(t => t.id !== id);
    notify(_listeners, _toasts);
  },
  subscribe(fn) {
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter(l => l !== fn); };
  }
};

// ─── Icons per type ──────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  order: {
    icon: 'fa-bag-shopping',
    gradient: 'from-orange-500 to-amber-400',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    iconColor: 'text-white',
    titleColor: 'text-orange-700',
  },
  cancel: {
    icon: 'fa-circle-xmark',
    gradient: 'from-red-500 to-rose-400',
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconColor: 'text-white',
    titleColor: 'text-red-700',
  },
  notification: {
    icon: 'fa-bell',
    gradient: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-white',
    titleColor: 'text-blue-700',
  },
  success: {
    icon: 'fa-circle-check',
    gradient: 'from-green-500 to-emerald-400',
    bg: 'bg-green-50',
    border: 'border-green-200',
    iconColor: 'text-white',
    titleColor: 'text-green-700',
  },
  error: {
    icon: 'fa-triangle-exclamation',
    gradient: 'from-red-500 to-pink-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconColor: 'text-white',
    titleColor: 'text-red-700',
  },
  info: {
    icon: 'fa-circle-info',
    gradient: 'from-sky-500 to-blue-400',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    iconColor: 'text-white',
    titleColor: 'text-sky-700',
  },
};

// ─── Single Toast Card ────────────────────────────────────────────────────────
function ToastCard({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const cfg = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  const handleClick = () => {
    if (toast.onClick) toast.onClick();
    handleDismiss();
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)]
        rounded-2xl border shadow-xl overflow-hidden
        transition-all duration-300 ease-out cursor-pointer
        ${cfg.bg} ${cfg.border}
        ${visible && !leaving
          ? 'opacity-100 translate-x-0 scale-100'
          : 'opacity-0 translate-x-8 scale-95'}
      `}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${cfg.gradient} rounded-full`}
        style={{
          width: '100%',
          animation: `shrink ${toast.duration}ms linear forwards`,
        }}
      />

      {/* Icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-md ml-3 mt-3`}>
        <i className={`fa-solid ${cfg.icon} ${cfg.iconColor} text-sm`} />
      </div>

      {/* Content */}
      <div className="flex-1 py-3 pr-2 min-w-0">
        <div className={`font-bold text-sm leading-tight ${cfg.titleColor}`}>
          {toast.title}
        </div>
        {toast.message && (
          <div className="text-xs text-gray-600 mt-0.5 leading-relaxed line-clamp-2">
            {toast.message}
          </div>
        )}
        {toast.orderCode && (
          <div className="mt-1.5 inline-flex items-center gap-1 bg-white/70 border border-gray-200 px-2 py-0.5 rounded-lg">
            <i className="fa-solid fa-hashtag text-[9px] text-gray-400" />
            <span className="text-[10px] font-black text-gray-700 tracking-tight">{toast.orderCode}</span>
          </div>
        )}
        {toast.onClick && (
          <div className="mt-1.5 text-[10px] font-bold text-gray-400 flex items-center gap-1">
            Bấm để xem <i className="fa-solid fa-arrow-right text-[8px]" />
          </div>
        )}
      </div>

      {/* Close btn */}
      <button
        onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
        className="flex-shrink-0 mt-2 mr-2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200/70 hover:bg-gray-300 transition-colors"
      >
        <i className="fa-solid fa-xmark text-[10px] text-gray-500" />
      </button>
    </div>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────
export default function RealtimeToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsub = rtToast.subscribe(setToasts);
    setToasts([..._toasts]);
    return unsub;
  }, []);

  if (toasts.length === 0) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastCard toast={t} onDismiss={() => rtToast.dismiss(t.id)} />
          </div>
        ))}
      </div>
    </>,
    document.body
  );
}
