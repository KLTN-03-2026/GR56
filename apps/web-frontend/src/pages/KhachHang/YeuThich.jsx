import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { formatVND } from '../../utils/helpers';

const cfg = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('khach_hang_login')}` } });

export default function YeuThich() {
  const navigate = useNavigate();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);
  const [search, setSearch]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/khach-hang/yeu-thich/data', cfg());
      if (r.data?.status) setItems(r.data.data || []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (idMonAn) => {
    setRemoving(idMonAn);
    try {
      await api.post('/api/khach-hang/yeu-thich/toggle', { id_mon_an: idMonAn }, cfg());
      setItems(prev => prev.filter(i => i.id_mon_an !== idMonAn));
    } catch { }
    finally { setRemoving(null); }
  };

  const filtered = items.filter(i =>
    !search || i.ten_mon_an?.toLowerCase().includes(search.toLowerCase()) ||
    i.ten_quan_an?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#fff7ed 0%,#fff 50%,#fef2f2 100%)' }}>
      {/* Header */}
      <div className="px-4 pt-8 pb-4 max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
          <i className="fa-solid fa-arrow-left" /> Quay lại
        </button>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
              <span className="text-2xl">❤️</span> Món Yêu Thích
            </h1>
            <p className="text-gray-400 text-sm mt-1">{items.length} món đã lưu</p>
          </div>
        </div>

        {/* Search */}
        {items.length > 0 && (
          <div className="relative mt-4">
            <i className="fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm món hoặc quán..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white shadow-sm text-sm outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-10 max-w-4xl mx-auto">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">{search ? '🔍' : '💔'}</div>
            <p className="text-xl font-bold text-gray-700 mb-2">
              {search ? 'Không tìm thấy' : 'Chưa có món yêu thích'}
            </p>
            <p className="text-gray-400 text-sm mb-6">
              {search ? 'Thử từ khóa khác nhé' : 'Hãy bấm ❤️ trên món bạn thích để lưu lại'}
            </p>
            {!search && (
              <button onClick={() => navigate('/')}
                className="px-6 py-3 rounded-xl text-white text-sm font-bold shadow hover:opacity-90 transition-all"
                style={{ background: 'linear-gradient(135deg,#f97316,#e94560)' }}>
                Khám phá ngay
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <WishCard
                key={item.id_mon_an}
                item={item}
                removing={removing === item.id_mon_an}
                onRemove={() => handleRemove(item.id_mon_an)}
                onGoToRestaurant={() => navigate(`/khach-hang/quan-an/${item.id_quan_an}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WishCard({ item, removing, onRemove, onGoToRestaurant }) {
  const hasDiscount = item.gia_khuyen_mai && Number(item.gia_khuyen_mai) < Number(item.gia_ban);
  const displayPrice = hasDiscount ? item.gia_khuyen_mai : item.gia_ban;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
      {/* Image */}
      <div className="relative h-40 overflow-hidden cursor-pointer" onClick={onGoToRestaurant}>
        <img
          src={item.hinh_anh || 'https://placehold.co/400x200/fff7ed/f97316?text=🍜'}
          alt={item.ten_mon_an}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={e => e.target.src = 'https://placehold.co/400x200/fff7ed/f97316?text=🍜'}
        />
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            -{Math.round((1 - item.gia_khuyen_mai / item.gia_ban) * 100)}%
          </span>
        )}
        {item.ten_danh_muc && (
          <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs font-medium px-2 py-0.5 rounded-full">
            {item.ten_danh_muc}
          </span>
        )}
        {/* Remove heart button */}
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          disabled={removing}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-60"
        >
          {removing
            ? <i className="fa-solid fa-spinner fa-spin text-red-400 text-sm" />
            : <i className="fa-solid fa-heart text-red-500 text-sm" />}
        </button>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-gray-800 text-sm truncate mb-1 cursor-pointer hover:text-orange-500 transition-colors"
          onClick={onGoToRestaurant}>
          {item.ten_mon_an}
        </h3>
        <div className="flex items-center gap-1.5 mb-2">
          <i className="fa-solid fa-store text-orange-400 text-xs" />
          <span className="text-xs text-gray-500 truncate">{item.ten_quan_an}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-extrabold text-orange-500 text-base">{formatVND(displayPrice)}</span>
            {hasDiscount && (
              <span className="text-gray-400 text-xs line-through ml-1.5">{formatVND(item.gia_ban)}</span>
            )}
          </div>
          <button
            onClick={onGoToRestaurant}
            className="text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#f97316,#e94560)' }}>
            Đặt ngay
          </button>
        </div>
      </div>
    </div>
  );
}
