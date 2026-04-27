import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const qA = (url, method = 'get', data = null) => {
  const token = localStorage.getItem('quan_an_login');
  const cfg = { headers: { Authorization: `Bearer ${token}` } };
  return method === 'get' ? api.get(url, cfg) : api.post(url, data, cfg);
};

const toSlug = str => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');

const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all';
const LABEL = 'block text-sm font-semibold text-gray-700 mb-1.5';

const MonAnModal = ({ open, onClose, title, data, onChange, onSubmit, danhMucList, headerColor = 'bg-blue-600' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className={`p-5 ${headerColor} rounded-t-3xl flex items-center justify-between`}>
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white"><i className="fa-solid fa-xmark text-xl" /></button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div><label className={LABEL}>Tên Món Ăn</label>
              <input value={data.ten_mon_an || ''} onChange={e => { onChange({ ...data, ten_mon_an: e.target.value, slug_mon_an: toSlug(e.target.value) }); }} className={INPUT} /></div>
            <div><label className={LABEL}>Slug</label>
              <input value={data.slug_mon_an || ''} disabled className={INPUT + ' bg-gray-50 cursor-not-allowed'} /></div>
            <div><label className={LABEL}>Giá Bán (đ)</label>
              <input type="number" value={data.gia_ban || ''} onChange={e => onChange({ ...data, gia_ban: e.target.value })} className={INPUT} /></div>
            <div><label className={LABEL}>Giá Khuyến Mãi (đ)</label>
              <input type="number" value={data.gia_khuyen_mai || ''} onChange={e => onChange({ ...data, gia_khuyen_mai: e.target.value })} className={INPUT} /></div>
          </div>
          <div className="space-y-3">
            <div><label className={LABEL}>Hình Ảnh (URL)</label>
              <input value={data.hinh_anh || ''} onChange={e => onChange({ ...data, hinh_anh: e.target.value })} className={INPUT} placeholder="https://..." />
              {data.hinh_anh && <img src={data.hinh_anh} alt="" className="mt-2 w-full h-28 object-cover rounded-xl" onError={e => e.target.style.display='none'} />}
            </div>
            <div><label className={LABEL}>Tình Trạng</label>
              <select value={data.tinh_trang ?? '1'} onChange={e => onChange({ ...data, tinh_trang: e.target.value })} className={INPUT}>
                <option value="1">Còn hàng</option>
                <option value="0">Hết hàng</option>
              </select>
            </div>
            <div><label className={LABEL}>Danh Mục</label>
              <select value={data.id_danh_muc || ''} onChange={e => onChange({ ...data, id_danh_muc: e.target.value })} className={INPUT}>
                <option value="">-- Chọn danh mục --</option>
                {danhMucList.map((d, i) => <option key={i} value={d.id}>{d.ten_danh_muc}</option>)}
              </select>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className={LABEL}>Mô Tả</label>
            <textarea rows={4} value={data.mo_ta || ''} onChange={e => onChange({ ...data, mo_ta: e.target.value })} className={INPUT + ' resize-none'} />
          </div>

          {/* SIZES MANAGEMENT */}
          <div className="md:col-span-2 mt-2 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <label className={LABEL + ' !mb-0'}>Các Size (Tùy chọn)</label>
              <button type="button" onClick={() => {
                const newSizes = [...(data.sizes || []), { ten_size: '', gia_cong_them: 0 }];
                onChange({ ...data, sizes: newSizes });
              }} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200 transition-colors">
                + Thêm Size
              </button>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {(data.sizes || []).map((s, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="flex-1">
                    <input 
                      value={s.ten_size} 
                      onChange={e => {
                        const newSizes = [...data.sizes];
                        newSizes[idx].ten_size = e.target.value;
                        onChange({ ...data, sizes: newSizes });
                      }} 
                      placeholder="Tên Size (VD: M, L)" 
                      className={INPUT + ' !py-2'} 
                    />
                  </div>
                  <div className="flex-1">
                    <input 
                      type="number" 
                      value={s.gia_cong_them} 
                      onChange={e => {
                        const newSizes = [...data.sizes];
                        newSizes[idx].gia_cong_them = e.target.value;
                        onChange({ ...data, sizes: newSizes });
                      }} 
                      placeholder="Giá bán của Size (đ)" 
                      className={INPUT + ' !py-2'} 
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      const newSizes = data.sizes.filter((_, i) => i !== idx);
                      onChange({ ...data, sizes: newSizes });
                    }} 
                    className="bg-red-50 text-red-500 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 hover:bg-red-100 transition-colors">
                    <i className="fa-solid fa-trash text-sm" />
                  </button>
                </div>
              ))}
              {(!data.sizes || data.sizes.length === 0) && (
                <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
                  Chưa có size nào được thêm
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button>
          <button onClick={onSubmit} className={`px-6 py-2 rounded-xl text-white font-bold text-sm ${headerColor} hover:opacity-90`}>{title.includes('Thêm') ? 'Thêm Mới' : 'Cập Nhật'}</button>
        </div>
      </div>
    </div>
  );
};

const ToppingModal = ({ open, onClose, title, data, onChange, onSubmit }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 bg-yellow-500 rounded-t-3xl flex items-center justify-between">
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white"><i className="fa-solid fa-xmark text-xl" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className={LABEL}>Tên Topping</label><input value={data.ten_topping || ''} onChange={e => onChange({ ...data, ten_topping: e.target.value })} className={INPUT} /></div>
          <div><label className={LABEL}>Giá (đ)</label><input type="number" value={data.gia || ''} onChange={e => onChange({ ...data, gia: e.target.value })} className={INPUT} /></div>
          <div><label className={LABEL}>Loại</label>
            <select value={data.loai || 'all'} onChange={e => onChange({ ...data, loai: e.target.value })} className={INPUT}>
              <option value="all">Tất cả</option>
              <option value="drink">Đồ uống</option>
              <option value="food">Đồ ăn</option>
            </select>
          </div>
          <div><label className={LABEL}>Mô Tả</label><textarea rows={3} value={data.mo_ta || ''} onChange={e => onChange({ ...data, mo_ta: e.target.value })} className={INPUT + ' resize-none'} /></div>
        </div>
        <div className="p-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button>
          <button onClick={onSubmit} className="px-6 py-2 rounded-xl bg-yellow-500 text-white font-bold text-sm hover:bg-yellow-600">{title.includes('Thêm') ? 'Thêm Mới' : 'Cập Nhật'}</button>
        </div>
      </div>
    </div>
  );
};

const Pagination = ({ current, total, onChange, activeColor = 'bg-blue-600' }) => {
  return (
    <div className="flex items-center justify-center gap-1.5 mt-8 mb-4">
      <button onClick={() => onChange(p => Math.max(1, p - 1))} disabled={current === 1} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white text-gray-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 transition-all shadow-sm border border-gray-100">
        <i className="fa-solid fa-chevron-left text-xs" />
      </button>
      <div className="flex items-center gap-1">
        {[...Array(total)].map((_, idx) => {
          const p = idx + 1;
          if (p === 1 || p === total || (p >= current - 1 && p <= current + 1)) {
            return (
              <button key={p} onClick={() => onChange(p)} className={`w-10 h-10 flex items-center justify-center rounded-2xl font-black text-xs transition-all shadow-sm ${current === p ? `${activeColor} text-white shadow-blue-200` : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-blue-600 border border-gray-100'}`}>
                {p}
              </button>
            );
          }
          if (p === current - 2 || p === current + 2) return <span key={`dots-${p}`} className="w-6 text-center text-gray-300">...</span>;
          return null;
        })}
      </div>
      <button onClick={() => onChange(p => Math.min(total, p + 1))} disabled={current === total} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white text-gray-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 transition-all shadow-sm border border-gray-100">
        <i className="fa-solid fa-chevron-right text-xs" />
      </button>
    </div>
  );
};

function ConfirmDeleteModal({ open, onClose, onConfirm, name, type = 'món ăn' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 bg-red-500 rounded-t-3xl">
          <h3 className="font-bold text-white"><i className="fa-solid fa-triangle-exclamation mr-2" />Xác Nhận Xóa</h3>
        </div>
        <div className="p-6 text-center">
          <i className="fa-solid fa-trash-alt text-5xl text-red-300 mb-4 block" />
          <p className="text-gray-600">Bạn có chắc muốn xóa {type}: <b className="text-red-500">{name}</b> không?</p>
          <p className="text-xs text-gray-400 mt-2">Hành động này không thể hoàn tác!</p>
        </div>
        <div className="p-4 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button>
          <button onClick={onConfirm} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">Xóa</button>
        </div>
      </div>
    </div>
  );
}

export default function QuanAnMonAn() {
  const [tab, setTab] = useState('mon_an');
  const [monAnList, setMonAnList] = useState([]);
  const [toppingList, setToppingList] = useState([]);
  const [danhMucList, setDanhMucList] = useState([]);

  // Mon an modals
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [addForm, setAddForm] = useState({ tinh_trang: '1' });
  const [editForm, setEditForm] = useState({});
  const [delForm, setDelForm] = useState({});

  // Topping modals
  const [showAddTop, setShowAddTop] = useState(false);
  const [showEditTop, setShowEditTop] = useState(false);
  const [showDelTop, setShowDelTop] = useState(false);
  const [addTopForm, setAddTopForm] = useState({ loai: 'all', gia: 0 });
  const [editTopForm, setEditTopForm] = useState({});
  const [delTopForm, setDelTopForm] = useState({});

  const [pageMA, setPageMA] = useState(1);
  const [pageTop, setPageTop] = useState(1);
  const itemsPerPage = 8;
  const totalMA = Math.ceil(monAnList.length / itemsPerPage);
  const currentMA = monAnList.slice((pageMA - 1) * itemsPerPage, pageMA * itemsPerPage);
  const totalTop = Math.ceil(toppingList.length / itemsPerPage);
  const currentTop = toppingList.slice((pageTop - 1) * itemsPerPage, pageTop * itemsPerPage);

  useEffect(() => { fetchMonAn(); fetchDanhMuc(); }, []);
  useEffect(() => { if (tab === 'topping') fetchTopping(); }, [tab]);

  const fetchMonAn = async () => {
    try { const r = await qA('/api/quan-an/mon-an/data'); setMonAnList(r.data.data || []); } catch {}
  };
  const fetchDanhMuc = async () => {
    try { const r = await qA('/api/quan-an/danh-muc/data'); setDanhMucList(r.data.data || []); } catch {}
  };
  const fetchTopping = async () => {
    try { const r = await qA('/api/quan-an/toppings/data'); setToppingList(r.data.data || []); } catch {}
  };

  // Mon an handlers
  const handleAdd = async () => {
    try { const r = await qA('/api/quan-an/mon-an/create', 'post', addForm); toast.success(r.data.message); setShowAdd(false); setAddForm({ tinh_trang: '1' }); fetchMonAn(); }
    catch (e) { Object.values(e?.response?.data?.errors || {}).forEach(v => toast.error(v[0])); }
  };
  const handleEdit = async () => {
    try { const r = await qA('/api/quan-an/mon-an/update', 'post', editForm); toast.success(r.data.message); setShowEdit(false); fetchMonAn(); }
    catch (e) { Object.values(e?.response?.data?.errors || {}).forEach(v => toast.error(v[0])); }
  };
  const handleDel = async () => {
    try { const r = await qA('/api/quan-an/mon-an/delete', 'post', delForm); toast.success(r.data.message); setShowDel(false); fetchMonAn(); }
    catch (e) { toast.error('Xóa thất bại!'); }
  };
  const handleChange = async (item) => {
    try { const r = await qA('/api/quan-an/mon-an/change', 'post', item); if (r.data.status) { toast.success(r.data.message); fetchMonAn(); } else toast.error(r.data.message); }
    catch {}
  };

  // Topping handlers
  const handleAddTop = async () => {
    try { const r = await qA('/api/quan-an/toppings/create', 'post', addTopForm); toast.success(r.data.message); setShowAddTop(false); setAddTopForm({ loai: 'all', gia: 0 }); fetchTopping(); }
    catch (e) { Object.values(e?.response?.data?.errors || {}).forEach(v => toast.error(v[0])); }
  };
  const handleEditTop = async () => {
    try { const r = await qA('/api/quan-an/toppings/update', 'post', editTopForm); toast.success(r.data.message); setShowEditTop(false); fetchTopping(); }
    catch (e) { Object.values(e?.response?.data?.errors || {}).forEach(v => toast.error(v[0])); }
  };
  const handleDelTop = async () => {
    try { const r = await qA('/api/quan-an/toppings/delete', 'post', delTopForm); toast.success(r.data.message); setShowDelTop(false); fetchTopping(); }
    catch {}
  };
  const handleChangeTop = async (item) => {
    try { const r = await qA('/api/quan-an/toppings/change-status', 'post', item); if (r.data.status) { toast.success(r.data.message); fetchTopping(); } else toast.error(r.data.message); }
    catch {}
  };

  const fmt = n => n ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n) : '0đ';
  const trunc = (s, l = 50) => !s ? '' : s.length <= l ? s : s.slice(0, l) + '...';

  const LOAI = { drink: { badge: 'bg-cyan-100 text-cyan-700', label: 'Đồ uống' }, food: { badge: 'bg-orange-100 text-orange-700', label: 'Đồ ăn' }, all: { badge: 'bg-gray-100 text-gray-600', label: 'Tất cả' } };

  return (
    <div className="p-6">
      {/* Modals */}
      <MonAnModal open={showAdd} onClose={() => setShowAdd(false)} title="Thêm Mới Món Ăn" data={addForm} onChange={setAddForm} onSubmit={handleAdd} danhMucList={danhMucList} />
      <MonAnModal open={showEdit} onClose={() => setShowEdit(false)} title="Cập Nhật Món Ăn" data={editForm} onChange={setEditForm} onSubmit={handleEdit} danhMucList={danhMucList} />
      <ConfirmDeleteModal open={showDel} onClose={() => setShowDel(false)} onConfirm={handleDel} name={delForm.ten_mon_an} />
      <ToppingModal open={showAddTop} onClose={() => setShowAddTop(false)} title="Thêm Mới Topping" data={addTopForm} onChange={setAddTopForm} onSubmit={handleAddTop} />
      <ToppingModal open={showEditTop} onClose={() => setShowEditTop(false)} title="Cập Nhật Topping" data={editTopForm} onChange={setEditTopForm} onSubmit={handleEditTop} />
      <ConfirmDeleteModal open={showDelTop} onClose={() => setShowDelTop(false)} onConfirm={handleDelTop} name={delTopForm.ten_topping} type="topping" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900"><i className="fa-solid fa-bowl-food mr-3 text-blue-500" />Quản Lý Món Ăn</h1>
          <p className="text-gray-500 text-sm mt-1">Thêm, sửa, xóa món ăn và topping của quán</p>
        </div>
        {/* Tab + Actions */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            <button onClick={() => setTab('mon_an')} className={`px-4 py-2 text-sm font-semibold transition-colors ${tab === 'mon_an' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              <i className="fa-solid fa-utensils mr-1.5" />Món Ăn
            </button>
            <button onClick={() => setTab('topping')} className={`px-4 py-2 text-sm font-semibold transition-colors ${tab === 'topping' ? 'bg-yellow-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              <i className="fa-solid fa-star mr-1.5 text-yellow-500" />Topping
            </button>
          </div>
          {tab === 'mon_an'
            ? <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
                <i className="fa-solid fa-plus" />Thêm Món Ăn
              </button>
            : <button onClick={() => setShowAddTop(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500 text-white text-sm font-bold hover:bg-yellow-600 transition-colors">
                <i className="fa-solid fa-plus" />Thêm Topping
              </button>
          }
        </div>
      </div>

      {/* ========= TAB MÓN ĂN ========= */}
      {tab === 'mon_an' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {monAnList.length === 0
            ? <div className="text-center py-24 text-gray-400"><i className="fa-solid fa-bowl-food text-6xl mb-4 block text-gray-200" /><p>Chưa có món ăn nào</p></div>
            : <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-blue-50 text-gray-600 font-semibold text-xs uppercase">
                      <th className="px-4 py-3 text-center">#</th>
                      <th className="px-4 py-3 text-left">Tên Món</th>
                      <th className="px-4 py-3 text-right">Giá Bán</th>
                      <th className="px-4 py-3 text-right">Khuyến Mãi</th>
                      <th className="px-4 py-3 text-left">Mô Tả</th>
                      <th className="px-4 py-3 text-center">Hình</th>
                      <th className="px-4 py-3 text-center">Danh Mục</th>
                      <th className="px-4 py-3 text-center">Tình Trạng</th>
                      <th className="px-4 py-3 text-center">Thao Tác</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {currentMA.map((m, i) => (
                        <tr key={m.id || i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-center text-gray-400">{(pageMA - 1) * itemsPerPage + i + 1}</td>
                          <td className="px-4 py-3 font-semibold text-gray-800">{m.ten_mon_an}</td>
                          <td className="px-4 py-3 text-right text-gray-600 font-medium">{fmt(m.gia_ban)}</td>
                          <td className="px-4 py-3 text-right text-orange-500 font-bold">{fmt(m.gia_khuyen_mai)}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{trunc(m.mo_ta)}</td>
                          <td className="px-4 py-3 text-center">
                            <img src={m.hinh_anh} alt="" className="w-10 h-10 rounded-xl object-cover mx-auto shadow-sm border border-gray-100" onError={e => e.target.src='https://placehold.co/50'} />
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">{m.ten_danh_muc}</span></td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleChange(m)}
                              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase w-full max-w-[100px] transition-all border ${m.tinh_trang == 1 ? 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'}`}>
                              {m.tinh_trang == 1 ? <><i className="fa-solid fa-eye mr-1" />Hiển thị</> : <><i className="fa-solid fa-eye-slash mr-1" />Tạm tắt</>}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => { setEditForm({ ...m }); setShowEdit(true); }}
                                className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm"><i className="fa-solid fa-pen text-xs" /></button>
                              <button onClick={() => { setDelForm(m); setShowDel(true); }}
                                className="w-8 h-8 rounded-xl bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-sm"><i className="fa-solid fa-trash text-xs" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalMA > 1 && <Pagination current={pageMA} total={totalMA} onChange={setPageMA} />}
              </>
          }
        </div>
      )}

      {/* ========= TAB TOPPING ========= */}
      {tab === 'topping' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {toppingList.length === 0
            ? <div className="text-center py-24 text-gray-400"><i className="fa-solid fa-star text-6xl mb-4 block text-gray-200" /><p>Chưa có topping nào</p></div>
            : <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-yellow-50 text-gray-600 font-semibold text-xs uppercase">
                      <th className="px-4 py-3 text-center">#</th>
                      <th className="px-4 py-3 text-left">Tên Topping</th>
                      <th className="px-4 py-3 text-right">Giá</th>
                      <th className="px-4 py-3 text-center">Loại</th>
                      <th className="px-4 py-3 text-left">Mô Tả</th>
                      <th className="px-4 py-3 text-center">Tình Trạng</th>
                      <th className="px-4 py-3 text-center">Thao Tác</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {currentTop.map((t, i) => {
                        const loaiInfo = LOAI[t.loai] || LOAI.all;
                        return (
                          <tr key={t.id || i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-center text-gray-400">{(pageTop - 1) * itemsPerPage + i + 1}</td>
                            <td className="px-4 py-3 font-semibold text-gray-800">{t.ten_topping}</td>
                            <td className="px-4 py-3 text-right font-black text-yellow-600">+{fmt(t.gia)}</td>
                            <td className="px-4 py-3 text-center whitespace-nowrap"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${loaiInfo.badge}`}>{loaiInfo.label}</span></td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{t.mo_ta}</td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => handleChangeTop(t)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase w-full max-w-[100px] transition-all border ${t.tinh_trang == 1 ? 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100' : 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100'}`}>
                                {t.tinh_trang == 1 ? 'Hiển thị' : 'Tạm tắt'}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex gap-1 justify-center">
                                <button onClick={() => { setEditTopForm({ ...t }); setShowEditTop(true); }}
                                  className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm"><i className="fa-solid fa-pen text-xs" /></button>
                                <button onClick={() => { setDelTopForm(t); setShowDelTop(true); }}
                                  className="w-8 h-8 rounded-xl bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-sm"><i className="fa-solid fa-trash text-xs" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {totalTop > 1 && <Pagination current={pageTop} total={totalTop} onChange={setPageTop} activeColor="bg-yellow-500" />}
              </>
          }
        </div>
      )}
    </div>
  );
}
