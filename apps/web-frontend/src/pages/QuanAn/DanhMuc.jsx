import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const qA = (url, method = 'get', data = null) => {
  const token = localStorage.getItem('quan_an_login');
  const cfg = { headers: { Authorization: `Bearer ${token}` } };
  return method === 'get' ? api.get(url, cfg) : api.post(url, data, cfg);
};

const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all';
const LABEL = 'block text-sm font-semibold text-gray-700 mb-1.5';

function DanhMucModal({ open, onClose, title, data, onChange, onSubmit, parents }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className={`p-5 rounded-t-3xl flex items-center justify-between ${title.includes('Thêm') ? 'bg-blue-600' : 'bg-blue-700'}`}>
          <h3 className="font-bold text-white"><i className="fa-solid fa-tags mr-2" />{title}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white"><i className="fa-solid fa-xmark text-xl" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className={LABEL}>Tên Danh Mục</label>
            <input value={data.ten_danh_muc || ''} onChange={e => onChange({ ...data, ten_danh_muc: e.target.value })} className={INPUT} /></div>
          <div><label className={LABEL}>Slug</label>
            <input value={data.slug_danh_muc || ''} onChange={e => onChange({ ...data, slug_danh_muc: e.target.value })} className={INPUT} /></div>
          <div><label className={LABEL}>Hình Ảnh (URL)</label>
            <input value={data.hinh_anh || ''} onChange={e => onChange({ ...data, hinh_anh: e.target.value })} className={INPUT} placeholder="https://..." /></div>
          <div><label className={LABEL}>Danh Mục Cha</label>
            <select value={data.id_danh_muc_cha || ''} onChange={e => onChange({ ...data, id_danh_muc_cha: e.target.value })} className={INPUT}>
              <option value="">Không Có (Root)</option>
              {parents.map((p, i) => <option key={i} value={p.id}>{p.ten_danh_muc}</option>)}
            </select>
          </div>
          <div><label className={LABEL}>Trạng Thái</label>
            <select value={data.tinh_trang ?? '1'} onChange={e => onChange({ ...data, tinh_trang: e.target.value })} className={INPUT}>
              <option value="1">Hoạt Động</option>
              <option value="0">Tạm Tắt</option>
            </select>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button>
          <button onClick={onSubmit} className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700">
            {title.includes('Thêm') ? 'Thêm Mới' : 'Lưu Thay Đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDel({ open, onClose, onConfirm, name }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 bg-red-500 rounded-t-3xl"><h3 className="font-bold text-white"><i className="fa-solid fa-triangle-exclamation mr-2" />Xác Nhận Xóa</h3></div>
        <div className="p-6 text-center">
          <i className="fa-solid fa-folder-minus text-5xl text-red-200 mb-4 block" />
          <p className="text-gray-600">Xóa danh mục: <b className="text-red-500">{name}</b>?</p>
        </div>
        <div className="p-4 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button>
          <button onClick={onConfirm} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">Xóa</button>
        </div>
      </div>
    </div>
  );
}

export default function QuanAnDanhMuc() {
  const [list, setList] = useState([]);
  const [parents, setParents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [addForm, setAddForm] = useState({ tinh_trang: '1' });
  const [editForm, setEditForm] = useState({});
  const [delForm, setDelForm] = useState({});

  useEffect(() => { fetchList(); fetchParents(); }, []);

  const fetchList = async () => { try { const r = await qA('/api/quan-an/danh-muc/data'); setList(r.data.data || []); } catch {} };
  const fetchParents = async () => { try { const r = await qA('/api/quan-an/danh-muc/data-danh-muc-cha'); setParents(r.data.data || []); } catch {} };

  const handleAdd = async () => {
    try { const r = await qA('/api/quan-an/danh-muc/create', 'post', addForm); if (r.data.status) { toast.success(r.data.message); setShowAdd(false); setAddForm({ tinh_trang: '1' }); fetchList(); fetchParents(); } else toast.error(r.data.message); }
    catch (e) { Object.values(e?.response?.data?.errors || {}).forEach(v => toast.error(v[0])); }
  };
  const handleEdit = async () => {
    try { const r = await qA('/api/quan-an/danh-muc/update', 'post', editForm); if (r.data.status) { toast.success(r.data.message); setShowEdit(false); fetchList(); fetchParents(); } else toast.error(r.data.message); }
    catch (e) { Object.values(e?.response?.data?.errors || {}).forEach(v => toast.error(v[0])); }
  };
  const handleDel = async () => {
    try { const r = await qA('/api/quan-an/danh-muc/delete', 'post', delForm); if (r.data.status) { toast.success(r.data.message); setShowDel(false); fetchList(); fetchParents(); } else toast.error(r.data.message); }
    catch {}
  };
  const handleChange = async (item) => {
    try { const r = await qA('/api/quan-an/danh-muc/change', 'post', item); if (r.data.status) { toast.success(r.data.message); fetchList(); } else toast.error(r.data.message); }
    catch {}
  };

  return (
    <div className="p-6">
      <DanhMucModal open={showAdd} onClose={() => setShowAdd(false)} title="Thêm Mới Danh Mục" data={addForm} onChange={setAddForm} onSubmit={handleAdd} parents={parents} />
      <DanhMucModal open={showEdit} onClose={() => setShowEdit(false)} title="Cập Nhật Danh Mục" data={editForm} onChange={setEditForm} onSubmit={handleEdit} parents={parents} />
      <ConfirmDel open={showDel} onClose={() => setShowDel(false)} onConfirm={handleDel} name={delForm.ten_danh_muc} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900"><i className="fa-solid fa-tags mr-3 text-blue-500" />Danh Mục Món Ăn</h1>
          <p className="text-gray-400 text-sm mt-1">{list.length} danh mục</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
          <i className="fa-solid fa-plus" />Thêm Mới
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {list.length === 0
          ? <div className="text-center py-24"><i className="fa-solid fa-tags text-6xl text-gray-200 mb-4 block" /><p className="text-gray-400">Chưa có danh mục nào</p></div>
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-blue-50 text-gray-600 font-semibold text-xs uppercase">
                  <th className="px-4 py-3 text-center">#</th>
                  <th className="px-4 py-3 text-left">Tên Danh Mục</th>
                  <th className="px-4 py-3 text-left">Slug</th>
                  <th className="px-4 py-3 text-center">Hình</th>
                  <th className="px-4 py-3 text-center">Danh Mục Cha</th>
                  <th className="px-4 py-3 text-center">Trạng Thái</th>
                  <th className="px-4 py-3 text-center">Thao Tác</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-center text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{item.ten_danh_muc}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{item.slug_danh_muc}</td>
                      <td className="px-4 py-3 text-center">
                        {item.hinh_anh
                          ? <img src={item.hinh_anh} alt="" className="w-10 h-10 rounded-lg object-cover mx-auto" onError={e => e.target.style.display='none'} />
                          : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mx-auto"><i className="fa-solid fa-image text-gray-300" /></div>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.id_danh_muc_cha ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                          {item.id_danh_muc_cha ? item.ten_danh_muc_cha : 'Root'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleChange(item)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold w-full transition-colors ${item.tinh_trang == 1 ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                          {item.tinh_trang == 1 ? 'Hiển thị' : 'Tạm dừng'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => { setEditForm({ ...item }); setShowEdit(true); }}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition-colors"><i className="fa-solid fa-pen" /></button>
                          <button onClick={() => { setDelForm(item); setShowDel(true); }}
                            className="px-2.5 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200 transition-colors"><i className="fa-solid fa-trash" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </div>
  );
}
