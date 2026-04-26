import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { debounce } from '../../utils/helpers';
import { exportToExcel, ExcelButton } from '../../utils/exportExcel';

const adm = (url, method='get', data=null) => {
  const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` } };
  return method==='get' ? api.get(url,cfg) : api.post(url,data,cfg);
};
const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all';
const LABEL = 'block text-sm font-semibold text-gray-700 mb-1.5';
const EMPTY_CREATE = { ho_va_ten:'', so_dien_thoai:'', email:'', cccd:'', password:'', re_password:'', dia_chi:'', id_quan_huyen:'', is_active:'1', is_open:'1' };

function Modal({ open, onClose, title, headerCls='bg-yellow-500', children, footer, wide=false }) {
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

const ShipperFormFields = ({ form, onChange, inclPass=false, tinhList, qhList, idTinh, onTinhChange, onQHLoad }) => (
  <div className="grid sm:grid-cols-2 gap-3">
    <div><label className={LABEL}>Họ và tên</label><input value={form.ho_va_ten||''} onChange={e=>onChange({...form,ho_va_ten:e.target.value})} className={INPUT}/></div>
    <div><label className={LABEL}>Số điện thoại</label><input value={form.so_dien_thoai||''} onChange={e=>onChange({...form,so_dien_thoai:e.target.value})} className={INPUT}/></div>
    <div><label className={LABEL}>Email</label><input type="email" value={form.email||''} onChange={e=>onChange({...form,email:e.target.value})} className={INPUT}/></div>
    <div><label className={LABEL}>CCCD/CMND</label><input value={form.cccd||''} onChange={e=>onChange({...form,cccd:e.target.value})} className={INPUT}/></div>
    {inclPass && <>
      <div><label className={LABEL}>Mật khẩu</label><input type="password" value={form.password||''} onChange={e=>onChange({...form,password:e.target.value})} className={INPUT}/></div>
      <div><label className={LABEL}>Nhập lại mật khẩu</label><input type="password" value={form.re_password||''} onChange={e=>onChange({...form,re_password:e.target.value})} className={INPUT}/></div>
    </>}
    <div><label className={LABEL}>Tỉnh/Thành phố</label>
      <select className={INPUT} value={idTinh} onChange={e=>{onTinhChange(e.target.value);onQHLoad(e.target.value);}}>
        <option value="">-- Chọn tỉnh thành --</option>
        {tinhList.map(t=><option key={t.id} value={t.id}>{t.ten_tinh_thanh}</option>)}
      </select>
    </div>
    <div><label className={LABEL}>Quận/Huyện</label>
      <select className={INPUT} value={form.id_quan_huyen||''} onChange={e=>onChange({...form,id_quan_huyen:e.target.value})}>
        <option value="">-- Chọn quận huyện --</option>
        {qhList.map(q=><option key={q.id} value={q.id}>{q.ten_quan_huyen}</option>)}
      </select>
    </div>
    <div className="sm:col-span-2"><label className={LABEL}>Địa chỉ thường trú</label><input value={form.dia_chi||''} onChange={e=>onChange({...form,dia_chi:e.target.value})} placeholder="Số nhà, đường, phường/xã..." className={INPUT}/></div>
    <div><label className={LABEL}>Trạng thái</label><select className={INPUT} value={form.is_active??'1'} onChange={e=>onChange({...form,is_active:e.target.value})}><option value="1">Đã kích hoạt</option><option value="0">Chưa kích hoạt</option></select></div>
    <div><label className={LABEL}>Tình trạng</label><select className={INPUT} value={form.is_open??'1'} onChange={e=>onChange({...form,is_open:e.target.value})}><option value="1">Hoạt động</option><option value="0">Đã chặn</option></select></div>
  </div>
);

export default function AdminShipper() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [createForm, setCreateForm] = useState({...EMPTY_CREATE});
  const [editForm, setEditForm] = useState({});
  const [delForm, setDelForm] = useState({});
  const [tinhThanh, setTinhThanh] = useState([]);
  const [qhCreate, setQhCreate] = useState([]);
  const [qhEdit, setQhEdit] = useState([]);
  const [idTinhCreate, setIdTinhCreate] = useState('');
  const [idTinhEdit, setIdTinhEdit] = useState('');

  useEffect(() => { fetchList(); fetchTinhThanh(); }, []);

  const fetchList = async () => { setLoading(true); try { const r=await adm('/api/admin/shipper/data'); setList(r.data.data||[]); }catch{} finally{setLoading(false);} };
  const fetchTinhThanh = async () => { try { const r=await adm('/api/admin/tinh-thanh/data-open'); setTinhThanh(r.data.data||[]); }catch{} };
  const fetchQH = async (idTinh, setter) => {
    if(!idTinh){setter([]);return;}
    try { const r=await adm(`/api/admin/quan-huyen/data-open?id_tinh_thanh=${idTinh}`); setter(r.data.data||[]); }catch{}
  };

  const doSearch = useCallback(debounce(async (kw) => {
    if(!kw.trim()){fetchList();return;}
    try { const r=await adm('/api/admin/shipper/tim-kiem','post',{noi_dung_tim:kw}); setList(r.data.data||[]); }catch{}
  },400),[]);

  const handleCreate = async () => {
    try { const r=await adm('/api/admin/shipper/create','post',createForm); if(r.data.status){toast.success(r.data.message);setShowCreate(false);setCreateForm({...EMPTY_CREATE});fetchList();}else toast.error(r.data.message); }
    catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));}
  };
  const handleEdit = async () => {
    try { const r=await adm('/api/admin/shipper/update','post',editForm); if(r.data.status){toast.success(r.data.message);setShowEdit(false);fetchList();}else toast.error(r.data.message); }
    catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));}
  };
  const handleDel = async () => { try{const r=await adm('/api/admin/shipper/delete','post',delForm);if(r.data.status){toast.success(r.data.message);setShowDel(false);fetchList();}else toast.error(r.data.message);}catch{} };
  const changeStatus = async (s) => { try{const r=await adm('/api/admin/shipper/change-status','post',s);if(r.data.status){toast.success(r.data.message);fetchList();}}catch{} };
  const changeActive = async (s) => { try{const r=await adm('/api/admin/shipper/active','post',s);if(r.data.status){toast.success(r.data.message);fetchList();}}catch{} };

  const openEdit = (s) => {
    setEditForm({...s}); setShowEdit(true);
    if(s.ten_tinh_thanh){ const tinh=tinhThanh.find(t=>t.ten_tinh_thanh===s.ten_tinh_thanh); if(tinh){setIdTinhEdit(tinh.id);fetchQH(tinh.id,setQhEdit);} }
  };



  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const currentItems = list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(list.length / itemsPerPage);

  return (
    <div className="p-6">
      <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="Thêm Mới Shipper" headerCls="bg-yellow-500" wide
        footer={<><button onClick={()=>setShowCreate(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleCreate} className="px-6 py-2 rounded-xl bg-yellow-500 text-gray-900 font-bold text-sm hover:bg-yellow-600">Tạo mới</button></>}>
        <ShipperFormFields form={createForm} onChange={setCreateForm} inclPass tinhList={tinhThanh} qhList={qhCreate} idTinh={idTinhCreate} onTinhChange={setIdTinhCreate} onQHLoad={id=>fetchQH(id,setQhCreate)}/>
      </Modal>
      <Modal open={showEdit} onClose={()=>setShowEdit(false)} title="Cập Nhật Shipper" headerCls="bg-yellow-600" wide
        footer={<><button onClick={()=>setShowEdit(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleEdit} className="px-6 py-2 rounded-xl bg-yellow-600 text-white font-bold text-sm hover:bg-yellow-700">Lưu</button></>}>
        <ShipperFormFields form={editForm} onChange={setEditForm} tinhList={tinhThanh} qhList={qhEdit} idTinh={idTinhEdit} onTinhChange={setIdTinhEdit} onQHLoad={id=>fetchQH(id,setQhEdit)}/>
      </Modal>
      <Modal open={showDel} onClose={()=>setShowDel(false)} title="Xóa Shipper" headerCls="bg-red-500"
        footer={<><button onClick={()=>setShowDel(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleDel} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">Xóa</button></>}>
        <div className="text-center py-4"><i className="fa-solid fa-motorcycle text-5xl text-red-200 mb-3 block"/>
          <p className="text-gray-600">Xóa shipper: <b className="text-red-500">{delForm.ho_va_ten}</b>?</p>
          <p className="text-xs text-gray-400 mt-1">Không thể hoàn tác!</p></div>
      </Modal>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900"><i className="fa-solid fa-motorcycle mr-3 text-yellow-500"/>Quản Lý Shipper</h1>
          <p className="text-gray-400 text-sm mt-1">{list.length} shipper</p></div>
        <div className="flex gap-3">
          <div className="relative"><input value={search} onChange={e=>{setSearch(e.target.value);doSearch(e.target.value);}} placeholder="Tìm tên, email, CCCD..." className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 w-64 transition-all"/>
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"/></div>
          <ExcelButton color="green" disabled={list.length === 0} onClick={() => exportToExcel(
            list.map((r, i) => ({ ...r, __stt: i + 1 })),
            [
              { label: 'STT',         key: '__stt',          width: 6  },
              { label: 'Họ và tên',   key: 'ho_va_ten',      width: 25 },
              { label: 'Số ĐT',       key: 'so_dien_thoai',  width: 16 },
              { label: 'Email',       key: 'email',          width: 30 },
              { label: 'CCCD',        key: 'cccd',           width: 16 },
              { label: 'Địa chỉ',     key: 'dia_chi',        width: 30 },
              { label: 'Quận/Huyện',  key: 'ten_quan_huyen', width: 18 },
              { label: 'Tỉnh/TP',     key: 'ten_tinh_thanh', width: 18 },
              { label: 'Tình trạng',  key: 'is_open',        width: 14, format: v => v == 1 ? 'Hoạt động' : 'Đã chặn' },
              { label: 'Kích hoạt',   key: 'is_active',      width: 15, format: v => v == 1 ? 'Đã kích hoạt' : 'Chưa kích hoạt' },
            ],
            'Shipper', 'Shipper'
          )} />
          <button onClick={()=>setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500 text-gray-900 text-sm font-bold hover:bg-yellow-600 transition-colors"><i className="fa-solid fa-plus"/>Thêm mới</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24"><div className="w-10 h-10 border-4 border-yellow-100 border-t-yellow-500 rounded-full animate-spin"/></div>
        ) : list.length === 0 ? (
          <div className="text-center py-24"><i className="fa-solid fa-motorcycle text-6xl text-gray-200 mb-4 block"/><p className="text-gray-400">Không có shipper nào</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-yellow-50 text-gray-600 font-semibold text-xs uppercase">
                  <th className="px-4 py-3 text-center">#</th>
                  <th className="px-4 py-3 text-left">Shipper</th>
                  <th className="px-4 py-3 text-center">SĐT</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-center">CCCD</th>
                  <th className="px-4 py-3 text-left">Địa chỉ</th>
                  <th className="px-4 py-3 text-center">Tình trạng</th>
                  <th className="px-4 py-3 text-center">Phê duyệt</th>
                  <th className="px-4 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.map((s, i) => (
                  <tr key={s.id || i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-center text-gray-400 text-xs">{(currentPage-1)*itemsPerPage+i+1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img src={s.avatar||`https://ui-avatars.com/api/?name=${encodeURIComponent(s.ho_va_ten||'S')}&background=eab308&color=fff&size=80`} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" onError={e=>e.target.src='https://placehold.co/36'}/>
                        <span className="font-semibold text-gray-800">{s.ho_va_ten}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 text-xs">{s.so_dien_thoai||'—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.email}</td>
                    <td className="px-4 py-3 text-center text-gray-600 text-xs">{s.cccd||'—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-40">
                      {s.dia_chi ? <><div>{s.dia_chi}</div><div className="text-gray-400">{s.ten_quan_huyen} - {s.ten_tinh_thanh}</div></> : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={()=>changeStatus(s)} className={`px-3 py-1 rounded-lg text-xs font-bold w-full transition-colors ${s.is_open==1?'bg-green-100 text-green-700 hover:bg-green-200':'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                        {s.is_open==1?'Hoạt động':'Đã chặn'}</button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={()=>changeActive(s)} className={`px-3 py-1 rounded-lg text-xs font-bold w-full transition-colors ${s.is_active==1?'bg-blue-100 text-blue-700 hover:bg-blue-200':'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}>
                        {s.is_active==1?'Đã kích hoạt':'Chưa kích hoạt'}</button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={()=>openEdit(s)} className="px-2.5 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 text-xs hover:bg-yellow-200"><i className="fa-solid fa-pen"/></button>
                        <button onClick={()=>{setDelForm(s);setShowDel(true);}} className="px-2.5 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs hover:bg-red-200"><i className="fa-solid fa-trash"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  Hiển thị <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, list.length)}</span> trong <span className="font-bold text-gray-800">{list.length}</span> shipper
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
                          <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${currentPage === page ? 'bg-yellow-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
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
