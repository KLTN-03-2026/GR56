import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const ITEMS_PER_PAGE = 10;

function Pagination({ current, total, onChange }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button onClick={() => onChange(current - 1)} disabled={current === 1}
        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-gray-200 text-gray-400 hover:text-yellow-600 hover:border-yellow-300 disabled:opacity-40 transition-all shadow-sm">
        <i className="fa-solid fa-chevron-left text-xs" />
      </button>
      <div className="flex items-center gap-1.5">
        {[...Array(total)].map((_, idx) => {
          const p = idx + 1;
          if (p === 1 || p === total || (p >= current - 1 && p <= current + 1)) {
            return (
              <button key={p} onClick={() => onChange(p)}
                className={`w-10 h-10 flex items-center justify-center rounded-2xl font-black text-xs transition-all shadow-sm ${current === p
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-400 text-white shadow-orange-200'
                  : 'bg-white text-gray-500 hover:bg-yellow-50 hover:text-yellow-600 border border-gray-100'}`}>
                {p}
              </button>
            );
          }
          if (p === current - 2 || p === current + 2) return <span key={`d${p}`} className="w-4 text-center text-gray-300">...</span>;
          return null;
        })}
      </div>
      <button onClick={() => onChange(current + 1)} disabled={current === total}
        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-gray-200 text-gray-400 hover:text-yellow-600 hover:border-yellow-300 disabled:opacity-40 transition-all shadow-sm">
        <i className="fa-solid fa-chevron-right text-xs" />
      </button>
    </div>
  );
}

export default function LichSuXu() {
  const { user: authUser } = useAuth();
  const [listXu, setListXu] = useState([]);
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadUser();
    loadLichSuXu();
  }, []);

  const loadUser = async () => {
    try {
      const res = await api.get('/api/khach-hang/data-login');
      if (res.data.status) setUser(res.data.data);
    } catch {}
  };

  const loadLichSuXu = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/khach-hang/lich-su-xu');
      if (res.data.status) setListXu(res.data.data || []);
      else toast.error(res.data.message);
    } catch (err) {
      if (err?.response?.status === 401) toast.error('Vui lòng đăng nhập lại!');
    } finally { setLoading(false); }
  };

  const formatTime = (t) => {
    if (!t) return '';
    return new Date(t).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getTypeInfo = (item) => {
    if (item.loai_giao_dich == 1 || item.so_xu > 0) return { color: 'bg-green-100 text-green-700', icon: 'fa-arrow-down', label: 'Tích lũy mua hàng' };
    if (item.loai_giao_dich == 2 || item.so_xu < 0) return { color: 'bg-red-100 text-red-700', icon: 'fa-arrow-up', label: 'Thanh toán xu' };
    if (item.loai_giao_dich == 3) return { color: 'bg-gray-100 text-gray-600', icon: 'fa-clock-rotate-left', label: 'Hoàn trả' };
    if (item.loai_giao_dich == 4) return { color: 'bg-yellow-100 text-yellow-700', icon: 'fa-crown', label: 'Hệ thống cấp' };
    return { color: 'bg-gray-100 text-gray-600', icon: 'fa-circle', label: 'Giao dịch khác' };
  };

  const totalPages = Math.ceil(listXu.length / ITEMS_PER_PAGE);
  const currentItems = listXu.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-yellow-300">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
            <i className="fa-solid fa-coins text-yellow-500 text-3xl" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Lịch Sử ShopeFood Xu</h1>
            <p className="text-gray-500 text-sm mt-0.5">Theo dõi biến động và số dư xu của bạn</p>
          </div>
        </div>

        {/* Balance card */}
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl"
            style={{ background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' }}>
            <div className="relative z-10">
              <h3 className="text-white/75 font-semibold text-sm uppercase tracking-wider mb-2">Tổng điểm Xu hiện có</h3>
              <div className="flex items-end gap-2">
                <span className="text-6xl font-black">{user.diem_xu || 0}</span>
                <span className="text-2xl text-white/60 mb-2">xu</span>
              </div>
              <div className="text-white/60 text-xs mt-2">
                <i className="fa-solid fa-list-ul mr-1" />Tổng {listXu.length} giao dịch
              </div>
            </div>
            <i className="fa-solid fa-coins absolute right-[-20px] top-[-10px] text-white/20"
              style={{ fontSize: '8rem', transform: 'rotate(-15deg)', zIndex: 0 }} />
          </div>
        </div>

        {/* Transaction history */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-list-ul text-blue-500" />Giao dịch gần đây
          </h2>
          {listXu.length > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full font-semibold">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, listXu.length)} / {listXu.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-20 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : listXu.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <i className="fa-regular fa-folder-open text-6xl text-gray-200 mb-4 block" />
            <h3 className="text-lg font-semibold text-gray-400">Chưa có lịch sử giao dịch Xu</h3>
            <p className="text-gray-400 text-sm mt-1">Mua sắm để tích lũy xu ngay nhé!</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {currentItems.map((item, i) => {
                const info = getTypeInfo(item);
                return (
                  <div key={i}
                    className="bg-white rounded-2xl border-l-4 border-yellow-400 shadow-sm hover:shadow-md transition-all duration-200 p-4"
                    style={{ transform: 'translateY(0)', transition: 'transform 0.2s', cursor: 'default' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    <div className="flex items-center justify-between gap-3">
                      {/* Left */}
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${info.color}`}>
                          <i className={`fa-solid ${info.icon} text-lg`} />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800">{item.mo_ta}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            <span><i className="fa-regular fa-clock mr-1" />{formatTime(item.created_at)}</span>
                            <span className="text-gray-300">•</span>
                            <span className={info.color.replace('bg-', 'text-').split(' ')[0] + ' font-semibold'}>{info.label}</span>
                          </div>
                        </div>
                      </div>
                      {/* Right */}
                      <div className="text-right flex-shrink-0">
                        <div className={`text-2xl font-black ${item.so_xu > 0 ? 'text-green-500' : item.so_xu < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {item.so_xu > 0 ? '+' : ''}{item.so_xu} <i className="fa-solid fa-coins text-base ml-1" />
                        </div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">Biến động</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination current={currentPage} total={totalPages} onChange={p => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </>
        )}
      </div>
    </div>
  );
}
