import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatVND } from '../../utils/helpers';
import { exportToExcel, ExcelButton } from '../../utils/exportExcel';

const adm = (url, method = 'get', data = null) => {
  const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` } };
  return method === 'get' ? api.get(url, cfg) : api.post(url, data, cfg);
};
const fDT = (s) => { if (!s) return ''; const d = new Date(s); return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };

const STATUS_MAP = {
  0: { label: 'Chờ shipper', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  1: { label: 'Chờ quán nhận', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  2: { label: 'Đang nấu', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  3: { label: 'Đang giao', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  4: { label: 'Giao thành công', cls: 'bg-green-100 text-green-700 border-green-200' },
  5: { label: 'Đã hủy', cls: 'bg-red-100 text-red-600 border-red-200' },
};

function Modal({ open, onClose, title, headerCls = 'bg-blue-600', children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className={`p-5 ${headerCls} rounded-t-3xl flex items-center justify-between`}>
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white"><i className="fa-solid fa-xmark text-xl" /></button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="p-4 border-t flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export default function AdminDonHang() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chiTiet, setChiTiet] = useState([]);
  const [showDetail, setShowDetail] = useState(false);
  const [showHuy, setShowHuy] = useState(false);
  const [donHuy, setDonHuy] = useState({});
  const [selOrder, setSelOrder] = useState(null);

  // Filters
  const [keyword, setKeyword] = useState('');
  const [tuNgay, setTuNgay] = useState('');
  const [denNgay, setDenNgay] = useState('');
  const [tinhTrang, setTinhTrang] = useState('');

  useEffect(() => { fetchList(); }, []);

  const fetchList = async () => {
    setLoading(true);
    try { const r = await adm('/api/admin/don-hang/data'); setList(r.data.data || []); }
    catch { } finally { setLoading(false); }
  };

  const xemChiTiet = async (o) => {
    setSelOrder(o); setShowDetail(true);
    try { const r = await adm('/api/admin/don-hang/data-chi-tiet', 'post', o); setChiTiet(r.data.data || []); } catch { }
  };

  const huyDon = async () => {
    try { const r = await adm('/api/admin/don-hang/huy-don-hang', 'post', donHuy); if (r.data.status) { toast.success(r.data.message); setShowHuy(false); fetchList(); } else toast.error(r.data.message); } catch { }
  };

  const filtered = useMemo(() => {
    return list.filter(v => {
      const kw = keyword.toLowerCase();
      const matchKw = !kw || (v.ma_don_hang || '').toLowerCase().includes(kw)
        || (v.ten_quan_an || '').toLowerCase().includes(kw)
        || (v.ho_va_ten_khach_hang || '').toLowerCase().includes(kw)
        || (v.ten_nguoi_nhan || '').toLowerCase().includes(kw)
        || (v.ho_va_ten_shipper || '').toLowerCase().includes(kw);
      const matchTT = tinhTrang === '' || String(v.tinh_trang) === tinhTrang;
      let matchDate = true;
      if (v.created_at) {
        const d = new Date(v.created_at);
        if (tuNgay) matchDate = matchDate && d >= new Date(tuNgay);
        if (denNgay) matchDate = matchDate && d <= new Date(denNgay + 'T23:59:59');
      }
      return matchKw && matchTT && matchDate;
    });
  }, [list, keyword, tinhTrang, tuNgay, denNgay]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { setCurrentPage(1); }, [keyword, tuNgay, denNgay, tinhTrang]);

  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filtered.slice(indexOfFirstItem, indexOfLastItem);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className="p-6 space-y-4">
      {/* Detail Modal */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={`Chi tiết đơn #${selOrder?.ma_don_hang}`} headerCls="bg-blue-600"
        footer={<button onClick={() => setShowDetail(false)} className="px-6 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Đóng</button>}>
        {selOrder && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-3"><p className="text-gray-400 text-xs mb-1">Quán ăn</p><p className="font-semibold">{selOrder.ten_quan_an}</p></div>
              <div className="bg-gray-50 rounded-xl p-3"><p className="text-gray-400 text-xs mb-1">Khách hàng</p><p className="font-semibold">{selOrder.ho_va_ten_khach_hang}</p></div>
              <div className="bg-gray-50 rounded-xl p-3"><p className="text-gray-400 text-xs mb-1">Shipper</p><p className="font-semibold">{selOrder.ho_va_ten_shipper || 'Chưa có'}</p></div>
              <div className="bg-gray-50 rounded-xl p-3"><p className="text-gray-400 text-xs mb-1">Tổng tiền</p><p className="font-bold text-green-600 text-base">{formatVND(selOrder.tong_tien)}</p></div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-blue-50 text-xs uppercase text-gray-500">
                <th className="px-3 py-2 text-left font-semibold">Món ăn</th>
                <th className="px-3 py-2 text-center font-semibold">SL</th>
                <th className="px-3 py-2 text-right font-semibold">Đơn giá</th>
                <th className="px-3 py-2 text-left font-semibold">Ghi chú</th>
                <th className="px-3 py-2 text-right font-semibold">Thành tiền</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {chiTiet.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-gray-800">{c.ten_mon_an}{c.ten_size && <span className="ml-1 text-orange-500 text-xs">(Size {c.ten_size})</span>}</td>
                    <td className="px-3 py-2.5 text-center">{c.so_luong}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{formatVND(c.don_gia)}</td>
                    <td className="px-3 py-2.5">
                      {c.ghi_chu ? <div className="flex flex-wrap gap-1">{c.ghi_chu.split(',').map((t, j) => <span key={j} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full border">{t.trim()}</span>)}</div> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-green-600">{formatVND(c.thanh_tien)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {selOrder.anh_giao_hang && (
              <div className="bg-gray-50 rounded-xl p-4 mt-4 border border-gray-100">
                <h4 className="font-bold text-gray-700 text-sm mb-2"><i className="fa-solid fa-camera mr-2 text-blue-500" />Ảnh xác nhận giao hàng</h4>
                <img src={selOrder.anh_giao_hang.startsWith('http') ? selOrder.anh_giao_hang : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${selOrder.anh_giao_hang}`} alt="Proof" className="max-w-full h-auto max-h-64 object-contain rounded-lg border border-gray-200" />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Hủy Modal */}
      <Modal open={showHuy} onClose={() => setShowHuy(false)} title="Hủy Đơn Hàng" headerCls="bg-red-500"
        footer={<><button onClick={() => setShowHuy(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Đóng</button><button onClick={huyDon} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">Xác nhận hủy</button></>}>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-sm">
          <div className="flex items-start gap-3"><i className="fa-solid fa-circle-exclamation text-orange-500 text-xl flex-shrink-0 mt-0.5" />
            <div><p className="font-semibold text-orange-700">Cảnh báo!</p>
              <p className="text-orange-600 mt-1">Bạn muốn hủy đơn hàng <b>#{donHuy.ma_don_hang}</b>. Hành động này không thể hoàn tác!</p></div>
          </div>
        </div>
      </Modal>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900"><i className="fa-solid fa-bag-shopping mr-3 text-blue-500" />Quản Lý Đơn Hàng</h1>
          <p className="text-gray-400 text-sm mt-1">{filtered.length}/{list.length} đơn hàng</p></div>
        <div className="flex gap-3">
          <ExcelButton disabled={filtered.length === 0} onClick={() => exportToExcel(
            filtered.map((item, i) => ({ ...item, __stt: i + 1 })),
            [
              { label: 'STT', key: '__stt', width: 6 },
              { label: 'Mã đơn', key: 'ma_don_hang', width: 14 },
              { label: 'Quán ăn', key: 'ten_quan_an', width: 28 },
              { label: 'Khách hàng', key: 'ho_va_ten_khach_hang', width: 22 },
              { label: 'Shipper', key: 'ho_va_ten_shipper', width: 22 },
              { label: 'Tiền hàng', key: 'tien_hang', width: 14, format: v => Number(v).toLocaleString('vi-VN') },
              { label: 'Phí ship', key: 'phi_ship', width: 12, format: v => Number(v).toLocaleString('vi-VN') },
              { label: 'Giảm giá', key: 'chiet_khau_voucher', width: 12, format: v => Number(v || 0).toLocaleString('vi-VN') },
              { label: 'Tổng', key: 'tong_tien', width: 14, format: v => Number(v).toLocaleString('vi-VN') },
              { label: 'Trạng thái', key: 'tinh_trang', width: 18, format: v => ({ 0: 'Chờ shipper', 1: 'Chờ quán nhận', 2: 'Đang nấu', 3: 'Đang giao', 4: 'Thành công', 5: 'Đã hủy' })[v] || '?' },
              { label: 'Thanh toán', key: 'is_thanh_toan', width: 14, format: v => v == 1 ? 'Đã TT' : 'Chưa TT' },
              { label: 'Thời gian', key: 'created_at', width: 20, format: v => v ? new Date(v).toLocaleString('vi-VN') : '' },
            ],
            'DonHang', 'Đơn Hàng'
          )} />
          <button onClick={fetchList} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"><i className="fa-solid fa-rotate-right" />Làm mới</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative"><input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Mã đơn, quán, khách..." className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-full transition-all" />
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" /></div>
          <input type="date" value={tuNgay} onChange={e => setTuNgay(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 w-full" placeholder="Từ ngày" />
          <input type="date" value={denNgay} onChange={e => setDenNgay(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 w-full" placeholder="Đến ngày" />
          <div className="flex gap-2">
            <select value={tinhTrang} onChange={e => setTinhTrang(e.target.value)} className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 w-full">
              <option value="">Tất cả trạng thái</option>
              <option value="0">Chờ shipper</option>
              <option value="1">Chờ quán nhận</option>
              <option value="2">Quán đang làm</option>
              <option value="3">Đang giao</option>
              <option value="4">Thành công</option>
              <option value="5">Đã hủy</option>
            </select>
            <button onClick={() => { setKeyword(''); setTuNgay(''); setDenNgay(''); setTinhTrang(''); }} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200"><i className="fa-solid fa-xmark" /></button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-24"><div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" /></div>
          : filtered.length === 0 ? <div className="text-center py-24"><i className="fa-solid fa-inbox text-6xl text-gray-200 mb-4 block" /><p className="text-gray-400">Không có đơn hàng nào</p></div>
            : <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="bg-blue-50 text-gray-600 font-semibold text-xs uppercase">
                <th className="px-3 py-3 text-left">Mã đơn</th>
                <th className="px-3 py-3 text-left">Quán ăn</th>
                <th className="px-3 py-3 text-left">Khách hàng</th>
                <th className="px-3 py-3 text-left">Shipper</th>
                <th className="px-3 py-3 text-right">Tiền hàng</th>
                <th className="px-3 py-3 text-right">Phí ship</th>
                <th className="px-3 py-3 text-right">Khuyến mãi</th>
                <th className="px-3 py-3 text-right">Tổng</th>
                <th className="px-3 py-3 text-center">Trạng thái</th>
                <th className="px-3 py-3 text-right">Thời gian</th>
                <th className="px-3 py-3 text-center">Thao tác</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.map((o, i) => {
                  const st = STATUS_MAP[o.tinh_trang] || { label: '?', cls: 'bg-gray-100 text-gray-600 border-gray-200' };
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 font-bold text-gray-800">#{o.ma_don_hang}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 max-w-28 truncate">{o.ten_quan_an}</td>
                      <td className="px-3 py-3 text-xs text-gray-600">{o.ho_va_ten_khach_hang}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">{o.ho_va_ten_shipper || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-3 text-right text-xs text-gray-600">{formatVND(o.tien_hang)}</td>
                      <td className="px-3 py-3 text-right text-xs text-gray-600">{formatVND(o.phi_ship)}</td>
                      <td className="px-3 py-3 text-right text-xs">
                        {o.chiet_khau_voucher > 0 && <div className="text-orange-500">-{formatVND(o.chiet_khau_voucher)}</div>}
                        {o.tien_giam_tu_xu > 0 && <div className="text-yellow-500">-{formatVND(o.tien_giam_tu_xu)}</div>}
                        {!(o.chiet_khau_voucher > 0) && !(o.tien_giam_tu_xu > 0) && <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-green-600">{formatVND(o.tong_tien)}</td>
                      <td className="px-3 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${st.cls}`}>{st.label}</span></td>
                      <td className="px-3 py-3 text-right text-xs text-gray-400 whitespace-nowrap">{fDT(o.created_at)}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => xemChiTiet(o)} className="px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs hover:bg-blue-200" title="Xem chi tiết"><i className="fa-solid fa-eye" /></button>
                          {o.tinh_trang !== 4 && o.tinh_trang !== 3 && <button onClick={() => { setDonHuy(o); setShowHuy(true); }} className="px-2.5 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs hover:bg-red-200" title="Hủy đơn"><i className="fa-solid fa-ban" /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
        }

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              Hiển thị <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> trong <span className="font-bold text-gray-800">{filtered.length}</span> đơn hàng
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <i className="fa-solid fa-chevron-left text-xs" />
              </button>

              <div className="flex gap-1 text-sm font-semibold">
                {[...Array(totalPages)].map((_, idx) => {
                  const page = idx + 1;
                  // Show current, first, last, and +/- 1 page from current
                  if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button key={page} onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${currentPage === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                      >
                        {page}
                      </button>
                    );
                  }
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={`dots-${page}`} className="w-8 h-8 flex items-center justify-center text-gray-400">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <i className="fa-solid fa-chevron-right text-xs" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
