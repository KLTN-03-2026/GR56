import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { debounce } from '../../utils/helpers';
import { exportToExcel, ExcelButton } from '../../utils/exportExcel';

const adm = (url, method = 'get', data = null) => {
  const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` } };
  return method === 'get' ? api.get(url, cfg) : api.post(url, data, cfg);
};

const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all';
const LABEL = 'block text-sm font-semibold text-gray-700 mb-1.5';
const EMPTY_CREATE = { ho_va_ten: '', email: '', so_dien_thoai: '', ngay_sinh: '', password: '', is_active: '1', is_block: '0' };

function Modal({ open, onClose, title, headerCls = 'bg-blue-600', children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className={`p-5 ${headerCls} rounded-t-3xl flex items-center justify-between`}>
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white"><i className="fa-solid fa-xmark text-xl" /></button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        {footer && <div className="p-4 border-t flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

const KhFormFields = ({ form, onChange, includePassword = false }) => (
  <>
    <div><label className={LABEL}>Họ và tên</label><input value={form.ho_va_ten || ''} onChange={e => onChange({ ...form, ho_va_ten: e.target.value })} className={INPUT} /></div>
    <div><label className={LABEL}>Email</label><input type="email" value={form.email || ''} onChange={e => onChange({ ...form, email: e.target.value })} className={INPUT} /></div>
    <div><label className={LABEL}>Số điện thoại</label><input value={form.so_dien_thoai || ''} onChange={e => onChange({ ...form, so_dien_thoai: e.target.value })} className={INPUT} /></div>
    <div><label className={LABEL}>Ngày sinh</label><input type="date" value={form.ngay_sinh || ''} onChange={e => onChange({ ...form, ngay_sinh: e.target.value })} className={INPUT} /></div>
    {includePassword && <div><label className={LABEL}>Mật khẩu</label><input type="password" value={form.password || ''} onChange={e => onChange({ ...form, password: e.target.value })} className={INPUT} /></div>}
    <div className="grid grid-cols-2 gap-3">
      <div><label className={LABEL}>Tình trạng</label><select value={form.is_block ?? '0'} onChange={e => onChange({ ...form, is_block: e.target.value })} className={INPUT}><option value="0">Hoạt động</option><option value="1">Tạm tắt</option></select></div>
      <div><label className={LABEL}>Kích hoạt</label><select value={form.is_active ?? '1'} onChange={e => onChange({ ...form, is_active: e.target.value })} className={INPUT}><option value="1">Đã kích hoạt</option><option value="0">Chưa kích hoạt</option></select></div>
    </div>
  </>
);

export default function AdminKhachHang() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [showXu, setShowXu] = useState(false);

  const [createForm, setCreateForm] = useState({ ...EMPTY_CREATE });
  const [editForm, setEditForm] = useState({});
  const [delForm, setDelForm] = useState({});
  const [xuForm, setXuForm] = useState({ id: '', ho_va_ten: '', so_xu: 0, mo_ta: '' });

  useEffect(() => { fetchList(); }, []);

  const fetchList = async () => {
    setLoading(true);
    try { const r = await adm('/api/admin/khach-hang/data'); setList(r.data.data || []); }
    catch {} finally { setLoading(false); }
  };

  const doSearch = useCallback(debounce(async (kw) => {
    if (!kw.trim()) { fetchList(); return; }
    try { const r = await adm('/api/admin/khach-hang/tim-kiem', 'post', { noi_dung_tim: kw }); setList(r.data.data || []); } catch {}
  }, 400), []);

  const handleSearch = (e) => { setSearch(e.target.value); doSearch(e.target.value); };

  const handleCreate = async () => {
    try { const r = await adm('/api/admin/khach-hang/create', 'post', createForm); if (r.data.status) { toast.success(r.data.message); setShowCreate(false); setCreateForm({ ...EMPTY_CREATE }); fetchList(); } else toast.error(r.data.message); }
    catch (e) { Object.values(e?.response?.data?.errors || {}).forEach(v => toast.error(v[0])); }
  };
  const handleEdit = async () => {
    try { const r = await adm('/api/admin/khach-hang/update', 'post', editForm); if (r.data.status) { toast.success(r.data.message); setShowEdit(false); fetchList(); } else toast.error(r.data.message); }
    catch (e) { Object.values(e?.response?.data?.errors || {}).forEach(v => toast.error(v[0])); }
  };
  const handleDel = async () => {
    try { const r = await adm('/api/admin/khach-hang/delete', 'post', delForm); if (r.data.status) { toast.success(r.data.message); setShowDel(false); fetchList(); } else toast.error(r.data.message); }
    catch {}
  };
  const handleChangeStatus = async (kh) => {
    try { const r = await adm('/api/admin/khach-hang/change-status', 'post', kh); if (r.data.status) { toast.success(r.data.message); fetchList(); } } catch {}
  };
  const handleChangeActive = async (kh) => {
    try { const r = await adm('/api/admin/khach-hang/change-active', 'post', kh); if (r.data.status) { toast.success(r.data.message); fetchList(); } else toast.error(r.data.message); } catch {}
  };
  const handleCapNhatXu = async () => {
    if (!xuForm.so_xu || xuForm.so_xu === 0 || !xuForm.mo_ta) { toast.error('Nhập số xu (≠0) và lý do!'); return; }
    try { const r = await adm('/api/admin/khach-hang/cap-nhat-xu', 'post', xuForm); if (r.data.status) { toast.success(r.data.message); setShowXu(false); fetchList(); } else toast.error(r.data.message); }
    catch (e) { Object.values(e?.response?.data?.errors || {}).forEach(v => toast.error(v[0])); }
  };



  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const currentItems = list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(list.length / itemsPerPage);

  return (
    <div className="p-6">
      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Thêm Mới Khách Hàng"
        footer={<><button onClick={() => setShowCreate(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleCreate} className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700">Tạo mới</button></>}>
        <KhFormFields form={createForm} onChange={setCreateForm} includePassword />
      </Modal>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Cập Nhật Khách Hàng" headerCls="bg-blue-700"
        footer={<><button onClick={() => setShowEdit(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleEdit} className="px-6 py-2 rounded-xl bg-blue-700 text-white font-bold text-sm hover:bg-blue-800">Lưu</button></>}>
        <KhFormFields form={editForm} onChange={setEditForm} />
      </Modal>

      {/* Delete Modal */}
      <Modal open={showDel} onClose={() => setShowDel(false)} title="Xóa Khách Hàng" headerCls="bg-red-500"
        footer={<><button onClick={() => setShowDel(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleDel} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">Xóa</button></>}>
        <div className="text-center py-4">
          <i className="fa-solid fa-user-xmark text-5xl text-red-200 mb-3 block" />
          <p className="text-gray-600">Xóa khách hàng: <b className="text-red-500">{delForm.ho_va_ten}</b>?</p>
          <p className="text-xs text-gray-400 mt-1">Hành động này không thế hoàn tác!</p>
        </div>
      </Modal>

      {/* Xu Modal */}
      <Modal open={showXu} onClose={() => setShowXu(false)} title={`Tặng/Trừ Xu - ${xuForm.ho_va_ten}`} headerCls="bg-yellow-500"
        footer={<><button onClick={() => setShowXu(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleCapNhatXu} className="px-6 py-2 rounded-xl bg-yellow-500 text-white font-bold text-sm hover:bg-yellow-600">Xác nhận</button></>}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700 mb-2">
          <i className="fa-solid fa-circle-info mr-2" />Nhập số dương để tặng xu, số âm để trừ xu
        </div>
        <div><label className={LABEL}>Số Xu Giao Dịch</label>
          <input type="number" value={xuForm.so_xu} onChange={e => setXuForm({ ...xuForm, so_xu: e.target.value })} placeholder="VD: 500 hoặc -200" className={INPUT} /></div>
        <div><label className={LABEL}>Lý Do <span className="text-red-400">*</span></label>
          <textarea rows={3} value={xuForm.mo_ta} onChange={e => setXuForm({ ...xuForm, mo_ta: e.target.value })} placeholder="Nhập lý do thay đổi xu..." className={INPUT + ' resize-none'} /></div>
      </Modal>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900"><i className="fa-solid fa-users mr-3 text-blue-500" />Danh Sách Khách Hàng</h1>
          <p className="text-gray-400 text-sm mt-1">{list.length} khách hàng</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <input value={search} onChange={handleSearch} placeholder="Tìm theo tên, email..." className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-64 transition-all" />
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          </div>
          <ExcelButton disabled={list.length === 0} onClick={() => exportToExcel(
            list.map((r, i) => ({ ...r, __stt: i + 1 })),
            [
              { label: 'STT',         key: '__stt',         width: 6  },
              { label: 'Họ và tên',   key: 'ho_va_ten',    width: 25 },
              { label: 'Email',       key: 'email',         width: 30 },
              { label: 'Số ĐT',       key: 'so_dien_thoai', width: 16 },
              { label: 'Ngày sinh',   key: 'ngay_sinh',    width: 14 },
              { label: 'Hạng',        key: 'hang_thanh_vien', width: 12 },
              { label: 'Tổng chi tiêu', key: 'tong_chi_tieu', width: 15 },
              { label: 'Xu',          key: 'diem_xu',      width: 10 },
              { label: 'Tình trạng',  key: 'is_block',     width: 14, format: v => v == 0 ? 'Hoạt động' : 'Tạm tắt' },
              { label: 'Kích hoạt',   key: 'is_active',    width: 15, format: v => v == 1 ? 'Đã kích hoạt' : 'Chưa kích hoạt' },
            ],
            'KhachHang', 'Khách Hàng'
          )} />
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
            <i className="fa-solid fa-plus" />Thêm mới
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24"><div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" /></div>
        ) : list.length === 0 ? (
          <div className="text-center py-24"><i className="fa-solid fa-users text-6xl text-gray-200 mb-4 block" /><p className="text-gray-400">Không tìm thấy khách hàng nào</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-50 text-gray-600 font-semibold text-xs uppercase">
                  <th className="px-4 py-3 text-center">#</th>
                  <th className="px-4 py-3 text-left">Họ và tên</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-center">Số ĐT</th>
                  <th className="px-4 py-3 text-center">Ngày sinh</th>
                  <th className="px-4 py-3 text-center">Hạng / Chi tiêu</th>
                  <th className="px-4 py-3 text-center">Xu</th>
                  <th className="px-4 py-3 text-center">Tình trạng</th>
                  <th className="px-4 py-3 text-center">Kích hoạt</th>
                  <th className="px-4 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.map((kh, i) => (
                  <tr key={kh.id || i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-center text-gray-400 text-xs">{(currentPage-1)*itemsPerPage+i+1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img src={kh.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(kh.ho_va_ten||'K')}&size=80&background=3b82f6&color=fff`}
                          alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" onError={e => e.target.src='https://placehold.co/32'} />
                        <span className="font-semibold text-gray-800 truncate max-w-[120px] block">{kh.ho_va_ten}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[120px]">{kh.email}</td>
                    <td className="px-4 py-3 text-center text-gray-600 text-xs">{kh.so_dien_thoai || '—'}</td>
                    <td className="px-4 py-3 text-center text-gray-500 text-xs">{kh.ngay_sinh || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          kh.hang_thanh_vien === 'Kim cương' ? 'bg-purple-100 text-purple-700' :
                          kh.hang_thanh_vien === 'Vàng' ? 'bg-yellow-100 text-yellow-700' :
                          kh.hang_thanh_vien === 'Bạc' ? 'bg-gray-200 text-gray-700' :
                          kh.hang_thanh_vien === 'Đồng' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-50 text-blue-600'
                        }`}>{kh.hang_thanh_vien}</span>
                        <span className="text-gray-500 text-xs font-semibold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(kh.tong_chi_tieu || 0)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-yellow-600 text-xs">{kh.diem_xu || 0} Xu</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleChangeStatus(kh)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold w-full transition-colors ${kh.is_block == 0 ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                        {kh.is_block == 0 ? 'Hoạt động' : 'Tạm tắt'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleChangeActive(kh)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold w-full transition-colors ${kh.is_active == 1 ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}>
                        {kh.is_active == 1 ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => { setXuForm({ id: kh.id, ho_va_ten: kh.ho_va_ten, so_xu: 0, mo_ta: '' }); setShowXu(true); }}
                          className="px-2 py-1 rounded-lg bg-yellow-100 text-yellow-700 text-xs hover:bg-yellow-200" title="Tặng/Trừ Xu">
                          <i className="fa-solid fa-coins" />
                        </button>
                        <button onClick={() => { setEditForm({ ...kh }); setShowEdit(true); }}
                          className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs hover:bg-blue-200">
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button onClick={() => { setDelForm(kh); setShowDel(true); }}
                          className="px-2 py-1 rounded-lg bg-red-100 text-red-600 text-xs hover:bg-red-200">
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  Hiển thị <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, list.length)}</span> trong <span className="font-bold text-gray-800">{list.length}</span> khách hàng
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">
                    <i className="fa-solid fa-chevron-left text-xs" />
                  </button>
                  <div className="flex gap-1 text-sm font-semibold">
                    {[...Array(totalPages)].map((_, idx) => {
                      const page = idx + 1;
                      if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                        return (
                          <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${currentPage === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                            {page}
                          </button>
                        );
                      }
                      if (page === currentPage - 2 || page === currentPage + 2) return <span key={`dots-${page}`} className="w-8 h-8 flex items-center justify-center text-gray-400">...</span>;
                      return null;
                    })}
                  </div>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">
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
