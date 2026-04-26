import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatVND } from '../../utils/helpers';

export default function QuanAnList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem('khach_hang_login');
    if (!token) {
      toast.error('Vui lòng đăng nhập để xem danh sách quán ăn');
      navigate('/khach-hang/dang-nhap');
      return;
    }

    setLoading(true);
    try {
      const res = await api.get('/api/khach-hang/quan-an/data', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.quan_an_yeu_thich) {
        setList(res.data.quan_an_yeu_thich);
      } else if (res.data && res.data.data) {
        setList(res.data.data);
      } else if (Array.isArray(res.data)) {
        setList(res.data);
      } else {
        setList([]);
      }
    } catch (error) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        localStorage.removeItem('khach_hang_login');
        navigate('/khach-hang/dang-nhap');
      } else {
        toast.error('Có lỗi xảy ra khi tải dữ liệu quán ăn');
      }
    } finally {
      setLoading(false);
    }
  };

  const getImg = (url) => {
    if (!url) return 'https://via.placeholder.com/300x200?text=No+Image';
    if (url.includes('facebook') || url.includes('fbcdn')) return 'https://via.placeholder.com/300x200?text=Restaurant+Image';
    return url;
  };

  const isOpenNow = (mo, dong) => {
    if (!mo || !dong) return null; // không có giờ → không hiển thị
    const now = new Date();
    const [mH, mM] = mo.split(':').map(Number);
    const [dH, dM] = dong.split(':').map(Number);
    const cur = now.getHours() * 60 + now.getMinutes();
    const open = mH * 60 + mM;
    const close = dH * 60 + dM;
    return close > open ? cur >= open && cur < close : cur >= open || cur < close;
  };

  const filtered = list.filter(v => (v.ten_quan_an || '').toLowerCase().includes(search.toLowerCase()) || (v.dia_chi || '').toLowerCase().includes(search.toLowerCase()));

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when search changes
  useEffect(() => { setCurrentPage(1); }, [search]);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner shrink-0 hidden sm:flex">
                <i className="fa-solid fa-store text-3xl" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold mb-1">Danh Sách Đặc Quyền</h1>
                <p className="text-orange-100 font-medium">Khám phá các quán ăn uy tín và chất lượng gần bạn</p>
              </div>
            </div>
            <div className="w-full md:w-96 shrink-0 relative">
              <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Tìm kiếm quán ăn..." className="w-full pl-12 pr-4 py-3.5 rounded-full text-gray-800 bg-white placeholder-gray-400 font-semibold focus:outline-none focus:ring-4 focus:ring-white/30 shadow-lg transition-all" />
              <i className="fa-solid fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <div className="absolute -bottom-6 left-5 text-xs font-semibold text-orange-200">Tìm thấy {filtered.length} kết quả</div>
            </div>
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="max-w-7xl mx-auto px-4 mt-12 bg-gray-50">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(k => <div key={k} className="h-72 bg-gray-300 animate-pulse rounded-3xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-3xl border border-dashed border-gray-300 shadow-sm mx-auto max-w-3xl">
            <i className="fa-solid fa-store-slash text-7xl text-gray-200 mb-6 block"></i>
            <h2 className="text-2xl font-bold text-gray-500 mb-2">Không tìm thấy quán ăn</h2>
            <p className="text-gray-400 mb-6">Thử thay đổi từ khóa tìm kiếm hoặc quay lại sau</p>
            <button onClick={loadData} className="px-6 py-2.5 rounded-full bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors shadow-md"><i className="fa-solid fa-rotate-right mr-2" />Tải lại dữ liệu</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentItems.map((v, k) => {
                const openStatus = isOpenNow(v.gio_mo_cua, v.gio_dong_cua);
                return (
                  <Link to={`/khach-hang/quan-an/${v.id}`} key={v.id || k} className="group flex flex-col bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border border-transparent hover:border-orange-100/50">
                    <div className="relative h-52 overflow-hidden bg-gray-100">
                      <img src={getImg(v.hinh_anh)} alt={v.ten_quan_an} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" onError={(e) => e.target.src = 'https://via.placeholder.com/300x200?text=No+Image'} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>

                      {v.giam_gia && v.giam_gia !== '0%' && (
                        <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1.5 rounded-2xl text-[10px] font-black shadow-xl flex items-center gap-1.5 animate-bounce-subtle">
                          <i className="fa-solid fa-fire text-xs" />{v.giam_gia} OFF
                        </div>
                      )}

                      {/* Badge giờ mở cửa */}
                      {openStatus !== null && (
                        <div className={`absolute top-4 left-4 px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 shadow-lg ${openStatus ? 'bg-green-500 text-white' : 'bg-gray-800/80 text-gray-300'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${openStatus ? 'bg-white animate-pulse' : 'bg-gray-500'}`} />
                          {openStatus ? 'Đang mở' : 'Đóng cửa'}
                        </div>
                      )}

                      <div className="absolute bottom-4 left-5 right-5 text-white">
                        <h3 className="font-black text-xl truncate drop-shadow-lg leading-tight mb-1">{v.ten_quan_an || 'Chưa có tên'}</h3>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-200 truncate uppercase tracking-widest"><i className="fa-solid fa-map-marker-alt text-orange-400" /> {v.dia_chi || 'Chưa có địa chỉ'}</div>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-2xl font-black text-xs shadow-inner shadow-orange-100/50">
                          <i className="fa-solid fa-star text-orange-400 text-[10px]" /> {v.sao_trung_binh ? Number(v.sao_trung_binh).toFixed(1) : '5.0'}
                        </div>
                        {v.gio_mo_cua ? (
                          <div className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-xl border border-gray-100 flex items-center gap-1">
                            <i className="fa-regular fa-clock text-gray-400" />{v.gio_mo_cua.slice(0, 5)}–{v.gio_dong_cua?.slice(0, 5)}
                          </div>
                        ) : (
                          <div className="text-[10px] font-black uppercase tracking-tighter text-gray-400 bg-gray-50 px-3 py-1.5 rounded-2xl border border-gray-100">Flash Delivery</div>
                        )}
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-50">
                        <div className="flex items-center justify-between bg-gray-50/50 p-3 rounded-2xl group-hover:bg-orange-50/30 transition-colors">
                          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Khoảng giá</div>
                          <div className="text-right flex items-center gap-1">
                            <span className="text-xs font-black text-gray-900">{formatVND(v.gia_min).replace('₫', '')}</span>
                            <span className="text-gray-300 font-bold">-</span>
                            <span className="text-xs font-black text-orange-600">{formatVND(v.gia_max)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-16 mb-8">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-gray-400 hover:bg-orange-50 hover:text-orange-500 disabled:opacity-50 transition-all shadow-sm border border-gray-100">
                  <i className="fa-solid fa-chevron-left text-sm" />
                </button>
                <div className="flex items-center gap-1.5">
                  {[...Array(totalPages)].map((_, i) => {
                    const p = i + 1;
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
