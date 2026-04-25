import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { exportToExcel, ExcelButton } from '../../utils/exportExcel';

const adm = (url, method='get', data=null) => {
  const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` } };
  return method==='get' ? api.get(url,cfg) : api.post(url,data,cfg);
};
const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all';
const LABEL = 'block text-sm font-semibold text-gray-700 mb-1.5';

function Modal({ open, onClose, title, headerCls='bg-cyan-600', children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto`} onClick={e=>e.stopPropagation()}>
        <div className={`p-5 ${headerCls} rounded-t-3xl flex items-center justify-between`}>
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white"><i className="fa-solid fa-xmark text-xl"/></button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        {footer && <div className="p-4 border-t flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export default function AdminClientMenu() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDel, setShowDel] = useState(false);

  const EMPTY = { ten_menu:'', link:'', icon:'', thu_tu:0, tinh_trang:'1' };
  const [createForm, setCreateForm] = useState({...EMPTY});
  const [editForm, setEditForm] = useState({});
  const [delForm, setDelForm] = useState({});

  useEffect(()=>{ fetchList(); },[]);
  const fetchList = async () => { setLoading(true); try{const r=await adm('/api/admin/client-menu/data');setList(r.data.data||[]);}catch{}finally{setLoading(false);} };

  const handleCreate = async () => { try{const r=await adm('/api/admin/client-menu/create','post',createForm);if(r.data.status){toast.success(r.data.message);setShowCreate(false);setCreateForm({...EMPTY});fetchList();}else toast.error(r.data.message);}catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));} };
  const handleEdit = async () => { try{const r=await adm('/api/admin/client-menu/update','post',editForm);if(r.data.status){toast.success(r.data.message);setShowEdit(false);fetchList();}else toast.error(r.data.message);}catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));} };
  const handleDel = async () => { try{const r=await adm('/api/admin/client-menu/delete','post',delForm);if(r.data.status){toast.success(r.data.message);setShowDel(false);fetchList();}else toast.error(r.data.message);}catch{} };
  const changeStatus = async (v) => { try{const r=await adm('/api/admin/client-menu/change-status','post',v);if(r.data.status){toast.success(r.data.message);fetchList();}}catch{} };

  const MenuForm = ({ form, onChange }) => (
    <div className="space-y-3">
      <div><label className={LABEL}>Tên Menu</label><input value={form.ten_menu||''} onChange={e=>onChange({...form,ten_menu:e.target.value})} className={INPUT}/></div>
      <div><label className={LABEL}>Link</label><input value={form.link||''} onChange={e=>onChange({...form,link:e.target.value})} className={INPUT} placeholder="/khach-hang/..."/></div>
      <div><label className={LABEL}>Icon Class</label><input value={form.icon||''} onChange={e=>onChange({...form,icon:e.target.value})} className={INPUT} placeholder="fa-solid fa-home"/></div>
      <div><label className={LABEL}>Thứ Tự</label><input type="number" value={form.thu_tu||0} onChange={e=>onChange({...form,thu_tu:e.target.value})} className={INPUT}/></div>
      <div><label className={LABEL}>Tình Trạng</label><select value={form.tinh_trang??'1'} onChange={e=>onChange({...form,tinh_trang:e.target.value})} className={INPUT}><option value="1">Hiển Thị</option><option value="0">Tắt</option></select></div>
    </div>
  );

  return (
    <div className="p-6">
      <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="Thêm Menu" headerCls="bg-cyan-600"
        footer={<><button onClick={()=>setShowCreate(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleCreate} className="px-6 py-2 rounded-xl bg-cyan-600 text-white font-bold text-sm hover:bg-cyan-700">Tạo mới</button></>}>
        <MenuForm form={createForm} onChange={setCreateForm}/>
      </Modal>
      <Modal open={showEdit} onClose={()=>setShowEdit(false)} title="Cập Nhật Menu" headerCls="bg-cyan-700"
        footer={<><button onClick={()=>setShowEdit(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleEdit} className="px-6 py-2 rounded-xl bg-cyan-700 text-white font-bold text-sm hover:bg-cyan-800">Lưu</button></>}>
        <MenuForm form={editForm} onChange={setEditForm}/>
      </Modal>
      <Modal open={showDel} onClose={()=>setShowDel(false)} title="Xóa Menu" headerCls="bg-red-500"
        footer={<><button onClick={()=>setShowDel(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleDel} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">Xóa</button></>}>
        <div className="text-center py-4"><i className="fa-solid fa-bars text-5xl text-red-200 mb-3 block"/>
          <p className="text-gray-600">Xóa menu <b className="text-red-500">{delForm.ten_menu}</b>?</p></div>
      </Modal>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900"><i className="fa-solid fa-list-ul mr-3 text-cyan-500"/>Quản Lý Client Menu</h1>
        <div className="flex gap-3">
          <ExcelButton disabled={list.length === 0} onClick={() => exportToExcel(
            list,
            [
              { label: 'Thứ tự',  key: 'thu_tu',   width: 8 },
              { label: 'Tên Menu', key: 'ten_menu', width: 25 },
              { label: 'Link',     key: 'link',     width: 30 },
              { label: 'Trạng thái',key: 'tinh_trang',width: 14, format: v => v == 1 ? 'Hiển thị' : 'Tạm tắt' },
            ],
            'ClientMenu', 'Client Menu'
          )} />
          <button onClick={()=>setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700"><i className="fa-solid fa-plus"/>Thêm Menu</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-cyan-100 border-t-cyan-500 rounded-full animate-spin"/></div>
        : list.length===0 ? <div className="text-center py-16 text-gray-400">Không có menu nào</div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-cyan-50 text-gray-600 font-semibold text-xs uppercase">
              <th className="px-4 py-3 text-center">Thứ tự</th>
              <th className="px-4 py-3 text-left">Tên Menu</th>
              <th className="px-4 py-3 text-left">Link</th>
              <th className="px-4 py-3 text-center">Icon</th>
              <th className="px-4 py-3 text-center">Trạng thái</th>
              <th className="px-4 py-3 text-center">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((d,i)=>(
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-center font-bold text-gray-700">{d.thu_tu}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{d.ten_menu}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs"><code className="bg-gray-100 px-1.5 py-0.5 rounded">{d.link}</code></td>
                  <td className="px-4 py-3 text-center text-xl text-gray-400"><i className={d.icon}/></td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={()=>changeStatus(d)} className={`px-3 py-1 rounded-lg text-xs font-bold w-24 transition-colors ${d.tinh_trang==1?'bg-green-100 text-green-700 hover:bg-green-200':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {d.tinh_trang==1?'Hiển thị':'Tạm tắt'}</button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={()=>{setEditForm({...d});setShowEdit(true);}} className="px-2.5 py-1.5 rounded-lg bg-cyan-100 text-cyan-700 text-xs hover:bg-cyan-200"><i className="fa-solid fa-pen"/></button>
                      <button onClick={()=>{setDelForm(d);setShowDel(true);}} className="px-2.5 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs hover:bg-red-200"><i className="fa-solid fa-trash"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        }
      </div>
    </div>
  );
}
