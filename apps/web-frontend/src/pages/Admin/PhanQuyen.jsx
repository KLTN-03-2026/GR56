import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const adm = (url, method='get', data=null) => {
  const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` } };
  return method==='get' ? api.get(url,cfg) : api.post(url,data,cfg);
};
const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all';
const LABEL = 'block text-sm font-semibold text-gray-700 mb-1.5';

function Modal({ open, onClose, title, headerCls='bg-purple-600', children, footer }) {
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

export default function AdminPhanQuyen() {
  const [listCV, setListCV] = useState([]);
  const [listCN, setListCN] = useState([]);
  const [listPQ, setListPQ] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [forbidden, setForbidden] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [selectedRole, setSelectedRole] = useState(null); // the role being edited for permissions
  const [search, setSearch] = useState('');
  
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDel, setShowDel] = useState(false);

  const [createForm, setCreateForm] = useState({ ten_chuc_vu:'' });
  const [editForm, setEditForm] = useState({});
  const [delForm, setDelForm] = useState({});

  const can = (id) => Number(admin?.is_master) === 1 || (admin?.phan_quyen_ids || []).includes(id);

  const handleForbidden = (e) => {
    if (e?.response?.status === 403) {
      setForbidden(e.response.data?.message || 'Bạn không có quyền thực hiện chức năng này!');
      return true;
    }
    return false;
  };

  const loadProfile = async () => {
    const r = await adm('/api/admin/profile');
    setAdmin(r.data.data || {});
  };

  const loadData = async () => {
    try {
      const r=await adm('/api/admin/chuc-vu/data');
      if (r.data.status === 0) setForbidden(r.data.message);
      else setListCV(r.data.data||[]);
    } catch(e) { handleForbidden(e); }
  };
  const loadChucNang = async () => {
    try {
      const r=await adm('/api/admin/chuc-nang/data');
      if (r.data.status === 0) setForbidden(r.data.message);
      else setListCN(r.data.data||[]);
    } catch(e) { handleForbidden(e); }
  };
  const loadPhanQuyen = async (roleId = null) => {
    try{
      const r=await adm('/api/admin/phan-quyen/chi-tiet-data');
      if(r.data.status) {
        setListPQ(r.data.data||[]);
      } else {
        setForbidden(r.data.message);
      }
    }catch(e){ handleForbidden(e); }
  };

  useEffect(()=>{
    const init = async () => {
      setLoading(true);
      try {
        await loadProfile();
        await Promise.all([loadData(), loadChucNang(), loadPhanQuyen()]);
      } finally {
        setLoading(false);
      }
    };
    init();
  },[]);

  const currentPQ = listPQ.filter(x => selectedRole && x.id_chuc_vu === selectedRole.id);

  const handleCreate = async () => { try{const r=await adm('/api/admin/chuc-vu/create','post',createForm);if(r.data.status){toast.success(r.data.message);setShowCreate(false);setCreateForm({ten_chuc_vu:''});loadData();}else toast.error(r.data.message);}catch(e){toast.error('Lỗi');} };
  const handleEdit = async () => { try{const r=await adm('/api/admin/chuc-vu/update','post',editForm);if(r.data.status){toast.success(r.data.message);setShowEdit(false);loadData();if(selectedRole?.id===editForm.id) setSelectedRole({...editForm});}else toast.error(r.data.message);}catch(e){toast.error('Lỗi');} };
  const handleDel = async () => { try{const r=await adm('/api/admin/chuc-vu/delete','post',delForm);if(r.data.status){toast.success(r.data.message);setShowDel(false);loadData();if(selectedRole?.id===delForm.id) setSelectedRole(null);}else toast.error(r.data.message);}catch{} };

  const capQuyen = async (cn) => {
    if(!can(56)) { toast.error("Bạn không có quyền cấp quyền!"); return; }
    if(!selectedRole) { toast.error("Vui lòng chọn chức vụ để phân quyền!"); return; }
    try {
      const payload = { id_chuc_nang: cn.id, id_chuc_vu: selectedRole.id };
      const r = await adm('/api/admin/phan-quyen-chuc-vu/create','post',payload);
      if(r.data.status){toast.success(r.data.message);loadPhanQuyen();} else toast.error(r.data.message);
    } catch(e) { toast.error('Lỗi phân quyền'); }
  };

  const xoaQuyen = async (pq) => {
    if(!can(57)) { toast.error("Bạn không có quyền xóa quyền!"); return; }
    try {
      const r = await adm('/api/admin/phan-quyen-chuc-vu/delete','post',pq);
      if(r.data.status){toast.success(r.data.message);loadPhanQuyen();} else toast.error(r.data.message);
    } catch(e) { toast.error('Lỗi xóa phân quyền'); }
  };

  const filteredCV = listCV.filter(c =>
    c.ten_chuc_vu?.toLowerCase().includes(search.toLowerCase()) &&
    c.nhan_viens && c.nhan_viens.length > 0
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="bg-white border border-red-100 rounded-2xl shadow-sm p-8 text-center max-w-md">
          <i className="fa-solid fa-lock text-4xl text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Không có quyền truy cập</h2>
          <p className="text-sm text-gray-500">{forbidden}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="Thêm Chức Vụ" headerCls="bg-purple-600"
        footer={<><button onClick={()=>setShowCreate(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleCreate} className="px-6 py-2 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700">Thêm mới</button></>}>
        <div><label className={LABEL}>Tên chức vụ</label><input value={createForm.ten_chuc_vu||''} onChange={e=>setCreateForm({...createForm,ten_chuc_vu:e.target.value})} className={INPUT}/></div>
      </Modal>
      <Modal open={showEdit} onClose={()=>setShowEdit(false)} title="Cập Nhật Chức Vụ" headerCls="bg-purple-700"
        footer={<><button onClick={()=>setShowEdit(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleEdit} className="px-6 py-2 rounded-xl bg-purple-700 text-white font-bold text-sm hover:bg-purple-800">Lưu</button></>}>
        <div><label className={LABEL}>Tên chức vụ</label><input value={editForm.ten_chuc_vu||''} onChange={e=>setEditForm({...editForm,ten_chuc_vu:e.target.value})} className={INPUT}/></div>
      </Modal>
      <Modal open={showDel} onClose={()=>setShowDel(false)} title="Xóa Chức Vụ" headerCls="bg-red-500"
        footer={<><button onClick={()=>setShowDel(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleDel} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">Xóa</button></>}>
        <div className="text-center py-4"><i className="fa-solid fa-triangle-exclamation text-5xl text-red-200 mb-3 block"/>
          <p className="text-gray-600">Bạn có chắc chắn muốn xóa chức vụ <b className="text-red-500">{delForm.ten_chuc_vu}</b>?</p></div>
      </Modal>

      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900"><i className="fa-solid fa-shield-halved mr-3 text-purple-500"/>Quản Lý Phân Quyền</h1></div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* COL 1: Chức vụ */}
        <div className="card bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-gray-800"><i className="fa-solid fa-users-gear text-purple-500 mr-2"/>Danh sách Chức Vụ</h3>
            {can(33) && <button onClick={()=>setShowCreate(true)} className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 flex items-center justify-center"><i className="fa-solid fa-plus"/></button>}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm chức vụ..." className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm mb-4 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200"/>
          
          <div className="space-y-3">
            {filteredCV.map(c=>(
              <div key={c.id} className={`p-4 rounded-xl border flex items-center justify-between transition-colors cursor-pointer ${selectedRole?.id===c.id?'border-purple-500 bg-purple-50':'border-gray-200 hover:border-purple-200'}`} onClick={()=>setSelectedRole(c)}>
                <div>
                  <div className="font-semibold text-gray-800">{c.ten_chuc_vu}</div>
                  {c.nhan_viens && c.nhan_viens.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {c.nhan_viens.map(nv => nv.ho_va_ten).join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex gap-1" onClick={e=>e.stopPropagation()}>
                  {can(36) && <button onClick={()=>{setEditForm({...c});setShowEdit(true);}} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-600"><i className="fa-solid fa-pen text-xs"/></button>}
                  {can(37) && <button onClick={()=>{setDelForm(c);setShowDel(true);}} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600"><i className="fa-solid fa-trash text-xs"/></button>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COL 2: Phân Quyền for selected */ }
        <div className="card bg-white rounded-3xl p-6 shadow-sm border border-gray-100 lg:col-span-2">
          {!selectedRole ? (
             <div className="h-full flex flex-col items-center justify-center py-20 text-gray-400">
               <i className="fa-solid fa-hand-pointer text-5xl mb-4 text-purple-200"/>
               <p>Chọn môt chức vụ bên trái để xem và phân quyền</p>
             </div>
          ) : (
            <>
              <h3 className="font-bold text-lg text-gray-800 mb-2">Đang phân quyền cho: <span className="text-purple-600">{selectedRole.ten_chuc_vu}</span></h3>
              <p className="text-sm text-gray-500 mb-6 border-b pb-4">Quản lý các chức năng mà chức vụ này có thể truy cập.</p>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-sm text-gray-700 mb-3 bg-gray-100 px-3 py-1.5 rounded-lg inline-block">Chức năng khả dụng</h4>
                  <div className="overflow-y-auto max-h-96 pr-2 space-y-2">
                    {listCN.map(cn=>(
                      <div key={cn.id} className="flex items-center justify-between p-3 border border-gray-100 bg-gray-50 rounded-xl hover:border-purple-200 hover:bg-white transition-all">
                        <span className="text-sm font-medium text-gray-700">{cn.ten_chuc_nang}</span>
                        {can(56) && <button onClick={()=>capQuyen(cn)} className="px-3 py-1.5 bg-white border border-gray-200 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-50 shadow-sm"><i className="fa-solid fa-plus mr-1"/>Cấp quyền</button>}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-green-700 mb-3 bg-green-50 px-3 py-1.5 rounded-lg inline-block border border-green-100">Đã cấp quyền ({currentPQ.length})</h4>
                  <div className="overflow-y-auto max-h-96 pr-2 space-y-2">
                    {currentPQ.length===0 && <div className="text-center py-10 text-gray-400 text-sm">Chưa có quyền nào</div>}
                    {currentPQ.map(pq=>(
                      <div key={pq.id} className="flex items-center justify-between p-3 border border-green-100 bg-white rounded-xl shadow-sm">
                        <span className="text-sm font-medium text-gray-800 flex items-center gap-2"><i className="fa-solid fa-check text-green-500 text-xs"/>{pq.ten_chuc_nang}</span>
                        {can(57) && <button onClick={()=>xoaQuyen(pq)} className="w-7 h-7 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"><i className="fa-solid fa-xmark"/></button>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
