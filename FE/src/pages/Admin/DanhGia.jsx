import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const adm = (url, method = 'get', data = null) => {
  const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` } };
  return method === 'get' ? api.get(url, cfg) : api.post(url, data, cfg);
};

function Stars({ value, size = 'text-sm' }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${size}`}>
      {[1, 2, 3, 4, 5].map(i => (
        <i key={i} className={`fa-${i <= value ? 'solid' : 'regular'} fa-star ${i <= value ? 'text-yellow-400' : 'text-gray-200'}`} />
      ))}
    </span>
  );
}

function Modal({ open, onClose, item, onHide, onDelete }) {
  const [delConfirm, setDelConfirm] = useState(false);
  if (!open || !item) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 rounded-t-3xl flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
          <h3 className="font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-star" />Chi tiết Đánh Giá #{item.id}
          </h3>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <i className="fa-solid fa-xmark text-xl" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Hidden badge */}
          {item.is_hidden && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-2xl border border-gray-200">
              <i className="fa-solid fa-eye-slash text-gray-500" />
              <span className="text-sm font-bold text-gray-600">Đánh giá này đang bị ẩn</span>
            </div>
          )}

          {/* Khách hàng */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
            <div className="text-xs font-bold text-gray-400 uppercase mb-2">Khách hàng</div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-user text-blue-400" />
              <span className="font-bold text-gray-800">{item.ten_khach_hang || '—'}</span>
              {item.sdt_khach_hang && <span className="text-gray-400 text-sm">· {item.sdt_khach_hang}</span>}
            </div>
            {item.ma_don_hang && (
              <div className="text-sm text-gray-500">
                <i className="fa-solid fa-bag-shopping mr-1 text-gray-400" />
                Mã đơn: <span className="font-bold text-blue-600">#{item.ma_don_hang}</span>
              </div>
            )}
            <div className="text-xs text-gray-400">
              <i className="fa-regular fa-clock mr-1" />
              {new Date(item.created_at).toLocaleString('vi-VN')}
            </div>
          </div>

          {/* Đánh giá Quán */}
          {item.sao_quan_an && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-400 uppercase">Đánh giá Quán Ăn</div>
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-store text-amber-500" />
                  <span className="font-bold text-gray-800 text-sm">{item.ten_quan_an}</span>
                  <Stars value={item.sao_quan_an} />
                  <span className="text-amber-600 font-black text-sm">{item.sao_quan_an}/5</span>
                </div>
                {item.nhan_xet_quan_an && (
                  <div className="text-gray-700 text-sm leading-relaxed italic">
                    "{item.nhan_xet_quan_an}"
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Đánh giá Shipper */}
          {item.sao_shipper && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-400 uppercase">Đánh giá Shipper</div>
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-motorcycle text-blue-500" />
                  <span className="font-bold text-gray-800 text-sm">{item.ten_shipper || 'Shipper'}</span>
                  <Stars value={item.sao_shipper} />
                  <span className="text-blue-600 font-black text-sm">{item.sao_shipper}/5</span>
                </div>
                {item.nhan_xet_shipper && (
                  <div className="text-gray-700 text-sm leading-relaxed italic">
                    "{item.nhan_xet_shipper}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">
            Đóng
          </button>
          <div className="flex gap-2">
            {/* Ẩn / Hiện */}
            <button
              onClick={() => onHide(item.id, !item.is_hidden)}
              className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-colors ${
                item.is_hidden
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}>
              <i className={`fa-solid ${item.is_hidden ? 'fa-eye' : 'fa-eye-slash'}`} />
              {item.is_hidden ? 'Hiện lại' : 'Ẩn'}
            </button>
            {/* Xóa */}
            {!delConfirm ? (
              <button onClick={() => setDelConfirm(true)}
                className="px-4 py-2 rounded-xl bg-red-100 text-red-700 font-bold text-sm hover:bg-red-200 flex items-center gap-1.5">
                <i className="fa-solid fa-trash" />Xóa
              </button>
            ) : (
              <button onClick={() => { onDelete(item.id); setDelConfirm(false); }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 flex items-center gap-1.5 animate-pulse">
                <i className="fa-solid fa-triangle-exclamation" />Xác nhận xóa
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDanhGia() {
  const [list, setList] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [quanAns, setQuanAns] = useState([]);

  const [filterQuan, setFilterQuan] = useState('all');
  const [filterSao, setFilterSao] = useState('all');
  const [filterHidden, setFilterHidden] = useState('all');
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => { fetchFilterData(); }, []);
  useEffect(() => { fetchList(); }, [filterQuan, filterSao, filterHidden]);

  const fetchFilterData = async () => {
    try {
      const r = await adm('/api/admin/danh-gia/filter-data');
      if (r.data.status) setQuanAns(r.data.quan_ans || []);
    } catch {}
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterQuan !== 'all') params.append('id_quan_an', filterQuan);
      if (filterSao !== 'all') params.append('sao_quan_an', filterSao);
      if (filterHidden !== 'all') params.append('is_hidden', filterHidden);
      if (search.trim()) params.append('search', search.trim());
      const r = await adm(`/api/admin/danh-gia/data?${params.toString()}`);
      setList(r.data.data || []);
      setStats(r.data.stats || {});
      setCurrentPage(1);
    } catch {
      toast.error('Không thể tải danh sách đánh giá!');
    } finally { setLoading(false); }
  };

  const handleHide = async (id, isHidden) => {
    try {
      const r = await adm('/api/admin/danh-gia/hide', 'post', { id, is_hidden: isHidden });
      if (r.data.status) {
        toast.success(r.data.message);
        setList(prev => prev.map(x => x.id === id ? { ...x, is_hidden: r.data.is_hidden } : x));
        if (selected?.id === id) setSelected(s => ({ ...s, is_hidden: r.data.is_hidden }));
      } else toast.error(r.data.message);
    } catch { toast.error('Lỗi kết nối!'); }
  };

  const handleDelete = async (id) => {
    try {
      const r = await adm('/api/admin/danh-gia/delete', 'post', { id });
      if (r.data.status) {
        toast.success(r.data.message);
        setList(prev => prev.filter(x => x.id !== id));
        setSelected(null);
      } else toast.error(r.data.message);
    } catch { toast.error('Lỗi kết nối!'); }
  };

  const filtered = list.filter(x =>
    !search.trim() ||
    (x.nhan_xet_quan_an || '').toLowerCase().includes(search.toLowerCase()) ||
    (x.ten_khach_hang || '').toLowerCase().includes(search.toLowerCase()) ||
    (x.ten_quan_an || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-6">
      <Modal open={!!selected} onClose={() => setSelected(null)} item={selected}
        onHide={handleHide} onDelete={handleDelete} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            <i className="fa-solid fa-star mr-3 text-yellow-500" />Quản Lý Đánh Giá
          </h1>
          <p className="text-gray-400 text-sm mt-1">{filtered.length} đánh giá</p>
        </div>
        <button onClick={fetchList}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100">
          <i className="fa-solid fa-rotate-right" />Làm mới
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: 'Tổng', val: stats.tong, color: 'text-gray-700', bg: 'bg-gray-50', icon: 'fa-comment' },
          { label: 'Đang ẩn', val: stats.bi_an, color: 'text-orange-700', bg: 'bg-orange-50', icon: 'fa-eye-slash' },
          { label: '⭐', val: stats.sao_1, color: 'text-red-700', bg: 'bg-red-50', icon: 'fa-star', sub: '1 sao' },
          { label: '⭐⭐', val: stats.sao_2, color: 'text-orange-700', bg: 'bg-orange-50', icon: 'fa-star', sub: '2 sao' },
          { label: '⭐⭐⭐', val: stats.sao_3, color: 'text-yellow-700', bg: 'bg-yellow-50', icon: 'fa-star', sub: '3 sao' },
          { label: '⭐⭐⭐⭐', val: stats.sao_4, color: 'text-lime-700', bg: 'bg-lime-50', icon: 'fa-star', sub: '4 sao' },
          { label: '⭐⭐⭐⭐⭐', val: stats.sao_5, color: 'text-green-700', bg: 'bg-green-50', icon: 'fa-star', sub: '5 sao' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-2xl p-3 text-center`}>
            <div className={`text-xl font-extrabold ${s.color}`}>{s.val ?? 0}</div>
            <div className="text-xs text-gray-500 font-medium mt-0.5 truncate">{s.sub || s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 mb-5 border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              placeholder="Tìm nội dung / tên khách..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-8 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-yellow-400 w-60"
            />
          </div>
          {/* Filter Quán */}
          <select value={filterQuan} onChange={e => setFilterQuan(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-yellow-400">
            <option value="all">Tất cả quán</option>
            {quanAns.map(q => <option key={q.id} value={q.id}>{q.ten_quan_an}</option>)}
          </select>
          {/* Filter Sao */}
          <select value={filterSao} onChange={e => setFilterSao(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-yellow-400">
            <option value="all">Tất cả sao</option>
            {[1,2,3,4,5].map(s => <option key={s} value={s}>{s} sao</option>)}
          </select>
          {/* Filter Hidden */}
          <div className="flex gap-2">
            {[
              { val: 'all', label: 'Tất cả', cls: 'bg-gray-100 text-gray-600' },
              { val: '0', label: 'Hiển thị', cls: 'bg-green-100 text-green-700' },
              { val: '1', label: 'Đang ẩn', cls: 'bg-orange-100 text-orange-700' },
            ].map(opt => (
              <button key={opt.val} onClick={() => setFilterHidden(opt.val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterHidden === opt.val ? opt.cls + ' ring-2 ring-offset-1 ring-yellow-400' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-yellow-100 border-t-yellow-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <i className="fa-solid fa-star text-6xl text-gray-200 mb-4 block" />
            <p className="text-gray-400">Không có đánh giá nào</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-yellow-50 text-gray-600 font-semibold text-xs uppercase">
                    <th className="px-4 py-3 text-center">#</th>
                    <th className="px-4 py-3 text-left">Khách hàng</th>
                    <th className="px-4 py-3 text-left">Quán ăn</th>
                    <th className="px-4 py-3 text-center">⭐ Quán</th>
                    <th className="px-4 py-3 text-left">Nội dung</th>
                    <th className="px-4 py-3 text-center">🏍️ Shipper</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-center">Ngày</th>
                    <th className="px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageItems.map((item, i) => (
                    <tr key={item.id}
                      className={`hover:bg-gray-50 transition-colors ${item.is_hidden ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3 text-center text-gray-400 text-xs">
                        {(currentPage - 1) * itemsPerPage + i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800 text-xs">{item.ten_khach_hang || '—'}</div>
                        {item.sdt_khach_hang && <div className="text-gray-400 text-[11px]">{item.sdt_khach_hang}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium text-gray-700 max-w-[150px] truncate">{item.ten_quan_an || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Stars value={item.sao_quan_an} size="text-xs" />
                          <span className={`text-xs font-bold ${
                            item.sao_quan_an <= 2 ? 'text-red-500'
                            : item.sao_quan_an === 3 ? 'text-yellow-500'
                            : 'text-green-500'
                          }`}>{item.sao_quan_an}/5</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {item.nhan_xet_quan_an || <span className="text-gray-300 italic">Không có nhận xét</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.sao_shipper ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <Stars value={item.sao_shipper} size="text-[10px]" />
                            <span className="text-[11px] text-blue-600 font-bold">{item.sao_shipper}/5</span>
                          </div>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.is_hidden ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-100 text-orange-700 text-[11px] font-bold">
                            <i className="fa-solid fa-eye-slash text-[10px]" />Ẩn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-700 text-[11px] font-bold">
                            <i className="fa-solid fa-eye text-[10px]" />Hiển thị
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-400 text-xs whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => setSelected(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 text-xs font-bold hover:bg-yellow-200">
                            <i className="fa-solid fa-eye" />
                          </button>
                          <button onClick={() => handleHide(item.id, !item.is_hidden)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 ${
                              item.is_hidden ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                            }`} title={item.is_hidden ? 'Hiện lại' : 'Ẩn'}>
                            <i className={`fa-solid ${item.is_hidden ? 'fa-eye' : 'fa-eye-slash'}`} />
                          </button>
                          <button onClick={() => { if (window.confirm(`Xóa đánh giá #${item.id}?`)) handleDelete(item.id); }}
                            className="px-2.5 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200">
                            <i className="fa-solid fa-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  Hiển thị <b className="text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</b>–<b className="text-gray-800">{Math.min(currentPage * itemsPerPage, filtered.length)}</b> trong <b className="text-gray-800">{filtered.length}</b>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50">
                    <i className="fa-solid fa-chevron-left text-xs" />
                  </button>
                  {[...Array(totalPages)].map((_, idx) => {
                    const page = idx + 1;
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button key={page} onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold ${
                            currentPage === page ? 'bg-yellow-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                          }`}>{page}</button>
                      );
                    }
                    if (page === currentPage - 2 || page === currentPage + 2)
                      return <span key={`d${page}`} className="w-8 text-center text-gray-400">...</span>;
                    return null;
                  })}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50">
                    <i className="fa-solid fa-chevron-right text-xs" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
