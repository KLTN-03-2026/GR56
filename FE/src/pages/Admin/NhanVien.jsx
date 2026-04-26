import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { debounce } from '../../utils/helpers';
import { exportToExcel, ExcelButton } from '../../utils/exportExcel';

const adm = (url, method='get', data=null) => {
  const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` } };
  return method==='get' ? api.get(url,cfg) : api.post(url,data,cfg);
};
const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all';
const LABEL = 'block text-sm font-semibold text-gray-700 mb-1.5';

function Modal({ open, onClose, title, headerCls='bg-blue-600', children, footer, wide=false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-3xl w-full ${wide?'max-w-3xl':'max-w-lg'} shadow-2xl max-h-[90vh] overflow-y-auto`} onClick={e=>e.stopPropagation()}>
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

const NVForm = ({ form, onChange, isEdit=false, listCV=[] }) => (
  <div className="grid sm:grid-cols-2 gap-3">
    <div><label className={LABEL}>Họ và tên</label><input value={form.ho_va_ten||''} onChange={e=>onChange({...form,ho_va_ten:e.target.value})} className={INPUT}/></div>
    <div><label className={LABEL}>Email</label><input type="email" value={form.email||''} onChange={e=>onChange({...form,email:e.target.value})} className={INPUT} disabled={isEdit}/></div>
    {!isEdit && <>
      <div><label className={LABEL}>Mật khẩu</label><input type="password" value={form.password||''} onChange={e=>onChange({...form,password:e.target.value})} className={INPUT}/></div>
      <div><label className={LABEL}>Xác nhận mật khẩu</label><input type="password" value={form.re_password||''} onChange={e=>onChange({...form,re_password:e.target.value})} className={INPUT}/></div>
    </>}
    <div><label className={LABEL}>Số ĐT</label><input value={form.so_dien_thoai||''} onChange={e=>onChange({...form,so_dien_thoai:e.target.value})} className={INPUT}/></div>
    <div><label className={LABEL}>Ngày sinh</label><input type="date" value={form.ngay_sinh||''} onChange={e=>onChange({...form,ngay_sinh:e.target.value})} className={INPUT}/></div>
    <div className="sm:col-span-2"><label className={LABEL}>Địa chỉ</label><input value={form.dia_chi||''} onChange={e=>onChange({...form,dia_chi:e.target.value})} className={INPUT}/></div>
    <div><label className={LABEL}>Chức vụ</label><select value={form.id_chuc_vu||''} onChange={e=>onChange({...form,id_chuc_vu:e.target.value})} className={INPUT}><option value="">-- Chọn chức vụ --</option>{listCV.map(c=><option key={c.id} value={c.id}>{c.ten_chuc_vu}</option>)}</select></div>
    <div><label className={LABEL}>Trạng thái</label><select value={form.tinh_trang??'1'} onChange={e=>onChange({...form,tinh_trang:e.target.value})} className={INPUT}><option value="1">Hoạt động</option><option value="0">Tạm tắt</option></select></div>
  </div>
);

export default function AdminNhanVien() {
  const [list, setList] = useState([]);
  const [listCV, setListCV] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDel, setShowDel] = useState(false);

  const EMPTY = { ho_va_ten:'', email:'', password:'', re_password:'', so_dien_thoai:'', dia_chi:'', ngay_sinh:'', tinh_trang:'1', id_chuc_vu:'' };
  const [createForm, setCreateForm] = useState({...EMPTY});
  const [editForm, setEditForm] = useState({});
  const [delForm, setDelForm] = useState({});

  useEffect(()=>{
    const init = async () => {
      setLoading(true);
      try {
        const [rNV, rCV] = await Promise.all([ adm('/api/admin/nhan-vien/data'), adm('/api/admin/chuc-vu/data') ]);
        setList(rNV.data.data||[]); setListCV(rCV.data.data||[]);
      } catch{} finally{setLoading(false);}
    };
    init();
  },[]);

  const fetchList = async () => { setLoading(true); try{const r=await adm('/api/admin/nhan-vien/data');setList(r.data.data||[]);}catch{}finally{setLoading(false);} };

  const doSearch = useCallback(debounce(async (kw) => {
    if(!kw.trim()){fetchList();return;}
    try{const r=await adm('/api/admin/nhan-vien/tim-kiem','post',{noi_dung_tim:kw});setList(r.data.data||[]);}catch{}
  },400),[]);

  const handleCreate = async () => { try{const r=await adm('/api/admin/nhan-vien/create','post',createForm);if(r.data.status){toast.success(r.data.message);setShowCreate(false);setCreateForm({...EMPTY});fetchList();}else toast.error(r.data.message);}catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));} };
  const handleEdit = async () => { try{const r=await adm('/api/admin/nhan-vien/update','post',editForm);if(r.data.status){toast.success(r.data.message);setShowEdit(false);fetchList();}else toast.error(r.data.message);}catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));} };
  const handleDel = async () => { try{const r=await adm('/api/admin/nhan-vien/delete','post',delForm);if(r.data.status){toast.success(r.data.message);setShowDel(false);fetchList();}else toast.error(r.data.message);}catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));} };
  const changeStatus = async (v) => { try{const r=await adm('/api/admin/nhan-vien/change-status','post',v);if(r.data.status){toast.success(r.data.message);fetchList();}else toast.error(r.data.message);}catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));} };



  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const currentItems = list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(list.length / itemsPerPage);

  return (
    <div className="p-6">
      <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="Thêm Nhân Viên" headerCls="bg-blue-600" wide
        footer={<><button onClick={()=>setShowCreate(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleCreate} className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700">Thêm mới</button></>}>
        <NVForm form={createForm} onChange={setCreateForm} listCV={listCV}/>
      </Modal>
      <Modal open={showEdit} onClose={()=>setShowEdit(false)} title="Cập Nhật Nhân Viên" headerCls="bg-blue-700" wide
        footer={<><button onClick={()=>setShowEdit(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleEdit} className="px-6 py-2 rounded-xl bg-blue-700 text-white font-bold text-sm hover:bg-blue-800">Lưu</button></>}>
        <NVForm form={editForm} onChange={setEditForm} isEdit={true} listCV={listCV}/>
      </Modal>
      <Modal open={showDel} onClose={()=>setShowDel(false)} title="Xóa Nhân Viên" headerCls="bg-red-500"
        footer={<><button onClick={()=>setShowDel(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleDel} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">Xóa</button></>}>
        <div className="text-center py-4"><i className="fa-solid fa-id-badge text-5xl text-red-200 mb-3 block"/>
          <p className="text-gray-600">Xóa nhân viên <b className="text-red-500">{delForm.ho_va_ten}</b>?</p></div>
      </Modal>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900"><i className="fa-solid fa-users-gear mr-3 text-blue-500"/>Quản Lý Nhân Viên</h1>
        <p className="text-gray-400 text-sm mt-1">{list.length} nhân viên hệ thống</p>
      </div>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="relative">
          <input value={search} onChange={e=>{setSearch(e.target.value);doSearch(e.target.value);}} placeholder="Tìm nhân viên..." className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-64 transition-all"/>
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"/>
        </div>
        <div className="flex gap-3">
          <ExcelButton disabled={list.length === 0} onClick={() => exportToExcel(
            list.map((r, i) => ({ ...r, __stt: i + 1 })),
            [
              { label: 'STT',        key: '__stt',         width: 6  },
              { label: 'Họ và tên',  key: 'ho_va_ten',     width: 25 },
              { label: 'Email',      key: 'email',         width: 30 },
              { label: 'Số ĐT',      key: 'so_dien_thoai', width: 16 },
              { label: 'Chức vụ',    key: 'ten_chuc_vu',   width: 20 },
              { label: 'Ngày sinh',  key: 'ngay_sinh',     width: 14 },
              { label: 'Địa chỉ',    key: 'dia_chi',       width: 30 },
              { label: 'Trạng thái', key: 'tinh_trang',    width: 14, format: v => v == 1 ? 'Hoạt động' : 'Tạm tắt' },
            ],
            'NhanVien', 'Nhân Viên'
          )} />
          <button onClick={()=>setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-sm transition-all active:scale-95">
            <i className="fa-solid fa-user-plus"/>Thêm nhân viên
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-24"><div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"/></div>
        ) : list.length === 0 ? (
          <div className="text-center py-24 text-gray-400"><i className="fa-solid fa-users-gear text-6xl text-gray-200 mb-4 block"/><p>Không có dữ liệu nhân viên</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-50 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-center">#</th>
                  <th className="px-4 py-3 text-left">Nhân viên</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-center">Số ĐT</th>
                  <th className="px-4 py-3 text-center">Chức vụ</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.map((v, i) => (
                  <tr key={v.id || i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-center text-gray-400 text-xs">{(currentPage-1)*itemsPerPage+i+1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200 uppercase">
                          {v.ho_va_ten?.charAt(0) || 'N'}
                        </div>
                        <span className="truncate max-w-[120px]">{v.ho_va_ten}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[140px]">{v.email}</td>
                    <td className="px-4 py-3 text-center text-gray-600 text-xs font-medium">{v.so_dien_thoai || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                        {v.ten_chuc_vu}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={()=>changeStatus(v)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors w-24 ${v.tinh_trang==1?'bg-green-100 text-green-700 hover:bg-green-200':'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}>
                        {v.tinh_trang==1?'Hoạt động':'Tạm tắt'}</button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={()=>{setEditForm({...v});setShowEdit(true);}} className="p-2 rounded-lg bg-blue-100 text-blue-700 text-xs hover:bg-blue-200 transition-colors"><i className="fa-solid fa-pen"/></button>
                        <button onClick={()=>{setDelForm(v);setShowDel(true);}} className="p-2 rounded-lg bg-red-100 text-red-600 text-xs hover:bg-red-200 transition-colors"><i className="fa-solid fa-trash"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  Hiển thị <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, list.length)}</span> trong <span className="font-bold text-gray-800">{list.length}</span> nhân viên
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
