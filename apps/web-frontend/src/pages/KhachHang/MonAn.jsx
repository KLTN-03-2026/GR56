import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { formatVND } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function MonAn() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [sortOrder, setSortOrder] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const itemsPerPage = 12;

  useEffect(() => { loadMonAn(); }, []);

  const loadMonAn = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/khach-hang/data-mon-an');
      setList(res.data.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  // Load wishlist IDs for logged-in users
  useEffect(() => {
    const token = localStorage.getItem('khach_hang_login');
    if (!token) return;
    api.get('/api/khach-hang/yeu-thich/ids', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.data?.status) setWishlistIds(new Set(r.data.ids)); })
      .catch(() => {});
  }, []);

  const toggleWishlist = useCallback(async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const token = localStorage.getItem('khach_hang_login');
    if (!token) { toast.error('Vui lòng đăng nhập để dùng Yêu Thích!'); navigate('/khach-hang/dang-nhap'); return; }
    const isLiked = wishlistIds.has(id);
    setWishlistIds(prev => { const n = new Set(prev); isLiked ? n.delete(id) : n.add(id); return n; });
    try {
      await api.post('/api/khach-hang/yeu-thich/toggle', { id_mon_an: id }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(isLiked ? 'Đã xóa khỏi yêu thích' : '❤️ Đã thêm vào yêu thích!');
    } catch {
      setWishlistIds(prev => { const n = new Set(prev); isLiked ? n.add(id) : n.delete(id); return n; });
      toast.error('Có lỗi xảy ra, thử lại nhé');
    }
  }, [wishlistIds, navigate]);

  const sortedList = [...list].sort((a, b) => {
    const gA = (a.gia_khuyen_mai > 0 ? a.gia_khuyen_mai : a.gia_ban);
    const gB = (b.gia_khuyen_mai > 0 ? b.gia_khuyen_mai : b.gia_ban);
    if (sortOrder === 'asc') return gA - gB;
    if (sortOrder === 'desc') return gB - gA;
    return 0;
  });

  const totalPages = Math.ceil(sortedList.length / itemsPerPage);
  const currentItems = sortedList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [sortOrder]);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900"><i className="fa-solid fa-bowl-food mr-2 text-orange-500" />Danh Sách Món Ăn</h1>
            <p className="text-gray-400 text-sm">{sortedList.length} món ăn</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSortOrder(sortOrder === 'asc' ? '' : 'asc')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${sortOrder === 'asc' ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              style={sortOrder === 'asc' ? { background: 'linear-gradient(135deg, #ff6b35, #f7931e)' } : {}}>
              <i className="fa-solid fa-arrow-up" />Giá tăng
            </button>
            <button onClick={() => setSortOrder(sortOrder === 'desc' ? '' : 'desc')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${sortOrder === 'desc' ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              style={sortOrder === 'desc' ? { background: 'linear-gradient(135deg, #ff6b35, #f7931e)' } : {}}>
              <i className="fa-solid fa-arrow-down" />Giá giảm
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-2xl h-56 animate-pulse" />
            ))}
          </div>
        ) : sortedList.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200">
            <i className="fa-solid fa-bowl-food text-7xl text-gray-100 mb-6 block" />
            <h3 className="text-xl font-bold text-gray-400">Chưa có món ăn nào</h3>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {currentItems.map((item, i) => (
                <Link key={item.id || i} to={`/khach-hang/quan-an/${item.id_quan_an}`} className="group block">
                  <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2 border border-transparent hover:border-orange-100">
                    <div className="relative overflow-hidden h-44 bg-gray-50">
                      <img src={item.hinh_anh} alt={item.ten_mon_an} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      {item.gia_khuyen_mai < item.gia_ban && (
                        <div className="absolute top-3 right-3 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg">
                          -{Math.round((1 - item.gia_khuyen_mai / item.gia_ban) * 100)}%
                        </div>
                      )}
                      {/* Heart - wishlist toggle */}
                      <button
                        className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110"
                        style={{ background: wishlistIds.has(item.id) ? '#ef4444' : 'rgba(255,255,255,0.9)', color: wishlistIds.has(item.id) ? 'white' : '#94a3b8' }}
                        onClick={e => toggleWishlist(e, item.id)}
                      >
                        <i className={(wishlistIds.has(item.id) ? 'fa-solid' : 'fa-regular') + ' fa-heart text-xs'} />
                      </button>
                    </div>
                    <div className="p-4">
                      <h4 className="font-black text-gray-800 text-sm truncate mb-1 group-hover:text-orange-500 transition-colors leading-tight">{item.ten_mon_an}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-3 font-bold uppercase tracking-tighter">
                        <i className="fa-solid fa-store text-orange-300" />
                        <span className="truncate">{item.ten_quan_an}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 pt-3 border-t border-gray-50">
                        {item.gia_khuyen_mai < item.gia_ban && (
                          <span className="text-[10px] text-gray-300 line-through font-bold">{formatVND(item.gia_ban)}</span>
                        )}
                        <span className="text-sm font-black text-orange-500 flex items-center gap-1">
                          {formatVND(item.gia_khuyen_mai || item.gia_ban)}
                          <i className="fa-solid fa-bolt text-[10px] opacity-50" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-16 mb-8">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-gray-400 hover:bg-orange-50 hover:text-orange-500 disabled:opacity-50 transition-all shadow-sm border border-gray-100">
                  <i className="fa-solid fa-chevron-left text-sm" />
                </button>
                <div className="flex items-center gap-1.5">
                  {[...Array(totalPages)].map((_, idx) => {
                    const p = idx + 1;
                    if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
                      return (
                        <button key={p} onClick={() => setCurrentPage(p)} className={`w-12 h-12 flex items-center justify-center rounded-2xl font-black text-sm transition-all shadow-sm ${currentPage === p ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-orange-200' : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-orange-500 border border-gray-100'}`}>
                          {p}
                        </button>
                      );
                    }
                    if (p === currentPage - 2 || p === currentPage + 2) return <span key={`dots-${p}`} className="w-6 text-center text-gray-300 font-black">...</span>;
                    return null;
                  })}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-gray-400 hover:bg-orange-50 hover:text-orange-500 disabled:opacity-50 transition-all shadow-sm border border-gray-100">
                  <i className="fa-solid fa-chevron-right text-sm" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
