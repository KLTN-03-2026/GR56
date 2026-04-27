import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { adminEventBus } from '../../layouts/AdminLayout';

const adm = (url, method = 'get', data = null) => {
  const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` } };
  return method === 'get' ? api.get(url, cfg) : api.post(url, data, cfg);
};

const BASE_URL = import.meta.env.VITE_API_URL || '';

const STATUS_MAP = {
  cho_xu_ly:   { label: 'Chờ xử lý',    cls: 'bg-yellow-100 text-yellow-700' },
  dang_xu_ly:  { label: 'Đang xử lý',   cls: 'bg-blue-100 text-blue-700'    },
  da_xu_ly:    { label: 'Đã xử lý',     cls: 'bg-green-100 text-green-700'  },
};

const ROLE_MAP = {
  'App\\Models\\KhachHang': { label: 'Khách hàng', cls: 'bg-indigo-100 text-indigo-700', icon: 'fa-user' },
  'App\\Models\\Shipper':   { label: 'Shipper',     cls: 'bg-orange-100 text-orange-700', icon: 'fa-motorcycle' },
  'App\\Models\\QuanAn':    { label: 'Quán ăn',     cls: 'bg-pink-100 text-pink-700',     icon: 'fa-store' },
};

function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 bg-gradient-to-r from-red-500 to-red-600 rounded-t-3xl flex items-center justify-between">
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white"><i className="fa-solid fa-xmark text-xl" /></button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        {footer && <div className="p-4 border-t flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export default function AdminReport() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNote, setEditNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [duyetHuyLoading, setDuyetHuyLoading] = useState(false);
  const [showConfirmHuy, setShowConfirmHuy] = useState(false);

  const [newAlert, setNewAlert] = useState(null); // flash khi có báo cáo mới real-time

  useEffect(() => { fetchList(); }, [filterStatus, filterRole]);

  // ── Real-time: tự reload khi AdminLayout nhận alert ──────────────────────
  useEffect(() => {
    const handler = ({ loai, data }) => {
      setNewAlert({ loai, data, time: Date.now() });
      fetchList();
      setTimeout(() => setNewAlert(null), 5000);
    };
    adminEventBus.on('reload_reports', handler);
    return () => adminEventBus.off('reload_reports', handler);
  }, []);
  // ──────────────────────────────────────────────────────────────────────────


  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus === 'yeu_cau_huy') {
        params.append('yeu_cau_huy', '1');
      } else {
        if (filterStatus !== 'all') params.append('trang_thai', filterStatus);
      }
      if (filterRole !== 'all') params.append('reporter_type', filterRole);
      const r = await adm(`/api/admin/reports/data?${params.toString()}`);
      setList(r.data.data || []);
      setCurrentPage(1);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Không thể tải danh sách báo cáo!');
    } finally { setLoading(false); }
  };

  const openDetail = (item) => {
    setSelected(item);
    setEditStatus(item.trang_thai);
    setEditNote(item.ghi_chu_admin || '');
    setShowDetail(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await adm('/api/admin/reports/update', 'post', {
        id: selected.id,
        trang_thai: editStatus,
        ghi_chu_admin: editNote,
      });
      if (r.data.status) {
        toast.success(r.data.message);
        // Cập nhật state ngay lập tức (optimistic)
        const updatedItem = { ...selected, trang_thai: editStatus, ghi_chu_admin: editNote };
        setSelected(updatedItem);
        setList(prev => prev.map(x => x.id === selected.id ? updatedItem : x));
        setShowDetail(false);
        fetchList();
      } else toast.error(r.data.message);
    } catch (e) { toast.error(e.response?.data?.message || 'Lỗi kết nối!'); }
    finally { setSaving(false); }
  };

  const handleDuyetHuyDon = async () => {
    setDuyetHuyLoading(true);
    setShowConfirmHuy(false);
    try {
      const r = await adm('/api/admin/reports/duyet-huy-don', 'post', { id: selected.id });
      if (r.data.status) {
        toast.success(r.data.message);
        // Cập nhật state ngay lập tức (optimistic update) - không cần F5
        const updatedItem = { ...selected, da_duyet_huy: true, trang_thai: 'da_xu_ly' };
        setSelected(updatedItem);
        setList(prev => prev.map(x => x.id === selected.id ? updatedItem : x));
        setShowDetail(false);
        fetchList(); // vẫn fetch để đồng bộ data chính xác từ server
      } else toast.error(r.data.message);
    } catch (e) { toast.error(e.response?.data?.message || 'Lỗi kết nối!'); }
    finally { setDuyetHuyLoading(false); }
  };

  const getReporterName = (item) => {
    if (!item.reporter) return 'N/A';
    if (item.reporter_type === 'App\\Models\\QuanAn') return item.reporter.ten_quan_an;
    return item.reporter.ho_va_ten;
  };

  const getReporterPhone = (item) => item.reporter?.so_dien_thoai || '—';

  const currentItems = list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(list.length / itemsPerPage);

  const counts = {
    all: list.length,
    cho_xu_ly: list.filter(x => x.trang_thai === 'cho_xu_ly').length,
    dang_xu_ly: list.filter(x => x.trang_thai === 'dang_xu_ly').length,
    da_xu_ly: list.filter(x => x.trang_thai === 'da_xu_ly').length,
    yeu_cau_huy: list.filter(x => x.yeu_cau_huy && !x.da_duyet_huy).length,
  };

  return (
    <div className="p-6">
      {/* Detail Modal */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title="Chi tiết Báo cáo / Khiếu nại"
        footer={
          <>
            <button onClick={() => setShowDetail(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Đóng</button>
            {selected?.yeu_cau_huy && !selected?.da_duyet_huy && (
              <button onClick={() => setShowConfirmHuy(true)} disabled={duyetHuyLoading}
                className="px-5 py-2 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 disabled:opacity-60 flex items-center gap-2">
                {duyetHuyLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-ban" />}
                Duyệt Hủy Đơn
              </button>
            )}
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 disabled:opacity-60">
              {saving ? <i className="fa-solid fa-spinner fa-spin" /> : 'Lưu thay đổi'}
            </button>
          </>
        }
      >
        {selected && (
          <div className="space-y-5">
            {/* Cancel Request Banner */}
            {selected?.yeu_cau_huy && (
              <div className={`rounded-2xl p-4 border-2 ${selected.da_duyet_huy ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-400'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <i className={`fa-solid ${selected.da_duyet_huy ? 'fa-circle-check text-green-600' : 'fa-triangle-exclamation text-orange-600'}`} />
                  <span className={`font-bold text-sm ${selected.da_duyet_huy ? 'text-green-700' : 'text-orange-700'}`}>
                    {selected.da_duyet_huy ? 'Đã duyệt hủy đơn hàng' : '⚠️ Yêu cầu hủy đơn hàng'}
                  </span>
                </div>
                {selected.ly_do_huy && (
                  <div className="text-sm text-gray-700">
                    <span className="font-semibold">Lý do:</span> {selected.ly_do_huy}
                  </div>
                )}
                {!selected.da_duyet_huy && (
                  <div className="text-xs text-orange-600 mt-2">
                    ↳ Nhấn nút <b>Duyệt Hủy Đơn</b> ở cuối modal để xử lý
                  </div>
                )}
              </div>
            )}

            {/* Reporter Info */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Thông tin người gửi</div>
              <div className="flex items-center gap-3">
                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${ROLE_MAP[selected.reporter_type]?.cls}`}>
                  <i className={`fa-solid ${ROLE_MAP[selected.reporter_type]?.icon} mr-1`} />
                  {ROLE_MAP[selected.reporter_type]?.label || selected.reporter_type}
                </div>
                <span className="font-bold text-gray-800">{getReporterName(selected)}</span>
                <span className="text-gray-500 text-sm">{getReporterPhone(selected)}</span>
              </div>
              {selected.id_don_hang && (
                <div className="text-sm text-gray-600">
                  <i className="fa-solid fa-bag-shopping mr-2 text-gray-400" />
                  Mã đơn hàng: <span className="font-bold text-blue-600">#{selected.id_don_hang}</span>
                </div>
              )}
              <div className="text-xs text-gray-400">
                <i className="fa-regular fa-clock mr-1" />
                {new Date(selected.created_at).toLocaleString('vi-VN')}
              </div>
            </div>

            {/* Content */}
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Tiêu đề</div>
              <div className="font-semibold text-gray-800 text-base">{selected.tieu_de}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Nội dung</div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{selected.noi_dung}</div>
            </div>

            {/* Image */}
            {selected.hinh_anh && (
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Ảnh đính kèm</div>
                <a href={`${BASE_URL}/${selected.hinh_anh}`} target="_blank" rel="noreferrer">
                  <img
                    src={`${BASE_URL}/${selected.hinh_anh}`}
                    alt="Ảnh báo cáo"
                    className="rounded-2xl max-h-64 object-contain border border-gray-200 hover:opacity-90 transition-opacity cursor-pointer"
                  />
                </a>
              </div>
            )}

            {/* Admin controls */}
            <div className="border-t pt-4 space-y-3">
              <div className="text-xs font-bold text-gray-500 uppercase">Xử lý báo cáo</div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Trạng thái</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100">
                  <option value="cho_xu_ly">Chờ xử lý</option>
                  <option value="dang_xu_ly">Đang xử lý</option>
                  <option value="da_xu_ly">Đã xử lý</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ghi chú admin (cách giải quyết)</label>
                <textarea rows={3} value={editNote} onChange={e => setEditNote(e.target.value)}
                  placeholder="Nhập ghi chú / hướng giải quyết..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none" />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Hủy Modal */}
      {showConfirmHuy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center mb-4">
              <i className="fa-solid fa-triangle-exclamation text-5xl text-orange-500 mb-3 block" />
              <h3 className="font-bold text-gray-800 text-lg">Xác nhận hủy đơn hàng?</h3>
              <p className="text-gray-500 text-sm mt-2">Hành động này sẽ chuyển đơn sang trạng thái <b>Đã hủy</b> và hoàn tiền cho khách nếu cần. Không thể hoàn tác!</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmHuy(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold">Hủy bỏ</button>
              <button onClick={handleDuyetHuyDon} className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600">Xác nhận hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            <i className="fa-solid fa-flag mr-3 text-red-500" />Báo Cáo / Khiếu Nại
          </h1>
          <p className="text-gray-400 text-sm mt-1">{list.length} báo cáo</p>
        </div>
        <div className="flex items-center gap-3">
          {newAlert && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600 animate-pulse">
              <i className="fa-solid fa-circle-exclamation"/>
              {newAlert.loai === 'yeu_cau_huy' ? 'Yêu cầu hủy đơn mới!' : 'Báo cáo mới!'}
              {newAlert.data?.nguoi_gui && <span className="font-normal">— {newAlert.data.nguoi_gui}</span>}
            </div>
          )}
          <button onClick={fetchList} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
            <i className="fa-solid fa-rotate-right" />Làm mới
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { key: 'all', label: 'Tất cả', icon: 'fa-flag', color: 'text-gray-600', bg: 'bg-gray-100' },
          { key: 'cho_xu_ly', label: 'Chờ xử lý', icon: 'fa-hourglass-half', color: 'text-yellow-700', bg: 'bg-yellow-50' },
          { key: 'dang_xu_ly', label: 'Đang xử lý', icon: 'fa-spinner', color: 'text-blue-700', bg: 'bg-blue-50' },
          { key: 'da_xu_ly', label: 'Đã xử lý', icon: 'fa-check-circle', color: 'text-green-700', bg: 'bg-green-50' },
        ].map(s => (
          <button key={s.key} onClick={() => setFilterStatus(s.key)}
            className={`${s.bg} rounded-2xl p-4 text-left transition-all border-2 ${filterStatus === s.key ? 'border-red-400 shadow-md' : 'border-transparent'}`}>
            <i className={`fa-solid ${s.icon} ${s.color} text-xl mb-2 block`} />
            <div className={`text-2xl font-extrabold ${s.color}`}>{counts[s.key]}</div>
            <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
          </button>
        ))}
        {/* Yêu cầu hủy */}
        <button onClick={() => setFilterStatus('yeu_cau_huy')}
          className={`bg-orange-50 rounded-2xl p-4 text-left transition-all border-2 ${filterStatus === 'yeu_cau_huy' ? 'border-orange-400 shadow-md' : 'border-transparent'}`}>
          <i className="fa-solid fa-ban text-orange-600 text-xl mb-2 block" />
          <div className="text-2xl font-extrabold text-orange-600">{counts.yeu_cau_huy}</div>
          <div className="text-xs text-gray-500 font-medium mt-0.5">⚠ Yêu cầu hủy</div>
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="text-sm font-semibold text-gray-500 flex items-center">Lọc theo đối tượng:</div>
        {[
          { val: 'all', label: 'Tất cả' },
          { val: 'khach_hang', label: 'Khách hàng' },
          { val: 'shipper', label: 'Shipper' },
          { val: 'quan_an', label: 'Quán ăn' },
        ].map(opt => (
          <button key={opt.val} onClick={() => setFilterRole(opt.val)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors ${filterRole === opt.val ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-red-100 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-24">
            <i className="fa-solid fa-flag text-6xl text-gray-200 mb-4 block" />
            <p className="text-gray-400">Không có báo cáo nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-red-50 text-gray-600 font-semibold text-xs uppercase">
                  <th className="px-4 py-3 text-center">#</th>
                  <th className="px-4 py-3 text-left">Người gửi</th>
                  <th className="px-4 py-3 text-left">Tiêu đề</th>
                  <th className="px-4 py-3 text-center">Đơn hàng</th>
                  <th className="px-4 py-3 text-center">Ảnh</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-center">Ngày gửi</th>
                  <th className="px-4 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.map((item, i) => {
                  const roleInfo = ROLE_MAP[item.reporter_type] || {};
                  const statusInfo = STATUS_MAP[item.trang_thai] || { label: item.trang_thai, cls: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-center text-gray-400 text-xs">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold w-fit ${roleInfo.cls}`}>
                            <i className={`fa-solid ${roleInfo.icon}`} />{roleInfo.label}
                          </span>
                          <span className="font-semibold text-gray-800 text-xs">{getReporterName(item)}</span>
                          <span className="text-gray-400 text-xs">{getReporterPhone(item)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800 text-sm truncate max-w-[180px] flex items-center gap-1">
                          {item.yeu_cau_huy && (
                            <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${item.da_duyet_huy ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                              {item.da_duyet_huy ? '✔ Hủy' : '⚠ Hủy'}
                            </span>
                          )}
                          {item.tieu_de}
                        </div>
                        <div className="text-gray-400 text-xs truncate max-w-[180px]">{item.noi_dung}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.id_don_hang
                          ? <span className="font-bold text-blue-600 text-xs">#{item.id_don_hang}</span>
                          : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.hinh_anh
                          ? <a href={`${BASE_URL}/${item.hinh_anh}`} target="_blank" rel="noreferrer">
                              <img src={`${BASE_URL}/${item.hinh_anh}`} className="w-10 h-10 rounded-lg object-cover mx-auto border border-gray-200 hover:scale-110 transition-transform" alt="" />
                            </a>
                          : <span className="text-gray-300 text-xl"><i className="fa-regular fa-image" /></span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${statusInfo.cls}`}>{statusInfo.label}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-400 text-xs whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => openDetail(item)}
                          className="px-3 py-1.5 rounded-xl bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 transition-colors">
                          <i className="fa-solid fa-eye mr-1" />Xem
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  Hiển thị <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span>–<span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, list.length)}</span> trong <span className="font-bold text-gray-800">{list.length}</span> báo cáo
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50">
                    <i className="fa-solid fa-chevron-left text-xs" />
                  </button>
                  {[...Array(totalPages)].map((_, idx) => {
                    const page = idx + 1;
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return <button key={page} onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${currentPage === page ? 'bg-red-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{page}</button>;
                    }
                    if (page === currentPage - 2 || page === currentPage + 2) return <span key={`d${page}`} className="w-8 h-8 flex items-center justify-center text-gray-400">...</span>;
                    return null;
                  })}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50">
                    <i className="fa-solid fa-chevron-right text-xs" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
