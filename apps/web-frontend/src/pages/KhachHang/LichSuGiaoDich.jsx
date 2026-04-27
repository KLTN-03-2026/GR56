import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatVND } from '../../utils/helpers';

const ITEMS_PER_PAGE = 10;

const STATUS_MAP = {
  1: { label: 'Chờ quán', color: 'bg-yellow-100 text-yellow-700', icon: 'fa-bell' },
  2: { label: 'Đang nấu', color: 'bg-orange-100 text-orange-700', icon: 'fa-fire-burner' },
  3: { label: 'Đang giao', color: 'bg-blue-100 text-blue-800', icon: 'fa-motorcycle' },
  4: { label: 'Hoàn tất', color: 'bg-green-100 text-green-700', icon: 'fa-circle-check' },
  5: { label: 'Đã hủy', color: 'bg-red-100 text-red-600', icon: 'fa-circle-xmark' },
};

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: '1', label: 'Tiền mặt', icon: 'fa-money-bill-wave' },
  { key: '2', label: 'Chuyển khoản', icon: 'fa-qrcode' },
  { key: 'done', label: 'Hoàn tất', icon: 'fa-circle-check' },
  { key: 'cancel', label: 'Đã hủy', icon: 'fa-circle-xmark' },
];

function Pagination({ current, total, onChange }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button onClick={() => onChange(current - 1)} disabled={current === 1}
        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300 disabled:opacity-40 transition-all shadow-sm">
        <i className="fa-solid fa-chevron-left text-xs" />
      </button>
      <div className="flex items-center gap-1.5">
        {[...Array(total)].map((_, idx) => {
          const p = idx + 1;
          if (p === 1 || p === total || (p >= current - 1 && p <= current + 1)) {
            return (
              <button key={p} onClick={() => onChange(p)}
                className={`w-10 h-10 flex items-center justify-center rounded-2xl font-black text-xs transition-all shadow-sm ${current === p
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-200'
                  : 'bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600 border border-gray-100'}`}>
                {p}
              </button>
            );
          }
          if (p === current - 2 || p === current + 2) return <span key={`d${p}`} className="w-4 text-center text-gray-300">...</span>;
          return null;
        })}
      </div>
      <button onClick={() => onChange(current + 1)} disabled={current === total}
        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300 disabled:opacity-40 transition-all shadow-sm">
        <i className="fa-solid fa-chevron-right text-xs" />
      </button>
    </div>
  );
}

export default function LichSuGiaoDich() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [tongChi, setTongChi] = useState(0);
  const [soDon, setSoDon] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { loadData(); }, []);

  // Reset về trang 1 khi đổi tab
  useEffect(() => { setCurrentPage(1); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/khach-hang/lich-su-giao-dich');
      if (res.data.status) {
        setList(res.data.data || []);
        setTongChi(res.data.tong_chi || 0);
        setSoDon(res.data.so_don_thanh_cong || 0);
      }
    } catch (err) {
      if (err?.response?.status === 401) toast.error('Vui lòng đăng nhập lại!');
      else toast.error('Không thể tải lịch sử giao dịch!');
    } finally { setLoading(false); }
  };

  const filtered = list.filter(it => {
    if (tab === 'all') return true;
    if (tab === 'done') return it.tinh_trang == 4;
    if (tab === 'cancel') return it.tinh_trang == 5;
    return String(it.phuong_thuc_thanh_toan) === tab;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const currentItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const formatDT = (dt) => {
    if (!dt) return '';
    const d = new Date(dt);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-blue-200">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <i className="fa-solid fa-arrow-left text-gray-600" />
          </button>
          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
            <i className="fa-solid fa-receipt text-blue-500 text-2xl" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Lịch Sử Giao Dịch</h1>
            <p className="text-gray-500 text-sm mt-0.5">Theo dõi tất cả chi tiêu đơn hàng của bạn</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg col-span-2"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <div className="relative z-10">
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Tổng đã chi (Đơn hoàn tất)</p>
              <p className="text-3xl font-black">{formatVND(tongChi)}</p>
            </div>
            <i className="fa-solid fa-wallet absolute right-4 bottom-2 text-white/10 text-7xl" />
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-center text-center">
            <p className="text-gray-400 text-xs font-bold uppercase mb-1">Đơn thành công</p>
            <p className="text-4xl font-black text-green-500">{soDon}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {TABS.map(t => {
            const count = t.key === 'all' ? list.length
              : t.key === 'done' ? list.filter(i => i.tinh_trang == 4).length
              : t.key === 'cancel' ? list.filter(i => i.tinh_trang == 5).length
              : list.filter(i => String(i.phuong_thuc_thanh_toan) === t.key).length;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  tab === t.key
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-200 hover:text-blue-600'
                }`}>
                {t.icon && <i className={`fa-solid ${t.icon} text-xs`} />}
                {t.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-lg ml-0.5 font-black ${tab === t.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Counter */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 font-medium">
              Hiển thị <span className="font-bold text-gray-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> / {filtered.length} giao dịch
            </span>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="bg-gray-200 h-24 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <i className="fa-regular fa-folder-open text-6xl text-gray-200 mb-4 block" />
            <h3 className="text-lg font-semibold text-gray-400">Không có giao dịch nào</h3>
            <p className="text-gray-400 text-sm mt-1">Đặt hàng ngay để xem lịch sử!</p>
            <button onClick={() => navigate('/')}
              className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors text-sm">
              <i className="fa-solid fa-store mr-2" />Khám phá quán ăn
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {currentItems.map((item, i) => {
                const st = STATUS_MAP[item.tinh_trang] || STATUS_MAP[4];
                const isSuccess = item.tinh_trang == 4;
                const isCancel = item.tinh_trang == 5;
                return (
                  <div key={i}
                    className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100"
                    style={{ borderLeft: `4px solid ${isSuccess ? '#22c55e' : isCancel ? '#ef4444' : '#6366f1'}` }}>
                    <div className="p-4 flex items-center gap-4">
                      {/* Quán icon */}
                      <div className="flex-shrink-0">
                        {item.hinh_anh_quan
                          ? <img src={item.hinh_anh_quan} alt="" className="w-14 h-14 rounded-xl object-cover" />
                          : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                              <i className="fa-solid fa-store text-gray-400 text-xl" />
                            </div>}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-bold text-gray-900 truncate">{item.ten_quan_an}</h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-gray-400"><i className="fa-regular fa-clock mr-1" />{formatDT(item.created_at)}</span>
                              <span className="text-xs text-gray-300">•</span>
                              <span className="text-xs text-gray-400">#{item.ma_don_hang}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${st.color}`}>
                                <i className={`fa-solid ${st.icon} text-[9px]`} />{st.label}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${item.phuong_thuc_thanh_toan == 1 ? 'bg-green-50 text-green-700' : 'bg-indigo-50 text-indigo-700'}`}>
                                <i className={`fa-solid ${item.phuong_thuc_thanh_toan == 1 ? 'fa-money-bill-wave' : 'fa-qrcode'} text-[9px]`} />
                                {item.phuong_thuc_thanh_toan == 1 ? 'Tiền mặt' : 'QR/CK'}
                              </span>
                              {item.tien_giam_voucher > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600">
                                  <i className="fa-solid fa-tags text-[9px]" />-{formatVND(item.tien_giam_voucher)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="text-right flex-shrink-0">
                            <div className={`text-xl font-black ${isCancel ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                              {formatVND(item.tong_tien)}
                            </div>
                            <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${item.is_thanh_toan == 1 ? 'text-green-500' : 'text-orange-500'}`}>
                              {item.is_thanh_toan == 1
                                ? <><i className="fa-solid fa-shield-check mr-1" />Đã TT</>
                                : <><i className="fa-solid fa-clock mr-1" />Chưa TT</>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sub footer */}
                    <div className="px-4 pb-3 flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        <i className="fa-solid fa-receipt mr-1.5 text-gray-300" />
                        Tiền hàng: {formatVND(item.tien_hang)}
                        {item.phi_ship > 0 && <> · Ship: {formatVND(item.phi_ship)}</>}
                      </div>
                      <button onClick={() => navigate('/khach-hang/don-hang')}
                        className="text-xs text-blue-600 font-bold hover:underline">
                        Xem chi tiết <i className="fa-solid fa-arrow-right text-[10px]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <Pagination
              current={currentPage}
              total={totalPages}
              onChange={p => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />
          </>
        )}
      </div>
    </div>
  );
}
